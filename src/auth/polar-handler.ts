import { Hono } from "hono";
import type { Env } from "../types.js";
import { registerPolarUser } from "../polar-api.js";
import {
  renderApprovalDialog,
  getUpstreamAuthorizeUrl,
  fetchPolarToken,
  clientIdAlreadyApproved,
  setApprovalCookie,
} from "./oauth-utils.js";

const app = new Hono<{ Bindings: Env }>();

// Landing page
app.get("/", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.html(landingPageHtml(origin));
});

// GET /authorize - Parse OAuth request, show approval dialog or auto-redirect
app.get("/authorize", async (c) => {
  // Parse the OAuth authorization request (extracts clientId, redirectUri, state, PKCE, etc.)
  const authRequest = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

  // Store the full AuthRequest in KV so we can retrieve it after the Polar callback
  const stateKey = crypto.randomUUID();
  await c.env.OAUTH_KV.put(
    `auth_request:${stateKey}`,
    JSON.stringify(authRequest),
    { expirationTtl: 600 }
  );

  const oauthReqInfo = {
    clientId: authRequest.clientId,
    redirectUri: authRequest.redirectUri,
  };

  const alreadyApproved = clientIdAlreadyApproved(c.req.raw, authRequest.clientId);

  if (alreadyApproved) {
    return redirectToPolar(c, stateKey);
  }

  return renderApprovalDialog(oauthReqInfo, stateKey);
});

// POST /authorize - Process approval form, redirect to Polar
app.post("/authorize", async (c) => {
  const formData = await c.req.formData();
  const stateKey = formData.get("state_key") as string;

  // Retrieve auth request to get client_id for the cookie
  const authRequestStr = await c.env.OAUTH_KV.get(`auth_request:${stateKey}`);
  if (!authRequestStr) {
    return c.text("Session expired, please try again", 400);
  }
  const authRequest = JSON.parse(authRequestStr);

  const response = await redirectToPolar(c, stateKey);
  return setApprovalCookie(response, authRequest.clientId);
});

// GET /callback - Exchange Polar code for token, complete OAuth authorization
app.get("/callback", async (c) => {
  const code = c.req.query("code");
  const polarState = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.text(`OAuth Error: ${error}`, 400);
  }

  if (!code || !polarState) {
    return c.text("Missing code or state", 400);
  }

  // Retrieve stored state (contains our stateKey for the AuthRequest)
  const stateDataStr = await c.env.OAUTH_KV.get(`state:${polarState}`);
  if (!stateDataStr) {
    return c.text("Invalid or expired state", 400);
  }
  await c.env.OAUTH_KV.delete(`state:${polarState}`);

  const stateData = JSON.parse(stateDataStr) as { stateKey: string };

  // Retrieve the original AuthRequest
  const authRequestStr = await c.env.OAUTH_KV.get(`auth_request:${stateData.stateKey}`);
  if (!authRequestStr) {
    return c.text("Auth session expired, please try again", 400);
  }
  await c.env.OAUTH_KV.delete(`auth_request:${stateData.stateKey}`);

  const authRequest = JSON.parse(authRequestStr);

  // Exchange code for Polar access token
  const callbackUrl = `${new URL(c.req.url).origin}/callback`;
  const tokenData = await fetchPolarToken(code, callbackUrl, c.env);

  // Register user with Polar AccessLink (ignore if already registered)
  await registerPolarUser(tokenData.access_token, tokenData.x_user_id);

  // Complete the OAuth authorization directly — no redirect workaround needed
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: authRequest,
    userId: String(tokenData.x_user_id),
    metadata: {
      label: `Polar User ${tokenData.x_user_id}`,
    },
    scope: authRequest.scope || [],
    props: {
      accessToken: tokenData.access_token,
      userId: tokenData.x_user_id,
    },
  });

  return Response.redirect(redirectTo, 302);
});

// Helper: Store stateKey and redirect to Polar OAuth
async function redirectToPolar(c: any, stateKey: string) {
  const url = new URL(c.req.url);

  const callbackState = crypto.randomUUID();
  await c.env.OAUTH_KV.put(
    `state:${callbackState}`,
    JSON.stringify({ stateKey }),
    { expirationTtl: 600 }
  );

  const callbackUrl = `${url.origin}/callback`;
  const upstreamUrl = getUpstreamAuthorizeUrl(c.env, callbackUrl, callbackState);
  return c.redirect(upstreamUrl);
}

function landingPageHtml(origin: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Polar MCP Server</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; background: #fafafa; }
    h1 { color: #d93636; margin-bottom: 8px; }
    .subtitle { color: #666; margin-top: 0; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 32px 0; }
    .feature { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .feature h3 { margin: 0 0 8px 0; color: #333; font-size: 16px; }
    .feature p { margin: 0; color: #666; font-size: 14px; }
    .steps { background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .steps h2 { margin-top: 0; }
    .steps ol { padding-left: 24px; }
    .steps li { margin: 12px 0; }
    code { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 14px; }
    .devices { color: #666; font-size: 14px; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Polar MCP Server</h1>
  <p class="subtitle">Connect your Polar fitness data to Claude AI</p>

  <div class="features">
    <div class="feature">
      <h3>Exercises</h3>
      <p>Training data with heart rate, speed, and zone analysis</p>
    </div>
    <div class="feature">
      <h3>Sleep</h3>
      <p>Sleep stages, sleep score, and quality metrics</p>
    </div>
    <div class="feature">
      <h3>Nightly Recharge</h3>
      <p>HRV, ANS charge, and recovery status</p>
    </div>
    <div class="feature">
      <h3>Daily Activity</h3>
      <p>Steps, calories, and activity goals</p>
    </div>
  </div>

  <div class="steps">
    <h2>How it works</h2>
    <ol>
      <li>In Claude, go to <strong>Settings → Integrations → Add MCP Server</strong></li>
      <li>Enter the URL: <code>${origin}/mcp</code></li>
      <li>Claude will open an authorization window — log in with your Polar account</li>
      <li>Start chatting about your fitness data!</li>
    </ol>
  </div>

  <p class="devices"><strong>Supported devices:</strong> Polar Pacer Pro, Vantage V2/V3, Grit X Pro, Ignite 3, and more.</p>
</body>
</html>`;
}

export const PolarHandler = app;

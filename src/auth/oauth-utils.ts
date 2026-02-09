import type { Env } from "../types.js";
import { POLAR_AUTH_URL } from "../polar-api.js";

const COOKIE_NAME = "mcp-polar-approved";

export function renderApprovalDialog(
  oauthReqInfo: { clientId: string; redirectUri: string },
  stateKey: string
): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Authorize - Polar MCP Server</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; background: #fafafa; }
    .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #d93636; margin: 0 0 8px 0; font-size: 24px; }
    .subtitle { color: #666; margin: 0 0 24px 0; }
    .info { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; }
    .info dt { font-weight: 600; color: #333; }
    .info dd { margin: 0 0 8px 0; color: #666; }
    .btn { display: inline-block; background: #d93636; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; transition: background 0.2s; }
    .btn:hover { background: #b82e2e; }
    .actions { margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Polar MCP Server</h1>
    <p class="subtitle">An application wants to access your Polar fitness data</p>

    <dl class="info">
      <dt>Application</dt>
      <dd>${escapeHtml(oauthReqInfo.clientId)}</dd>
      <dt>Redirect URI</dt>
      <dd>${escapeHtml(oauthReqInfo.redirectUri)}</dd>
    </dl>

    <p>This will allow the application to read your Polar fitness data including exercises, sleep, heart rate, and recovery metrics.</p>

    <form method="POST" action="/authorize">
      <input type="hidden" name="state_key" value="${escapeHtml(stateKey)}" />
      <div class="actions">
        <button type="submit" name="action" value="approve" class="btn">Authorize with Polar</button>
      </div>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export function getUpstreamAuthorizeUrl(env: Env, callbackUrl: string, state: string): string {
  const url = new URL(POLAR_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.POLAR_CLIENT_ID);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function fetchPolarToken(
  code: string,
  redirectUri: string,
  env: Env
): Promise<{ access_token: string; x_user_id: number }> {
  const credentials = btoa(`${env.POLAR_CLIENT_ID}:${env.POLAR_CLIENT_SECRET}`);

  const response = await fetch("https://polarremote.com/v2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Polar token exchange failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<{ access_token: string; x_user_id: number }>;
}

export function clientIdAlreadyApproved(request: Request, clientId: string): boolean {
  const cookie = request.headers.get("Cookie") || "";
  return cookie.includes(`${COOKIE_NAME}=${clientId}`);
}

export function setApprovalCookie(response: Response, clientId: string): Response {
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${clientId}; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000; Path=/`
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

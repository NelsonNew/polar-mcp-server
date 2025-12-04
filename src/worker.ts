/**
 * Polar MCP Server - Cloudflare Worker (Remote)
 *
 * This is a remote MCP server that can be connected directly from Claude.ai
 * It handles OAuth authentication with Polar AccessLink API.
 */

/// <reference types="@cloudflare/workers-types" />

import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  polarApiRequest,
  POLAR_AUTH_URL,
  POLAR_TOKEN_URL,
} from "./polar-api.js";

export interface Env {
  POLAR_CLIENT_ID: string;
  POLAR_CLIENT_SECRET: string;
  OAUTH_KV: KVNamespace;
}

// Create a function to build the MCP server with the access token
function createPolarServer(accessToken: string): McpServer {
  const server = new McpServer({
    name: "Polar AccessLink",
    version: "1.0.0",
  });

  // Tool: Get User Info
  server.tool(
    "get_user_info",
    "Get information about the registered Polar user including name, weight, height, birthdate, and other profile data",
    {},
    async () => {
      try {
        const result = await polarApiRequest("/users/me", accessToken);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get Exercises
  server.tool(
    "get_exercises",
    "Get exercise data from Polar. Returns exercises from the last 30 days. Can include detailed samples and training zones.",
    {
      samples: z.boolean().optional().describe("Include detailed sample data (heart rate, speed, etc.)"),
      zones: z.boolean().optional().describe("Include heart rate zone information"),
    },
    async ({ samples, zones }) => {
      try {
        const params = new URLSearchParams();
        if (samples) params.append("samples", "true");
        if (zones) params.append("zones", "true");
        const queryString = params.toString();
        const endpoint = `/exercises${queryString ? `?${queryString}` : ""}`;
        const result = await polarApiRequest(endpoint, accessToken);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get Single Exercise
  server.tool(
    "get_exercise",
    "Get detailed data for a specific exercise by ID.",
    {
      exerciseId: z.string().describe("The exercise ID to retrieve"),
      samples: z.boolean().optional().describe("Include detailed sample data"),
      zones: z.boolean().optional().describe("Include heart rate zone information"),
    },
    async ({ exerciseId, samples, zones }) => {
      try {
        const params = new URLSearchParams();
        if (samples) params.append("samples", "true");
        if (zones) params.append("zones", "true");
        const queryString = params.toString();
        const endpoint = `/exercises/${exerciseId}${queryString ? `?${queryString}` : ""}`;
        const result = await polarApiRequest(endpoint, accessToken);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get Nightly Recharge
  server.tool(
    "get_nightly_recharge",
    "Get Nightly Recharge data: ANS charge, HRV, breathing rate, recovery status. Data from the last 28 days.",
    {
      date: z.string().optional().describe("Date in YYYY-MM-DD format"),
    },
    async ({ date }) => {
      try {
        let endpoint = "/users/nightly-recharge";
        if (date) endpoint = `/users/nightly-recharge/${date}`;
        const result = await polarApiRequest(endpoint, accessToken);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get Sleep
  server.tool(
    "get_sleep",
    "Get sleep tracking data: sleep stages, sleep score, duration, interruptions.",
    {
      date: z.string().optional().describe("Date in YYYY-MM-DD format"),
    },
    async ({ date }) => {
      try {
        let endpoint = "/users/sleep";
        if (date) endpoint = `/users/sleep/${date}`;
        const result = await polarApiRequest(endpoint, accessToken);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get Daily Activity
  server.tool(
    "get_daily_activity",
    "Get daily activity: steps, calories, active time, activity goals.",
    {
      date: z.string().optional().describe("Date in YYYY-MM-DD format"),
    },
    async ({ date }) => {
      try {
        let endpoint = "/users/activity";
        if (date) endpoint = `/users/activity/${date}`;
        const result = await polarApiRequest(endpoint, accessToken);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Tool: Get Physical Info
  server.tool(
    "get_physical_info",
    "Get physical info: weight, height, max heart rate, resting HR, VO2max.",
    {},
    async () => {
      try {
        const result = await polarApiRequest("/users/physical-information", accessToken);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

// HTML Templates
const landingPageHtml = (origin: string) => `<!DOCTYPE html>
<html>
<head>
  <title>Polar MCP Server</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; background: #fafafa; }
    h1 { color: #d93636; margin-bottom: 8px; }
    .subtitle { color: #666; margin-top: 0; }
    .btn { display: inline-block; background: #d93636; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background 0.2s; }
    .btn:hover { background: #b82e2e; }
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

  <p style="margin: 24px 0;"><a href="/authorize" class="btn">Connect with Polar</a></p>

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
      <li>Click <strong>"Connect with Polar"</strong> and authorize with your Polar account</li>
      <li>Copy the MCP Server URL you receive</li>
      <li>In Claude, go to <strong>Settings → Integrations → Add MCP Server</strong></li>
      <li>Paste the URL and start chatting about your fitness data!</li>
    </ol>
  </div>

  <p class="devices"><strong>Supported devices:</strong> Polar Pacer Pro, Vantage V2/V3, Grit X Pro, Ignite 3, and more.</p>
</body>
</html>`;

const successPageHtml = (origin: string, sessionId: string) => `<!DOCTYPE html>
<html>
<head>
  <title>Connected to Polar!</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; background: #fafafa; }
    h1 { color: #22c55e; }
    .url-box { background: white; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .url-box h3 { margin: 0 0 12px 0; color: #333; }
    .url { background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 14px; word-break: break-all; user-select: all; }
    .copy-btn { display: inline-block; background: #22c55e; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 12px; }
    .copy-btn:hover { background: #16a34a; }
    .steps { background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .steps ol { padding-left: 24px; }
    .steps li { margin: 12px 0; }
    .note { background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Connected!</h1>
  <p>Your Polar account is now connected. Add this MCP server to Claude:</p>

  <div class="url-box">
    <h3>Your MCP Server URL:</h3>
    <div class="url" id="mcpUrl">${origin}/mcp?session=${sessionId}</div>
    <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('mcpUrl').textContent)">Copy URL</button>
  </div>

  <div class="steps">
    <h3>Next steps in Claude:</h3>
    <ol>
      <li>Go to <strong>Settings → Integrations</strong></li>
      <li>Click <strong>"Add Integration"</strong> or <strong>"Add MCP Server"</strong></li>
      <li>Paste the URL above</li>
      <li>Ask Claude about your fitness data!</li>
    </ol>
  </div>

  <div class="note">
    <strong>Note:</strong> This session expires in 24 hours. To reconnect, visit <a href="${origin}/authorize">${origin}/authorize</a>
  </div>
</body>
</html>`;

// Main Worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Landing page
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(landingPageHtml(url.origin), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // OAuth: Start authorization
    if (url.pathname === "/authorize") {
      const redirectUri = `${url.origin}/callback`;
      const state = crypto.randomUUID();

      // Store state for CSRF protection
      await env.OAUTH_KV.put(`state:${state}`, "valid", { expirationTtl: 600 });

      const authUrl = new URL(POLAR_AUTH_URL);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", env.POLAR_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", state);

      return Response.redirect(authUrl.toString(), 302);
    }

    // OAuth: Handle callback
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(`OAuth Error: ${error}`, { status: 400 });
      }

      if (!code || !state) {
        return new Response("Missing code or state", { status: 400 });
      }

      // Verify state
      const storedState = await env.OAUTH_KV.get(`state:${state}`);
      if (!storedState) {
        return new Response("Invalid state - possible CSRF attack", { status: 400 });
      }
      await env.OAUTH_KV.delete(`state:${state}`);

      // Exchange code for token
      const redirectUri = `${url.origin}/callback`;
      const credentials = btoa(`${env.POLAR_CLIENT_ID}:${env.POLAR_CLIENT_SECRET}`);

      const tokenResponse = await fetch(POLAR_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        return new Response(`Token exchange failed: ${errorText}`, { status: 400 });
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
        x_user_id: number;
      };

      // Register user with Polar (ignore if already registered)
      await fetch("https://www.polaraccesslink.com/v3/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          "member-id": `mcp_${tokenData.x_user_id}`,
        }),
      });

      // Create session
      const sessionId = crypto.randomUUID();
      await env.OAUTH_KV.put(
        `session:${sessionId}`,
        JSON.stringify({
          accessToken: tokenData.access_token,
          userId: tokenData.x_user_id,
        }),
        { expirationTtl: 86400 } // 24 hours
      );

      return new Response(successPageHtml(url.origin, sessionId), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // MCP endpoint
    if (url.pathname === "/mcp" || url.pathname === "/sse") {
      const sessionId = url.searchParams.get("session");

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Missing session. Please authorize first.", authorize_url: `${url.origin}/authorize` }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const sessionData = await env.OAUTH_KV.get(`session:${sessionId}`);
      if (!sessionData) {
        return new Response(
          JSON.stringify({ error: "Session expired. Please authorize again.", authorize_url: `${url.origin}/authorize` }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const { accessToken } = JSON.parse(sessionData);

      // Create MCP server with the user's access token
      const server = createPolarServer(accessToken);

      // Use Cloudflare's MCP handler
      const handler = createMcpHandler(server);

      return handler(request, env, ctx);
    }

    return new Response("Not Found", { status: 404 });
  },
};

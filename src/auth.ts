#!/usr/bin/env node

/**
 * Polar AccessLink OAuth2 Authentication Helper
 *
 * This script helps you obtain an access token for the Polar AccessLink API.
 * It starts a local server to handle the OAuth callback.
 *
 * Usage:
 *   1. Set POLAR_CLIENT_ID and POLAR_CLIENT_SECRET environment variables
 *   2. Run: npx tsx src/auth.ts
 *   3. Open the URL in your browser
 *   4. Authorize the application
 *   5. Copy the access token from the output
 */

import * as http from "http";
import * as url from "url";

const POLAR_AUTH_URL = "https://flow.polar.com/oauth2/authorization";
const POLAR_TOKEN_URL = "https://polarremote.com/v2/oauth2/token";
const POLAR_REGISTER_URL = "https://www.polaraccesslink.com/v3/users";
const REDIRECT_URI = "http://localhost:8888/callback";

const clientIdEnv = process.env.POLAR_CLIENT_ID;
const clientSecretEnv = process.env.POLAR_CLIENT_SECRET;

if (!clientIdEnv || !clientSecretEnv) {
  console.error("Error: Please set POLAR_CLIENT_ID and POLAR_CLIENT_SECRET environment variables");
  console.error("");
  console.error("You can get these from https://admin.polaraccesslink.com/");
  console.error("");
  console.error("Example:");
  console.error("  export POLAR_CLIENT_ID=your_client_id");
  console.error("  export POLAR_CLIENT_SECRET=your_client_secret");
  console.error("  npx tsx src/auth.ts");
  process.exit(1);
}

const clientId: string = clientIdEnv;
const clientSecret: string = clientSecretEnv;

async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  x_user_id: number;
}> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(POLAR_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function registerUser(accessToken: string, userId: number): Promise<void> {
  const response = await fetch(POLAR_REGISTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      "member-id": `user_${userId}`,
    }),
  });

  if (response.status === 409) {
    console.log("User already registered with this client.");
    return;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`User registration note: ${response.status} ${errorText}`);
    return;
  }

  console.log("User successfully registered with AccessLink.");
}

function startServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url || "", true);

      if (parsedUrl.pathname === "/callback") {
        const code = parsedUrl.query.code as string;
        const error = parsedUrl.query.error as string;

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<html><body><h1>Error</h1><p>${error}</p></body></html>`);
          server.close();
          reject(new Error(error));
          return;
        }

        if (code) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<html><body><h1>Success!</h1><p>You can close this window and return to the terminal.</p></body></html>"
          );
          server.close();
          resolve(code);
          return;
        }
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    server.listen(8888, () => {
      console.log("Local server started on http://localhost:8888");
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     Polar AccessLink OAuth2 Authentication Helper         ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");

  const authUrl = new URL(POLAR_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);

  console.log("Step 1: Open this URL in your browser to authorize:");
  console.log("");
  console.log(`  ${authUrl.toString()}`);
  console.log("");
  console.log("Waiting for authorization...");
  console.log("");

  try {
    const code = await startServer();
    console.log("Authorization code received!");
    console.log("");
    console.log("Step 2: Exchanging code for access token...");

    const tokenData = await exchangeCodeForToken(code);
    console.log("");
    console.log("Step 3: Registering user with AccessLink...");
    await registerUser(tokenData.access_token, tokenData.x_user_id);

    console.log("");
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                    SUCCESS!                                ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log("");
    console.log("Your access token:");
    console.log("");
    console.log(`  ${tokenData.access_token}`);
    console.log("");
    console.log("Your user ID:");
    console.log("");
    console.log(`  ${tokenData.x_user_id}`);
    console.log("");
    console.log("Add this to your Claude Desktop config or environment:");
    console.log("");
    console.log(`  export POLAR_ACCESS_TOKEN="${tokenData.access_token}"`);
    console.log(`  export POLAR_USER_ID="${tokenData.x_user_id}"`);
    console.log("");
    console.log("Or add to your Claude Desktop config.json:");
    console.log("");
    console.log(`  "env": {`);
    console.log(`    "POLAR_ACCESS_TOKEN": "${tokenData.access_token}",`);
    console.log(`    "POLAR_USER_ID": "${tokenData.x_user_id}"`);
    console.log(`  }`);
    console.log("");
  } catch (error) {
    console.error("Authentication failed:", error);
    process.exit(1);
  }
}

main();

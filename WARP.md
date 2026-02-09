# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common commands

All commands are intended to be run from the repository root.

### Setup

- Install dependencies:
  - `npm install`
- Required runtime:
  - Node.js `>=18` (ESM, `type: "module"`)

### Local MCP server (stdio, for Claude Desktop or CLI)

- Build TypeScript to JavaScript (local MCP only):
  - `npm run build`
- Start the local MCP server (after building):
  - `npm start`
  - Entry point: `dist/index.js`, MCP server name `polar-accesslink`, requires `POLAR_ACCESS_TOKEN` env var.
- During development, run the TypeScript entry directly:
  - `npm run dev`
  - Uses `tsx src/index.ts`.

### OAuth helper for local access tokens

- Run the local OAuth helper to obtain a `POLAR_ACCESS_TOKEN`:
  - `npm run auth`
  - Expects `POLAR_CLIENT_ID` and `POLAR_CLIENT_SECRET` in the environment; starts a local HTTP server on port `8888` and guides you through browser-based authorization.

### Cloudflare Worker MCP server (remote, for claude.ai)

The remote deployment is managed via Cloudflare Workers and Wrangler. Configuration lives in `wrangler.toml` (`main = "src/worker.ts"`).

- Start a local dev server for the Worker:
  - `npm run dev:worker`
  - Uses `wrangler dev`, serving `src/worker.ts` and using the `env.dev` configuration in `wrangler.toml`.
- Deploy the Worker to Cloudflare:
  - `npm run deploy`
- Configure Cloudflare KV (only needs to be done once per environment, not part of normal dev loop):
  - Create a KV namespace and update `wrangler.toml` with the resulting IDs (see comments in that file).
- Configure Worker secrets (one-time per environment):
  - `npx wrangler secret put POLAR_CLIENT_ID`
  - `npx wrangler secret put POLAR_CLIENT_SECRET`

### Tests and linting

- There is currently **no configured test or lint command** in `package.json` (no test runner dependencies or lint scripts). Do not assume `npm test`, `vitest`, or ESLint are available unless they are added explicitly.

## Project architecture

### Overview

This repository implements a Model Context Protocol (MCP) server for the Polar AccessLink API with two deployment modes:

1. **Local stdio MCP server** for Claude Desktop or any MCP-compatible client that launches a local binary.
2. **Remote Cloudflare Worker-based MCP server** that can be connected from claude.ai via an HTTP/SSE MCP endpoint.

Both modes share common Polar API helpers and tool definitions.

### Entry points and deployment targets

- **Local MCP server (Node.js / stdio)**
  - Entry file: `src/index.ts`
  - Built output: `dist/index.js` (via `npm run build` and `tsconfig.json`).
  - Protocol: MCP over stdio using `@modelcontextprotocol/sdk` (`McpServer` + `StdioServerTransport`).
  - Authentication: reads `POLAR_ACCESS_TOKEN` from the environment and uses it for all Polar API calls.

- **Remote MCP server (Cloudflare Worker)**
  - Entry file: `src/worker.ts`
  - Configured in `wrangler.toml` as `main = "src/worker.ts"` with `nodejs_compat` enabled.
  - Uses Cloudflare KV (`OAUTH_KV`) to store OAuth state and short-lived user sessions (mapping session IDs to access tokens and user IDs).
  - Exposes several HTTP endpoints:
    - `/` – landing page prompting the user to "Connect with Polar".
    - `/authorize` – starts OAuth2 authorization by redirecting to Polar's auth endpoint, storing a CSRF `state` in KV.
    - `/callback` – handles the OAuth2 redirect, verifies `state`, exchanges `code` for an access token, registers the user with AccessLink, persists a session in KV, and returns an HTML page with the MCP server URL.
    - `/mcp` (and `/sse`) – MCP HTTP/SSE endpoint. Looks up the session in KV, constructs an MCP server bound to that user's `accessToken`, and passes handling to `agents/mcp`'s `createMcpHandler`.

### Core modules

- `src/index.ts` – Local stdio MCP server
  - Creates a `McpServer` instance named `"polar-accesslink"` with tools that map directly to Polar AccessLink endpoints (user info, exercises, single exercise, nightly recharge, sleep, daily activity, physical info).
  - Uses an internal `polarApiRequest` helper (local to this file) that reads `POLAR_ACCESS_TOKEN` from `process.env` and performs authenticated fetches against `https://www.polaraccesslink.com/v3`.
  - Each tool serializes Polar responses as pretty-printed JSON text in the MCP tool result.

- `src/worker.ts` – Cloudflare Worker MCP server
  - Defines an `Env` interface to type Worker bindings (secrets + KV namespace).
  - Implements `createPolarServer(accessToken)` which returns a `McpServer` wired up with the same conceptual tools as the local server, but parameterized by a provided access token rather than reading from process env.
  - Uses the shared `polarApiRequest` from `src/polar-api.ts` so HTTP logic is centralized.
  - Uses the `agents` package's `createMcpHandler` adapter to present the MCP server over HTTP/SSE within the Worker environment.
  - Contains embedded HTML templates (`landingPageHtml`, `successPageHtml`) for the landing and post-auth pages, including guidance on how to plug the MCP URL into Claude's UI.

- `src/polar-api.ts` – Shared Polar API helpers and tool metadata
  - Centralizes constants for Polar endpoints (`POLAR_API_BASE`, `POLAR_AUTH_URL`, `POLAR_TOKEN_URL`).
  - Exposes a generic `polarApiRequest(endpoint, accessToken, options)` used by the Worker-based server.
  - Implements `exchangeCodeForToken` and `registerPolarUser` utilities that mirror the OAuth/token and user registration flows.
  - Provides a `POLAR_TOOLS` object containing tool metadata (names, descriptions, JSON input schemas) that can be reused by different MCP surfaces.
  - Defines `executePolarTool(toolName, args, accessToken)`, which routes a logical MCP tool invocation to the corresponding Polar HTTP call and wraps the result in the standard MCP text content structure. This is the main abstraction point if you want to add or modify tools in a single place.

- `src/auth.ts` – Local OAuth helper CLI
  - Node-based CLI script to obtain a Polar access token for local development (stdout-friendly, no MCP wiring).
  - Starts a simple `http` server on `http://localhost:8888/callback`, instructs the user to open the Polar authorization URL, and exchanges the returned `code` for an access token.
  - Attempts to register the user with AccessLink, then prints the access token along with ready-to-copy `export POLAR_ACCESS_TOKEN=...` and Claude Desktop config snippets.

### TypeScript configuration

- `tsconfig.json`
  - Targets `ES2022`, `module: "NodeNext"`, `moduleResolution: "NodeNext"` for the Node/stdio entry.
  - Compiles `src/**/*` to `dist/`, with `rootDir` set to `src`.
  - Excludes `src/worker.ts` (the Worker entry is handled separately) and common output directories (`node_modules`, `dist`).

- `tsconfig.worker.json`
  - Worker-specific config using `module: "ESNext"` and `moduleResolution: "bundler"`, with `types: ["@cloudflare/workers-types"]` and `lib: ["ES2022"]`.
  - Includes only the Worker-related files: `src/worker.ts` and `src/polar-api.ts`.

### How to extend the MCP tools safely

When adding or modifying tools:

- Prefer to update `POLAR_TOOLS` and `executePolarTool` in `src/polar-api.ts` first, so tool metadata and behavior stay in sync across deployment modes.
- For the local server (`src/index.ts`) and Worker server (`src/worker.ts`), mirror any new tool definitions so that both environments offer a consistent surface area.
- Ensure any new Polar endpoints respect the existing error-handling pattern: check `response.ok`, include the HTTP status and body text in thrown errors, and return pretty-printed JSON in MCP responses.

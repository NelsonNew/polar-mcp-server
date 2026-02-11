import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export interface Props {
  accessToken: string;
  userId: number;
}

export interface Env {
  POLAR_CLIENT_ID: string;
  POLAR_CLIENT_SECRET: string;
  OAUTH_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
}

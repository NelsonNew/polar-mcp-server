/**
 * Polar MCP Server - Cloudflare Worker (Remote)
 *
 * Uses @cloudflare/workers-oauth-provider + McpAgent for native OAuth.
 * Users just add the /mcp URL to Claude and auth is handled automatically.
 */

/// <reference types="@cloudflare/workers-types" />

import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { polarApiRequest } from "./polar-api.js";
import { PolarHandler } from "./auth/polar-handler.js";
import type { Env, Props } from "./types.js";

export { Env, Props };

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Polar AccessLink",
    version: "1.0.0",
  });

  async init() {
    const accessToken = this.props.accessToken;

    // Tool: Get User Info
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
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
    this.server.tool(
      "get_daily_activity",
      "Get daily activity: steps, calories, active time, activity goals.",
      {
        date: z.string().optional().describe("Date in YYYY-MM-DD format"),
      },
      async ({ date }) => {
        try {
          let endpoint = "/users/activities";
          if (date) endpoint = `/users/activities/${date}`;
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
    this.server.tool(
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

    // Tool: Get Continuous Heart Rate
    this.server.tool(
      "get_continuous_heart_rate",
      "Get continuous heart rate data (5-min intervals) for a specific date.",
      {
        date: z.string().describe("Date (YYYY-MM-DD format). Required."),
      },
      async ({ date }) => {
        try {
          const result = await polarApiRequest(`/users/continuous-heart-rate/${date}`, accessToken);
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

    // Tool: Get Continuous Heart Rate Range
    this.server.tool(
      "get_continuous_heart_rate_range",
      "Get continuous heart rate data for a date range.",
      {
        from: z.string().describe("Start date (YYYY-MM-DD). Required."),
        to: z.string().describe("End date (YYYY-MM-DD). Required."),
      },
      async ({ from, to }) => {
        try {
          const params = new URLSearchParams({ from, to });
          const result = await polarApiRequest(`/users/continuous-heart-rate?${params.toString()}`, accessToken);
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

    // Tool: Get Cardio Load
    this.server.tool(
      "get_cardio_load",
      "Get cardio load (TRIMP) data: acute load, chronic load, load status.",
      {
        date: z.string().optional().describe("Date (YYYY-MM-DD). Optional."),
      },
      async ({ date }) => {
        try {
          const endpoint = date ? `/users/cardio-load/${date}` : "/users/cardio-load";
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

    // Tool: Get Cardio Load Range
    this.server.tool(
      "get_cardio_load_range",
      "Get cardio load data for a date range.",
      {
        from: z.string().describe("Start date (YYYY-MM-DD). Required."),
        to: z.string().describe("End date (YYYY-MM-DD). Required."),
      },
      async ({ from, to }) => {
        try {
          const params = new URLSearchParams({ from, to });
          const result = await polarApiRequest(`/users/cardio-load/date?${params.toString()}`, accessToken);
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

    // Tool: Get Cardio Load History
    this.server.tool(
      "get_cardio_load_history",
      "Get historical cardio load aggregated by days or months.",
      {
        period_type: z.enum(["days", "months"]).describe("'days' or 'months'. Required."),
        count: z.number().describe("Number of periods. Required."),
      },
      async ({ period_type, count }) => {
        try {
          const result = await polarApiRequest(`/users/cardio-load/period/${period_type}/${count}`, accessToken);
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

    // Tool: Get Activity Samples
    this.server.tool(
      "get_activity_samples",
      "Get detailed activity samples: step counts and activity zones throughout the day.",
      {
        date: z.string().optional().describe("Date (YYYY-MM-DD). Optional."),
      },
      async ({ date }) => {
        try {
          const endpoint = date ? `/users/activities/samples/${date}` : "/users/activities/samples";
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

    // Tool: Get Activity Samples Range
    this.server.tool(
      "get_activity_samples_range",
      "Get activity samples for a date range (max 28 days).",
      {
        from: z.string().describe("Start date (YYYY-MM-DD). Required."),
        to: z.string().describe("End date (YYYY-MM-DD). Required."),
      },
      async ({ from, to }) => {
        try {
          const params = new URLSearchParams({ from, to });
          const result = await polarApiRequest(`/users/activities/samples?${params.toString()}`, accessToken);
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

    // Tool: Get SleepWise Alertness
    this.server.tool(
      "get_sleepwise_alertness",
      "Get SleepWise alertness predictions based on sleep patterns.",
      {
        from: z.string().optional().describe("Start date (YYYY-MM-DD). Optional."),
        to: z.string().optional().describe("End date (YYYY-MM-DD). Optional."),
      },
      async ({ from, to }) => {
        try {
          let endpoint = "/users/sleepwise/alertness";
          if (from || to) {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            endpoint = `/users/sleepwise/alertness/date?${params.toString()}`;
          }
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

    // Tool: Get SleepWise Circadian Bedtime
    this.server.tool(
      "get_sleepwise_circadian_bedtime",
      "Get optimal bedtime recommendations based on circadian rhythm.",
      {
        from: z.string().optional().describe("Start date (YYYY-MM-DD). Optional."),
        to: z.string().optional().describe("End date (YYYY-MM-DD). Optional."),
      },
      async ({ from, to }) => {
        try {
          let endpoint = "/users/sleepwise/circadian-bedtime";
          if (from || to) {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            endpoint = `/users/sleepwise/circadian-bedtime/date?${params.toString()}`;
          }
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

    // Tool: Get Body Temperature
    this.server.tool(
      "get_body_temperature",
      "Get body temperature data from Elixir biosensing.",
      {
        from: z.string().optional().describe("Start date (YYYY-MM-DD). Optional."),
        to: z.string().optional().describe("End date (YYYY-MM-DD). Optional."),
      },
      async ({ from, to }) => {
        try {
          let endpoint = "/users/biosensing/bodytemperature";
          if (from || to) {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            endpoint = `${endpoint}?${params.toString()}`;
          }
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

    // Tool: Get Skin Temperature
    this.server.tool(
      "get_skin_temperature",
      "Get sleep skin temperature data from Elixir biosensing.",
      {
        from: z.string().optional().describe("Start date (YYYY-MM-DD). Optional."),
        to: z.string().optional().describe("End date (YYYY-MM-DD). Optional."),
      },
      async ({ from, to }) => {
        try {
          let endpoint = "/users/biosensing/skintemperature";
          if (from || to) {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            endpoint = `${endpoint}?${params.toString()}`;
          }
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

    // Tool: Get SpO2
    this.server.tool(
      "get_spo2",
      "Get SpO2 (blood oxygen) test results from Elixir biosensing.",
      {
        from: z.string().optional().describe("Start date (YYYY-MM-DD). Optional."),
        to: z.string().optional().describe("End date (YYYY-MM-DD). Optional."),
      },
      async ({ from, to }) => {
        try {
          let endpoint = "/users/biosensing/spo2";
          if (from || to) {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);
            endpoint = `${endpoint}?${params.toString()}`;
          }
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

    // Tool: Get Exercise FIT
    this.server.tool(
      "get_exercise_fit",
      "Download exercise in FIT format.",
      {
        exerciseId: z.string().describe("Exercise ID. Required."),
      },
      async ({ exerciseId }) => {
        try {
          const result = await polarApiRequest(`/exercises/${exerciseId}/fit`, accessToken);
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

    // Tool: Get Exercise TCX
    this.server.tool(
      "get_exercise_tcx",
      "Download exercise in TCX format.",
      {
        exerciseId: z.string().describe("Exercise ID. Required."),
      },
      async ({ exerciseId }) => {
        try {
          const result = await polarApiRequest(`/exercises/${exerciseId}/tcx`, accessToken);
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

    // Tool: Get Exercise GPX
    this.server.tool(
      "get_exercise_gpx",
      "Download exercise GPS route in GPX format.",
      {
        exerciseId: z.string().describe("Exercise ID. Required."),
      },
      async ({ exerciseId }) => {
        try {
          const result = await polarApiRequest(`/exercises/${exerciseId}/gpx`, accessToken);
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

    // Tool: Get Daily Activity Range
    this.server.tool(
      "get_daily_activity_range",
      "Get daily activity data for a date range.",
      {
        from: z.string().describe("Start date (YYYY-MM-DD). Required."),
        to: z.string().describe("End date (YYYY-MM-DD). Required."),
      },
      async ({ from, to }) => {
        try {
          const params = new URLSearchParams({ from, to });
          const result = await polarApiRequest(`/users/activities?${params.toString()}`, accessToken);
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

    // Tool: Get Sleep Range
    this.server.tool(
      "get_sleep_range",
      "Get sleep data for a date range.",
      {
        from: z.string().describe("Start date (YYYY-MM-DD). Required."),
        to: z.string().describe("End date (YYYY-MM-DD). Required."),
      },
      async ({ from, to }) => {
        try {
          const params = new URLSearchParams({ from, to });
          const result = await polarApiRequest(`/users/sleep?${params.toString()}`, accessToken);
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

    // Tool: Get Nightly Recharge Range
    this.server.tool(
      "get_nightly_recharge_range",
      "Get Nightly Recharge data for a date range.",
      {
        from: z.string().describe("Start date (YYYY-MM-DD). Required."),
        to: z.string().describe("End date (YYYY-MM-DD). Required."),
      },
      async ({ from, to }) => {
        try {
          const params = new URLSearchParams({ from, to });
          const result = await polarApiRequest(`/users/nightly-recharge?${params.toString()}`, accessToken);
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
  }
}

export default new OAuthProvider({
  apiHandlers: {
    "/sse": MyMCP.serveSSE("/sse") as any,
    "/mcp": MyMCP.serve("/mcp") as any,
  },
  defaultHandler: PolarHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});

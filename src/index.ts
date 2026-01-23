#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const POLAR_API_BASE = "https://www.polaraccesslink.com/v3";

// Get credentials from environment
const getAccessToken = (): string => {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "POLAR_ACCESS_TOKEN environment variable is required. " +
        "Please set it with your Polar AccessLink access token."
    );
  }
  return token;
};

// Helper function to make authenticated API calls
async function polarApiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<unknown> {
  const accessToken = getAccessToken();

  const response = await fetch(`${POLAR_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Polar API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

// Create MCP server
const server = new McpServer({
  name: "polar-accesslink",
  version: "1.0.0",
});

// Tool: Get User Info
server.tool(
  "get_user_info",
  "Get information about the registered Polar user including name, weight, height, birthdate, and other profile data",
  {},
  async () => {
    try {
      const userInfo = await polarApiRequest("/users/me");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(userInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching user info: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get Exercises
server.tool(
  "get_exercises",
  "Get exercise data from Polar. Returns exercises from the last 30 days. Can include detailed samples (heart rate, speed, distance, etc.) and training zones for deeper analysis.",
  {
    samples: z
      .boolean()
      .optional()
      .describe(
        "Include detailed sample data (heart rate, speed, cadence, altitude, distance, temperature). Useful for detailed training analysis."
      ),
    zones: z
      .boolean()
      .optional()
      .describe(
        "Include heart rate zone information showing time spent in each training zone."
      ),
  },
  async ({ samples, zones }) => {
    try {
      const params = new URLSearchParams();
      if (samples) params.append("samples", "true");
      if (zones) params.append("zones", "true");

      const queryString = params.toString();
      const endpoint = `/exercises${queryString ? `?${queryString}` : ""}`;

      const exercises = await polarApiRequest(endpoint);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(exercises, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching exercises: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get Single Exercise
server.tool(
  "get_exercise",
  "Get detailed data for a specific exercise by ID. Can include samples and zones for detailed analysis.",
  {
    exerciseId: z.string().describe("The exercise ID to retrieve"),
    samples: z
      .boolean()
      .optional()
      .describe("Include detailed sample data (heart rate, speed, etc.)"),
    zones: z
      .boolean()
      .optional()
      .describe("Include heart rate zone information"),
  },
  async ({ exerciseId, samples, zones }) => {
    try {
      const params = new URLSearchParams();
      if (samples) params.append("samples", "true");
      if (zones) params.append("zones", "true");

      const queryString = params.toString();
      const endpoint = `/exercises/${exerciseId}${queryString ? `?${queryString}` : ""}`;

      const exercise = await polarApiRequest(endpoint);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(exercise, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching exercise: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get Nightly Recharge
server.tool(
  "get_nightly_recharge",
  "Get Nightly Recharge data which measures overnight recovery. Includes ANS charge (Autonomic Nervous System recovery status), HRV data (heart rate variability during sleep), breathing rate, and overall recovery assessment. Data from the last 28 days is available.",
  {
    date: z
      .string()
      .optional()
      .describe(
        "Specific date to get nightly recharge data for (YYYY-MM-DD format). If not provided, returns available data."
      ),
  },
  async ({ date }) => {
    try {
      let endpoint = "/users/nightly-recharge";
      if (date) {
        endpoint = `/users/nightly-recharge/${date}`;
      }

      const nightlyRecharge = await polarApiRequest(endpoint);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(nightlyRecharge, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching nightly recharge data: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get Sleep Data
server.tool(
  "get_sleep",
  "Get sleep tracking data including sleep stages (deep, light, REM), sleep score, sleep duration, interruptions, and sleep quality metrics. Provides comprehensive sleep analysis.",
  {
    date: z
      .string()
      .optional()
      .describe(
        "Specific date to get sleep data for (YYYY-MM-DD format). If not provided, returns available sleep data."
      ),
  },
  async ({ date }) => {
    try {
      let endpoint = "/users/sleep";
      if (date) {
        endpoint = `/users/sleep/${date}`;
      }

      const sleepData = await polarApiRequest(endpoint);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(sleepData, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching sleep data: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get Daily Activity
server.tool(
  "get_daily_activity",
  "Get daily activity summary including steps, calories burned, active time, activity goal progress, and activity classification throughout the day.",
  {
    date: z
      .string()
      .optional()
      .describe(
        "Specific date to get activity data for (YYYY-MM-DD format). If not provided, returns available activity data."
      ),
  },
  async ({ date }) => {
    try {
      let endpoint = "/users/activities";
      if (date) {
        endpoint = `/users/activities/${date}`;
      }

      const activityData = await polarApiRequest(endpoint);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(activityData, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching daily activity: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get Physical Info
server.tool(
  "get_physical_info",
  "Get physical information and body metrics including weight, height, maximum heart rate, resting heart rate, VO2max, and other physical characteristics.",
  {},
  async () => {
    try {
      const physicalInfo = await polarApiRequest("/users/physical-information");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(physicalInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching physical info: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get Continuous Heart Rate
server.tool(
  "get_continuous_heart_rate",
  "Get continuous heart rate data recorded throughout the day. Returns 5-minute interval heart rate samples. Requires heart rate tracking to be enabled on the Polar device.",
  {
    date: z.string().describe("Date to get heart rate data for (YYYY-MM-DD format). Required."),
  },
  async ({ date }) => {
    try {
      const result = await polarApiRequest(`/users/continuous-heart-rate/${date}`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching continuous heart rate: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Continuous Heart Rate Range
server.tool(
  "get_continuous_heart_rate_range",
  "Get continuous heart rate data for a date range. Returns 5-minute interval heart rate samples for each day in the range.",
  {
    from: z.string().describe("Start date (YYYY-MM-DD format). Required."),
    to: z.string().describe("End date (YYYY-MM-DD format). Required."),
  },
  async ({ from, to }) => {
    try {
      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      const result = await polarApiRequest(`/users/continuous-heart-rate?${params.toString()}`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching continuous heart rate range: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Cardio Load
server.tool(
  "get_cardio_load",
  "Get cardio load (training impulse/TRIMP) data measuring cardiovascular strain from training. Shows acute load, chronic load, and load status.",
  {
    date: z.string().optional().describe("Specific date to get cardio load for (YYYY-MM-DD format). If not provided, returns recent cardio load data."),
  },
  async ({ date }) => {
    try {
      let endpoint = "/users/cardio-load";
      if (date) {
        endpoint = `/users/cardio-load/${date}`;
      }
      const result = await polarApiRequest(endpoint);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching cardio load: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Cardio Load Range
server.tool(
  "get_cardio_load_range",
  "Get cardio load data for a date range. Returns training load metrics for each day in the specified period.",
  {
    from: z.string().describe("Start date (YYYY-MM-DD format). Required."),
    to: z.string().describe("End date (YYYY-MM-DD format). Required."),
  },
  async ({ from, to }) => {
    try {
      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      const result = await polarApiRequest(`/users/cardio-load/date?${params.toString()}`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching cardio load range: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Cardio Load History
server.tool(
  "get_cardio_load_history",
  "Get historical cardio load data aggregated by days or months. Useful for long-term training load analysis.",
  {
    period_type: z.enum(["days", "months"]).describe("Period type for aggregation: 'days' or 'months'. Required."),
    count: z.number().describe("Number of periods to retrieve (e.g., 30 days or 6 months). Required."),
  },
  async ({ period_type, count }) => {
    try {
      const result = await polarApiRequest(`/users/cardio-load/period/${period_type}/${count}`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching cardio load history: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Activity Samples
server.tool(
  "get_activity_samples",
  "Get detailed activity samples including step counts and activity zone data throughout the day. Returns intraday activity breakdown.",
  {
    date: z.string().optional().describe("Specific date to get activity samples for (YYYY-MM-DD format). If not provided, lists available dates with samples."),
  },
  async ({ date }) => {
    try {
      let endpoint = "/users/activities/samples";
      if (date) {
        endpoint = `/users/activities/samples/${date}`;
      }
      const result = await polarApiRequest(endpoint);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching activity samples: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Activity Samples Range
server.tool(
  "get_activity_samples_range",
  "Get activity samples for a date range. Maximum range is 28 days, and from date cannot be older than 365 days.",
  {
    from: z.string().describe("Start date (YYYY-MM-DD format). Required."),
    to: z.string().describe("End date (YYYY-MM-DD format). Required."),
  },
  async ({ from, to }) => {
    try {
      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      const result = await polarApiRequest(`/users/activities/samples?${params.toString()}`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching activity samples range: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get SleepWise Alertness
server.tool(
  "get_sleepwise_alertness",
  "Get SleepWise alertness data showing predicted alertness levels throughout the day based on sleep patterns. Helps understand when you'll be most alert or tired.",
  {
    from: z.string().optional().describe("Start date (YYYY-MM-DD format). If not provided, returns data from the last 28 days."),
    to: z.string().optional().describe("End date (YYYY-MM-DD format). Optional."),
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
      const result = await polarApiRequest(endpoint);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching SleepWise alertness: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get SleepWise Circadian Bedtime
server.tool(
  "get_sleepwise_circadian_bedtime",
  "Get SleepWise circadian bedtime recommendations based on your sleep patterns and circadian rhythm. Suggests optimal bedtime for better sleep quality.",
  {
    from: z.string().optional().describe("Start date (YYYY-MM-DD format). If not provided, returns data from the last 28 days."),
    to: z.string().optional().describe("End date (YYYY-MM-DD format). Optional."),
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
      const result = await polarApiRequest(endpoint);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching SleepWise circadian bedtime: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Body Temperature
server.tool(
  "get_body_temperature",
  "Get body temperature data from Elixir biosensing. Available on compatible Polar devices with temperature sensing capabilities.",
  {
    from: z.string().optional().describe("Start date (YYYY-MM-DD format). Optional."),
    to: z.string().optional().describe("End date (YYYY-MM-DD format). Optional."),
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
      const result = await polarApiRequest(endpoint);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching body temperature: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Skin Temperature
server.tool(
  "get_skin_temperature",
  "Get sleep skin temperature data from Elixir biosensing. Measures skin temperature during sleep for recovery insights.",
  {
    from: z.string().optional().describe("Start date (YYYY-MM-DD format). Optional."),
    to: z.string().optional().describe("End date (YYYY-MM-DD format). Optional."),
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
      const result = await polarApiRequest(endpoint);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching skin temperature: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get SpO2
server.tool(
  "get_spo2",
  "Get SpO2 (blood oxygen saturation) test results from Elixir biosensing. Available on devices with SpO2 measurement capability.",
  {
    from: z.string().optional().describe("Start date (YYYY-MM-DD format). Optional."),
    to: z.string().optional().describe("End date (YYYY-MM-DD format). Optional."),
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
      const result = await polarApiRequest(endpoint);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching SpO2 data: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Exercise FIT
server.tool(
  "get_exercise_fit",
  "Download exercise data in FIT format. FIT (Flexible and Interoperable Data Transfer) is a standard format used by fitness devices and apps.",
  {
    exerciseId: z.string().describe("The exercise ID to download. Required."),
  },
  async ({ exerciseId }) => {
    try {
      const result = await polarApiRequest(`/exercises/${exerciseId}/fit`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching exercise FIT: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Exercise TCX
server.tool(
  "get_exercise_tcx",
  "Download exercise data in TCX format. TCX (Training Center XML) is compatible with many fitness platforms like Garmin Connect and Strava.",
  {
    exerciseId: z.string().describe("The exercise ID to download. Required."),
  },
  async ({ exerciseId }) => {
    try {
      const result = await polarApiRequest(`/exercises/${exerciseId}/tcx`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching exercise TCX: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Exercise GPX
server.tool(
  "get_exercise_gpx",
  "Download exercise GPS route in GPX format. GPX (GPS Exchange Format) contains the route/track data and can be used with mapping applications.",
  {
    exerciseId: z.string().describe("The exercise ID to download. Required."),
  },
  async ({ exerciseId }) => {
    try {
      const result = await polarApiRequest(`/exercises/${exerciseId}/gpx`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching exercise GPX: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Daily Activity Range
server.tool(
  "get_daily_activity_range",
  "Get daily activity data for a date range. Returns activity summaries including steps, calories, active time, and goal progress for each day in the range.",
  {
    from: z.string().describe("Start date (YYYY-MM-DD format). Required."),
    to: z.string().describe("End date (YYYY-MM-DD format). Required."),
  },
  async ({ from, to }) => {
    try {
      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      const result = await polarApiRequest(`/users/activities?${params.toString()}`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching daily activity range: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Sleep Range
server.tool(
  "get_sleep_range",
  "Get sleep data for a date range. Returns sleep tracking data including sleep stages, sleep scores, duration, and quality metrics for each night in the range.",
  {
    from: z.string().describe("Start date (YYYY-MM-DD format). Required."),
    to: z.string().describe("End date (YYYY-MM-DD format). Required."),
  },
  async ({ from, to }) => {
    try {
      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      const result = await polarApiRequest(`/users/sleep?${params.toString()}`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching sleep range: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Nightly Recharge Range
server.tool(
  "get_nightly_recharge_range",
  "Get Nightly Recharge data for a date range. Returns ANS charge, HRV, breathing rate, and recovery assessment for each night in the range.",
  {
    from: z.string().describe("Start date (YYYY-MM-DD format). Required."),
    to: z.string().describe("End date (YYYY-MM-DD format). Required."),
  },
  async ({ from, to }) => {
    try {
      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);
      const result = await polarApiRequest(`/users/nightly-recharge?${params.toString()}`);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error fetching nightly recharge range: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Polar AccessLink MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

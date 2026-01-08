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

const getUserId = (): string => {
  const userId = process.env.POLAR_USER_ID;
  if (!userId) {
    throw new Error(
      "POLAR_USER_ID environment variable is required. " +
        "Please set it with your Polar user ID (x_user_id from auth flow)."
    );
  }
  return userId;
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
      const userId = getUserId();
      const userInfo = await polarApiRequest(`/users/${userId}`);
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
  "Get physical information and body metrics including weight, height, maximum heart rate, resting heart rate, VO2max, and other physical characteristics. Uses transaction-based retrieval.",
  {},
  async () => {
    try {
      const userId = getUserId();

      // Step 1: Create transaction
      const transaction = await polarApiRequest(
        `/users/${userId}/physical-information-transactions`,
        { method: "POST" }
      ) as { "transaction-id": number; "resource-uri": string };

      const transactionId = transaction["transaction-id"];

      // Step 2: List physical info items in transaction
      const transactionData = await polarApiRequest(
        `/users/${userId}/physical-information-transactions/${transactionId}`
      ) as { "physical-informations": string[] };

      const physicalInfoUrls = transactionData["physical-informations"];

      if (!physicalInfoUrls || physicalInfoUrls.length === 0) {
        // Step 3b: Commit empty transaction
        await polarApiRequest(
          `/users/${userId}/physical-information-transactions/${transactionId}`,
          { method: "PUT" }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: "No new physical information data available.",
            },
          ],
        };
      }

      // Step 3: Fetch all physical info items
      const physicalInfoItems = [];
      for (const url of physicalInfoUrls) {
        const urlPath = url.replace("https://www.polaraccesslink.com", "");
        const item = await polarApiRequest(urlPath);
        physicalInfoItems.push(item);
      }

      // Step 4: Commit transaction
      await polarApiRequest(
        `/users/${userId}/physical-information-transactions/${transactionId}`,
        { method: "PUT" }
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(physicalInfoItems, null, 2),
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

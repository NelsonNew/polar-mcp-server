/**
 * Polar AccessLink API Helper Functions
 * Shared between local and remote MCP server
 */

export const POLAR_API_BASE = "https://www.polaraccesslink.com/v3";
export const POLAR_AUTH_URL = "https://flow.polar.com/oauth2/authorization";
export const POLAR_TOKEN_URL = "https://polarremote.com/v2/oauth2/token";

export interface PolarTokenResponse {
  access_token: string;
  token_type: string;
  x_user_id: number;
}

/**
 * Make an authenticated request to the Polar API
 */
export async function polarApiRequest(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<unknown> {
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

  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<PolarTokenResponse> {
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
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Register user with Polar AccessLink
 */
export async function registerPolarUser(
  accessToken: string,
  userId: number
): Promise<boolean> {
  const response = await fetch(`${POLAR_API_BASE}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      "member-id": `mcp_user_${userId}`,
    }),
  });

  // 409 = already registered, which is fine
  return response.ok || response.status === 409;
}

/**
 * Tool definitions for Polar MCP Server
 */
export const POLAR_TOOLS = {
  get_user_info: {
    name: "get_user_info",
    description:
      "Get information about the registered Polar user including name, weight, height, birthdate, and other profile data",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  get_exercises: {
    name: "get_exercises",
    description:
      "Get exercise data from Polar. Returns exercises from the last 30 days. Can include detailed samples (heart rate, speed, distance, etc.) and training zones for deeper analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {
        samples: {
          type: "boolean",
          description:
            "Include detailed sample data (heart rate, speed, cadence, altitude, distance, temperature). Useful for detailed training analysis.",
        },
        zones: {
          type: "boolean",
          description:
            "Include heart rate zone information showing time spent in each training zone.",
        },
      },
      required: [],
    },
  },
  get_exercise: {
    name: "get_exercise",
    description:
      "Get detailed data for a specific exercise by ID. Can include samples and zones for detailed analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {
        exerciseId: {
          type: "string",
          description: "The exercise ID to retrieve",
        },
        samples: {
          type: "boolean",
          description: "Include detailed sample data (heart rate, speed, etc.)",
        },
        zones: {
          type: "boolean",
          description: "Include heart rate zone information",
        },
      },
      required: ["exerciseId"],
    },
  },
  get_nightly_recharge: {
    name: "get_nightly_recharge",
    description:
      "Get Nightly Recharge data which measures overnight recovery. Includes ANS charge (Autonomic Nervous System recovery status), HRV data (heart rate variability during sleep), breathing rate, and overall recovery assessment. Data from the last 28 days is available.",
    inputSchema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description:
            "Specific date to get nightly recharge data for (YYYY-MM-DD format). If not provided, returns available data.",
        },
      },
      required: [],
    },
  },
  get_sleep: {
    name: "get_sleep",
    description:
      "Get sleep tracking data including sleep stages (deep, light, REM), sleep score, sleep duration, interruptions, and sleep quality metrics. Provides comprehensive sleep analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description:
            "Specific date to get sleep data for (YYYY-MM-DD format). If not provided, returns available sleep data.",
        },
      },
      required: [],
    },
  },
  get_daily_activity: {
    name: "get_daily_activity",
    description:
      "Get daily activity summary including steps, calories burned, active time, activity goal progress, and activity classification throughout the day.",
    inputSchema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description:
            "Specific date to get activity data for (YYYY-MM-DD format). If not provided, returns available activity data.",
        },
      },
      required: [],
    },
  },
  get_physical_info: {
    name: "get_physical_info",
    description:
      "Get physical information and body metrics including weight, height, maximum heart rate, resting heart rate, VO2max, and other physical characteristics.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
};

/**
 * Execute a Polar tool
 */
export async function executePolarTool(
  toolName: string,
  args: Record<string, unknown>,
  accessToken: string
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    let result: unknown;

    switch (toolName) {
      case "get_user_info":
        result = await polarApiRequest("/users/me", accessToken);
        break;

      case "get_exercises": {
        const params = new URLSearchParams();
        if (args.samples) params.append("samples", "true");
        if (args.zones) params.append("zones", "true");
        const queryString = params.toString();
        const endpoint = `/exercises${queryString ? `?${queryString}` : ""}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_exercise": {
        const params = new URLSearchParams();
        if (args.samples) params.append("samples", "true");
        if (args.zones) params.append("zones", "true");
        const queryString = params.toString();
        const endpoint = `/exercises/${args.exerciseId}${queryString ? `?${queryString}` : ""}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_nightly_recharge": {
        let endpoint = "/users/nightly-recharge";
        if (args.date) {
          endpoint = `/users/nightly-recharge/${args.date}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_sleep": {
        let endpoint = "/users/sleep";
        if (args.date) {
          endpoint = `/users/sleep/${args.date}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_daily_activity": {
        let endpoint = "/users/activity";
        if (args.date) {
          endpoint = `/users/activity/${args.date}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_physical_info":
        result = await polarApiRequest("/users/physical-information", accessToken);
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

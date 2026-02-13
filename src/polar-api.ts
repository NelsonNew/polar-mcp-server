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
  get_continuous_heart_rate: {
    name: "get_continuous_heart_rate",
    description:
      "Get continuous heart rate data recorded throughout the day. Returns 5-minute interval heart rate samples. Requires heart rate tracking to be enabled on the Polar device.",
    inputSchema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description:
            "Date to get heart rate data for (YYYY-MM-DD format). Required.",
        },
      },
      required: ["date"],
    },
  },
  get_continuous_heart_rate_range: {
    name: "get_continuous_heart_rate_range",
    description:
      "Get continuous heart rate data for a date range. Returns 5-minute interval heart rate samples for each day in the range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Start date (YYYY-MM-DD format). Required.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Required.",
        },
      },
      required: ["from", "to"],
    },
  },
  get_cardio_load: {
    name: "get_cardio_load",
    description:
      "Get cardio load (training impulse/TRIMP) data measuring cardiovascular strain from training. Shows acute load, chronic load, and load status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description:
            "Specific date to get cardio load for (YYYY-MM-DD format). If not provided, returns recent cardio load data.",
        },
      },
      required: [],
    },
  },
  get_cardio_load_range: {
    name: "get_cardio_load_range",
    description:
      "Get cardio load data for a date range. Returns training load metrics for each day in the specified period.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Start date (YYYY-MM-DD format). Required.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Required.",
        },
      },
      required: ["from", "to"],
    },
  },
  get_cardio_load_history: {
    name: "get_cardio_load_history",
    description:
      "Get historical cardio load data aggregated by days or months. Useful for long-term training load analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {
        period_type: {
          type: "string",
          enum: ["days", "months"],
          description: "Period type for aggregation: 'days' or 'months'. Required.",
        },
        count: {
          type: "number",
          description: "Number of periods to retrieve (e.g., 30 days or 6 months). Required.",
        },
      },
      required: ["period_type", "count"],
    },
  },
  get_activity_samples: {
    name: "get_activity_samples",
    description:
      "Get detailed activity samples including step counts and activity zone data throughout the day. Returns intraday activity breakdown.",
    inputSchema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description:
            "Specific date to get activity samples for (YYYY-MM-DD format). If not provided, lists available dates with samples.",
        },
      },
      required: [],
    },
  },
  get_activity_samples_range: {
    name: "get_activity_samples_range",
    description:
      "Get activity samples for a date range. Maximum range is 28 days, and from date cannot be older than 365 days.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Start date (YYYY-MM-DD format). Required.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Required.",
        },
      },
      required: ["from", "to"],
    },
  },
  get_sleepwise_alertness: {
    name: "get_sleepwise_alertness",
    description:
      "Get SleepWise alertness data showing predicted alertness levels throughout the day based on sleep patterns. Helps understand when you'll be most alert or tired.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description:
            "Start date (YYYY-MM-DD format). If not provided, returns data from the last 28 days.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Optional.",
        },
      },
      required: [],
    },
  },
  get_sleepwise_circadian_bedtime: {
    name: "get_sleepwise_circadian_bedtime",
    description:
      "Get SleepWise circadian bedtime recommendations based on your sleep patterns and circadian rhythm. Suggests optimal bedtime for better sleep quality.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description:
            "Start date (YYYY-MM-DD format). If not provided, returns data from the last 28 days.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Optional.",
        },
      },
      required: [],
    },
  },
  get_body_temperature: {
    name: "get_body_temperature",
    description:
      "Get body temperature data from Elixir biosensing. Available on compatible Polar devices with temperature sensing capabilities.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Start date (YYYY-MM-DD format). Optional.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Optional.",
        },
      },
      required: [],
    },
  },
  get_skin_temperature: {
    name: "get_skin_temperature",
    description:
      "Get sleep skin temperature data from Elixir biosensing. Measures skin temperature during sleep for recovery insights.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Start date (YYYY-MM-DD format). Optional.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Optional.",
        },
      },
      required: [],
    },
  },
  get_spo2: {
    name: "get_spo2",
    description:
      "Get SpO2 (blood oxygen saturation) test results from Elixir biosensing. Available on devices with SpO2 measurement capability.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Start date (YYYY-MM-DD format). Optional.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Optional.",
        },
      },
      required: [],
    },
  },
  get_exercise_fit: {
    name: "get_exercise_fit",
    description:
      "Download exercise data in FIT format. FIT (Flexible and Interoperable Data Transfer) is a standard format used by fitness devices and apps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        exerciseId: {
          type: "string",
          description: "The exercise ID to download. Required.",
        },
      },
      required: ["exerciseId"],
    },
  },
  get_exercise_tcx: {
    name: "get_exercise_tcx",
    description:
      "Download exercise data in TCX format. TCX (Training Center XML) is compatible with many fitness platforms like Garmin Connect and Strava.",
    inputSchema: {
      type: "object" as const,
      properties: {
        exerciseId: {
          type: "string",
          description: "The exercise ID to download. Required.",
        },
      },
      required: ["exerciseId"],
    },
  },
  get_exercise_gpx: {
    name: "get_exercise_gpx",
    description:
      "Download exercise GPS route in GPX format. GPX (GPS Exchange Format) contains the route/track data and can be used with mapping applications.",
    inputSchema: {
      type: "object" as const,
      properties: {
        exerciseId: {
          type: "string",
          description: "The exercise ID to download. Required.",
        },
      },
      required: ["exerciseId"],
    },
  },
  get_daily_activity_range: {
    name: "get_daily_activity_range",
    description:
      "Get daily activity data for a date range. Returns activity summaries including steps, calories, active time, and goal progress for each day in the range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Start date (YYYY-MM-DD format). Required.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Required.",
        },
      },
      required: ["from", "to"],
    },
  },
  get_sleep_range: {
    name: "get_sleep_range",
    description:
      "Get sleep data for a date range. Returns sleep tracking data including sleep stages, sleep scores, duration, and quality metrics for each night in the range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Start date (YYYY-MM-DD format). Required.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Required.",
        },
      },
      required: ["from", "to"],
    },
  },
  get_nightly_recharge_range: {
    name: "get_nightly_recharge_range",
    description:
      "Get Nightly Recharge data for a date range. Returns ANS charge, HRV, breathing rate, and recovery assessment for each night in the range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Start date (YYYY-MM-DD format). Required.",
        },
        to: {
          type: "string",
          description: "End date (YYYY-MM-DD format). Required.",
        },
      },
      required: ["from", "to"],
    },
  },
};

/**
 * Execute a Polar tool
 */
export async function executePolarTool(
  toolName: string,
  args: Record<string, unknown>,
  accessToken: string,
  userId?: string | number
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    let result: unknown;

    switch (toolName) {
      case "get_user_info":
        if (!userId) throw new Error("User ID is required for get_user_info. Set POLAR_USER_ID environment variable.");
        result = await polarApiRequest(`/users/${userId}`, accessToken);
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
        let endpoint = "/users/activities";
        if (args.date) {
          endpoint = `/users/activities/${args.date}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_physical_info": {
        if (!userId) throw new Error("User ID is required for get_physical_info. Set POLAR_USER_ID environment variable.");
        // Physical info requires the transaction model:
        // 1. Create transaction
        const txResponse = await polarApiRequest(
          `/users/${userId}/physical-information-transactions`,
          accessToken,
          { method: "POST" }
        ) as { "transaction-id": number; "resource-uri": string } | null;

        if (!txResponse) {
          result = { message: "No new physical information available." };
          break;
        }

        const txId = txResponse["transaction-id"];

        // 2. List resources in transaction
        const resourceList = await polarApiRequest(
          `/users/${userId}/physical-information-transactions/${txId}`,
          accessToken
        ) as { "physical-informations": string[] } | null;

        if (!resourceList || !resourceList["physical-informations"]?.length) {
          // Commit empty transaction
          await polarApiRequest(
            `/users/${userId}/physical-information-transactions/${txId}`,
            accessToken,
            { method: "PUT" }
          ).catch(() => {});
          result = { message: "No physical information resources found." };
          break;
        }

        // 3. Fetch each resource
        const physicalInfos: unknown[] = [];
        for (const resourceUrl of resourceList["physical-informations"]) {
          // Resource URLs are absolute, extract the path
          const resourcePath = new URL(resourceUrl).pathname.replace("/v3", "");
          const info = await polarApiRequest(resourcePath, accessToken);
          physicalInfos.push(info);
        }

        // 4. Commit transaction
        await polarApiRequest(
          `/users/${userId}/physical-information-transactions/${txId}`,
          accessToken,
          { method: "PUT" }
        ).catch(() => {});

        result = physicalInfos.length === 1 ? physicalInfos[0] : physicalInfos;
        break;
      }

      case "get_continuous_heart_rate": {
        const endpoint = `/users/continuous-heart-rate/${args.date}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_continuous_heart_rate_range": {
        const params = new URLSearchParams();
        params.append("from", args.from as string);
        params.append("to", args.to as string);
        const endpoint = `/users/continuous-heart-rate?${params.toString()}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_cardio_load": {
        let endpoint = "/users/cardio-load";
        if (args.date) {
          endpoint = `/users/cardio-load/${args.date}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_cardio_load_range": {
        const params = new URLSearchParams();
        params.append("from", args.from as string);
        params.append("to", args.to as string);
        const endpoint = `/users/cardio-load/date?${params.toString()}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_cardio_load_history": {
        const endpoint = `/users/cardio-load/period/${args.period_type}/${args.count}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_activity_samples": {
        let endpoint = "/users/activities/samples";
        if (args.date) {
          endpoint = `/users/activities/samples/${args.date}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_activity_samples_range": {
        const params = new URLSearchParams();
        params.append("from", args.from as string);
        params.append("to", args.to as string);
        const endpoint = `/users/activities/samples?${params.toString()}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_sleepwise_alertness": {
        let endpoint = "/users/sleepwise/alertness";
        if (args.from || args.to) {
          const params = new URLSearchParams();
          if (args.from) params.append("from", args.from as string);
          if (args.to) params.append("to", args.to as string);
          endpoint = `/users/sleepwise/alertness/date?${params.toString()}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_sleepwise_circadian_bedtime": {
        let endpoint = "/users/sleepwise/circadian-bedtime";
        if (args.from || args.to) {
          const params = new URLSearchParams();
          if (args.from) params.append("from", args.from as string);
          if (args.to) params.append("to", args.to as string);
          endpoint = `/users/sleepwise/circadian-bedtime/date?${params.toString()}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_body_temperature": {
        let endpoint = "/users/biosensing/bodytemperature";
        if (args.from || args.to) {
          const params = new URLSearchParams();
          if (args.from) params.append("from", args.from as string);
          if (args.to) params.append("to", args.to as string);
          endpoint = `${endpoint}?${params.toString()}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_skin_temperature": {
        let endpoint = "/users/biosensing/skintemperature";
        if (args.from || args.to) {
          const params = new URLSearchParams();
          if (args.from) params.append("from", args.from as string);
          if (args.to) params.append("to", args.to as string);
          endpoint = `${endpoint}?${params.toString()}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_spo2": {
        let endpoint = "/users/biosensing/spo2";
        if (args.from || args.to) {
          const params = new URLSearchParams();
          if (args.from) params.append("from", args.from as string);
          if (args.to) params.append("to", args.to as string);
          endpoint = `${endpoint}?${params.toString()}`;
        }
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_exercise_fit": {
        const endpoint = `/exercises/${args.exerciseId}/fit`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_exercise_tcx": {
        const endpoint = `/exercises/${args.exerciseId}/tcx`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_exercise_gpx": {
        const endpoint = `/exercises/${args.exerciseId}/gpx`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_daily_activity_range": {
        const params = new URLSearchParams();
        params.append("from", args.from as string);
        params.append("to", args.to as string);
        const endpoint = `/users/activities?${params.toString()}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_sleep_range": {
        const params = new URLSearchParams();
        params.append("from", args.from as string);
        params.append("to", args.to as string);
        const endpoint = `/users/sleep?${params.toString()}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

      case "get_nightly_recharge_range": {
        const params = new URLSearchParams();
        params.append("from", args.from as string);
        params.append("to", args.to as string);
        const endpoint = `/users/nightly-recharge?${params.toString()}`;
        result = await polarApiRequest(endpoint, accessToken);
        break;
      }

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

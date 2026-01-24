# Polar MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)

An MCP (Model Context Protocol) server for the Polar AccessLink API. Connect your Polar fitness data to Claude AI - access workouts, sleep analysis, recovery metrics, heart rate data, and more.

## Quick Start (Public Instance)

**No setup required!** Use our hosted instance:

1. Visit **[polar-mcp-server.n-neuhaeusel.workers.dev](https://polar-mcp-server.n-neuhaeusel.workers.dev)**
2. Click **"Connect with Polar"** and authorize with your Polar account
3. Copy the MCP Server URL you receive
4. In Claude: **Settings → Integrations → Add MCP Server**
5. Paste the URL and start chatting about your fitness data!

## Features

### 25 Tools Available

| Category | Tools | Description |
|----------|-------|-------------|
| **Exercises** | `get_exercises`, `get_exercise` | Training data with HR, speed, zones |
| **Exercise Export** | `get_exercise_fit`, `get_exercise_tcx`, `get_exercise_gpx` | Export in FIT, TCX, GPX formats |
| **Sleep** | `get_sleep`, `get_sleep_range` | Sleep stages, score, duration |
| **Recovery** | `get_nightly_recharge`, `get_nightly_recharge_range` | ANS charge, HRV, breathing rate |
| **Activity** | `get_daily_activity`, `get_daily_activity_range`, `get_activity_samples`, `get_activity_samples_range` | Steps, calories, activity zones |
| **Heart Rate** | `get_continuous_heart_rate`, `get_continuous_heart_rate_range` | 24/7 heart rate monitoring |
| **Training Load** | `get_cardio_load`, `get_cardio_load_range`, `get_cardio_load_history` | TRIMP, acute/chronic load |
| **SleepWise** | `get_sleepwise_alertness`, `get_sleepwise_circadian_bedtime` | Alertness predictions, optimal bedtime |
| **Biosensing** | `get_body_temperature`, `get_skin_temperature`, `get_spo2` | Temperature, SpO2 data |
| **User** | `get_user_info`, `get_physical_info` | Profile, VO2max, resting HR |

### Supported Devices

- Polar Pacer / Pacer Pro
- Polar Vantage V2 / V3
- Polar Vantage M / M2
- Polar Grit X / Grit X Pro / Grit X2 Pro
- Polar Ignite / Ignite 2 / Ignite 3
- Polar Unite
- And more...

## Example Prompts

Once connected, ask Claude:

- "Show me my workouts from last week"
- "How was my sleep last night? Compare it to my weekly average"
- "Analyze my heart rate variability trends"
- "What's my current training load status?"
- "When should I go to bed tonight for optimal recovery?"
- "Export my last run as a GPX file"
- "How many steps did I take this month?"

## Self-Hosting

Want to run your own instance? Two deployment options available:

### Option 1: Cloudflare Workers (Recommended)

#### Prerequisites

- [Cloudflare](https://cloudflare.com) account
- [Polar AccessLink](https://admin.polaraccesslink.com/) API credentials

#### Setup

```bash
# Clone and install
git clone https://github.com/NelsonNew/polar-mcp-server.git
cd polar-mcp-server
npm install

# Create KV namespace
npx wrangler kv namespace create OAUTH_KV
# Copy the ID to wrangler.toml

# Set secrets
npx wrangler secret put POLAR_CLIENT_ID
npx wrangler secret put POLAR_CLIENT_SECRET

# Deploy
npm run deploy
```

After deploying, add the callback URL to your Polar app:
```
https://YOUR-WORKER.workers.dev/callback
```

### Option 2: Local (Claude Desktop)

```bash
# Clone and build
git clone https://github.com/NelsonNew/polar-mcp-server.git
cd polar-mcp-server
npm install && npm run build

# Get access token
export POLAR_CLIENT_ID="your_client_id"
export POLAR_CLIENT_SECRET="your_client_secret"
npm run auth
```

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "polar": {
      "command": "node",
      "args": ["/path/to/polar-mcp-server/dist/index.js"],
      "env": {
        "POLAR_ACCESS_TOKEN": "your_access_token"
      }
    }
  }
}
```

## API Reference

All tools use the [Polar AccessLink API v3](https://www.polar.com/accesslink-api/).

| Tool | Endpoint | Description |
|------|----------|-------------|
| `get_user_info` | `/users/{id}` | User profile |
| `get_physical_info` | `/users/physical-information` | VO2max, max HR, resting HR |
| `get_exercises` | `/exercises` | Last 30 days of workouts |
| `get_exercise` | `/exercises/{id}` | Single workout details |
| `get_exercise_fit/tcx/gpx` | `/exercises/{id}/fit\|tcx\|gpx` | Export formats |
| `get_sleep` | `/users/sleep` | Sleep data |
| `get_nightly_recharge` | `/users/nightly-recharge` | Recovery metrics |
| `get_daily_activity` | `/users/activities` | Daily activity |
| `get_continuous_heart_rate` | `/users/continuous-heart-rate` | 24/7 HR |
| `get_cardio_load` | `/users/cardio-load` | Training load |
| `get_sleepwise_alertness` | `/users/sleepwise/alertness` | Alertness predictions |
| `get_body_temperature` | `/users/biosensing/bodytemperature` | Body temp |
| `get_spo2` | `/users/biosensing/spo2` | Blood oxygen |

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Session expired" | Visit `/authorize` again to create a new session |
| "Polar API error (403)" | Re-authorize or check if data sync is complete |
| "Polar API error (404)" | Endpoint not available for your device/subscription |
| No exercise data | Sync your Polar device to Polar Flow app first |

## Privacy

- Your Polar credentials are never stored
- OAuth tokens are stored in Cloudflare KV with 24-hour expiration
- Each user gets their own isolated session
- No fitness data is logged or stored on our servers

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

## Links

- [Polar AccessLink API](https://www.polar.com/accesslink-api/)
- [Polar Developer Portal](https://admin.polaraccesslink.com/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Cloudflare Workers](https://workers.cloudflare.com/)

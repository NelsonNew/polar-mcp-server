# Polar MCP Server

Ein MCP (Model Context Protocol) Server für die Polar AccessLink API. Ermöglicht Claude den Zugriff auf deine Polar Fitness-Daten wie Trainings, Schlaf, Nightly Recharge und tägliche Aktivitäten.

## Features

- **get_exercises** - Trainingseinheiten der letzten 30 Tage mit optionalen Samples und Trainingszonen
- **get_exercise** - Details zu einem spezifischen Training
- **get_nightly_recharge** - Nightly Recharge Daten (ANS Charge, HRV, Atemfrequenz)
- **get_sleep** - Schlafanalyse (Schlafphasen, Schlaf-Score, Schlafdauer)
- **get_daily_activity** - Tägliche Aktivität (Schritte, Kalorien, Aktivitätsziel)
- **get_user_info** - Benutzerinformationen
- **get_physical_info** - Körperliche Daten (VO2max, max. HF, Ruhe-HF)

## Zwei Deployment-Optionen

### Option 1: Remote (Cloudflare Workers) - Empfohlen für claude.ai

Nutzer können einfach eine Website besuchen, sich mit Polar anmelden und den MCP Server in Claude.ai verwenden.

### Option 2: Lokal (Claude Desktop)

Für lokale Installation mit Claude Desktop.

---

## Option 1: Remote Deployment (Cloudflare Workers)

### Voraussetzungen

1. Ein [Cloudflare](https://cloudflare.com) Account
2. API-Zugangsdaten von [Polar AccessLink](https://admin.polaraccesslink.com/)

### Setup

#### 1. Repository klonen

```bash
git clone https://github.com/NelsonNew/polar-mcp-server.git
cd polar-mcp-server
npm install
```

#### 2. Polar API-Client erstellen

1. Gehe zu https://admin.polaraccesslink.com/
2. Erstelle einen neuen API-Client
3. **Wichtig:** Setze die Redirect URI auf: `https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev/callback`
4. Notiere **Client ID** und **Client Secret**

#### 3. Cloudflare KV Namespace erstellen

```bash
npx wrangler kv namespace create OAUTH_KV
```

Kopiere die ausgegebene ID und füge sie in `wrangler.toml` ein:

```toml
[[kv_namespaces]]
binding = "OAUTH_KV"
id = "DEINE_KV_ID_HIER"
```

#### 4. Secrets setzen

```bash
npx wrangler secret put POLAR_CLIENT_ID
# Gib deine Client ID ein

npx wrangler secret put POLAR_CLIENT_SECRET
# Gib dein Client Secret ein
```

#### 5. Deployen

```bash
npm run deploy
```

#### 6. Redirect URI aktualisieren

Nach dem ersten Deploy erhältst du eine Worker-URL. Gehe zurück zu https://admin.polaraccesslink.com/ und aktualisiere die Redirect URI auf:

```
https://polar-mcp-server.YOUR-SUBDOMAIN.workers.dev/callback
```

### Verwendung (Remote)

1. Öffne deine Worker-URL im Browser
2. Klicke auf **"Connect with Polar"**
3. Autorisiere die App bei Polar
4. Kopiere die angezeigte MCP Server URL
5. In Claude (claude.ai): **Settings → Integrations → Add MCP Server**
6. Füge die URL ein

---

## Option 2: Lokale Installation (Claude Desktop)

### Voraussetzungen

1. Ein [Polar Flow](https://flow.polar.com/) Konto
2. Eine Polar Uhr (z.B. Pacer Pro, Vantage V2, Grit X)
3. API-Zugangsdaten von [Polar AccessLink](https://admin.polaraccesslink.com/)

### Setup

#### 1. Installation

```bash
git clone https://github.com/NelsonNew/polar-mcp-server.git
cd polar-mcp-server
npm install
npm run build
```

#### 2. API-Client erstellen

1. Gehe zu https://admin.polaraccesslink.com/
2. Erstelle einen neuen API-Client
3. Setze die Redirect URI auf: `http://localhost:8888/callback`
4. Notiere **Client ID** und **Client Secret**

#### 3. Access Token generieren

```bash
export POLAR_CLIENT_ID="deine_client_id"
export POLAR_CLIENT_SECRET="dein_client_secret"
npm run auth
```

Folge den Anweisungen und kopiere den Access Token.

#### 4. Claude Desktop konfigurieren

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "polar": {
      "command": "node",
      "args": ["/pfad/zu/polar-mcp-server/dist/index.js"],
      "env": {
        "POLAR_ACCESS_TOKEN": "dein_access_token"
      }
    }
  }
}
```

#### 5. Claude Desktop neu starten

---

## Beispiel-Anfragen

Sobald verbunden, kannst du Claude fragen:

- "Zeig mir meine letzten Trainings"
- "Wie war mein Schlaf letzte Nacht?"
- "Analysiere meinen Nightly Recharge der letzten Woche"
- "Wie viele Schritte bin ich heute gegangen?"
- "Zeig mir meine Herzfrequenz-Samples vom letzten Lauf"
- "Wie ist meine aktuelle Erholung (ANS Charge)?"

## Unterstützte Geräte

- Polar Pacer / Pacer Pro
- Polar Vantage V2 / V3
- Polar Vantage M / M2
- Polar Grit X / Grit X Pro
- Polar Ignite / Ignite 2 / Ignite 3
- Polar Unite
- und weitere...

## API Endpoints

| Tool | Endpoint | Beschreibung |
|------|----------|--------------|
| get_user_info | `/v3/users/me` | Benutzerinformationen |
| get_exercises | `/v3/exercises` | Trainingsübersicht |
| get_exercise | `/v3/exercises/{id}` | Training-Details |
| get_nightly_recharge | `/v3/users/nightly-recharge` | Nightly Recharge |
| get_sleep | `/v3/users/sleep` | Schlafdaten |
| get_daily_activity | `/v3/users/activity` | Tägliche Aktivität |
| get_physical_info | `/v3/users/physical-information` | Körperliche Daten |

## Fehlerbehebung

### "Session expired"
Besuche `/authorize` erneut, um eine neue Session zu erstellen.

### "Polar API error (403)"
- Der Access Token könnte abgelaufen sein
- Der Benutzer ist möglicherweise nicht registriert

### "Polar API error (401)"
Ungültiger Access Token - generiere einen neuen.

## Lizenz

MIT

## Links

- [Polar AccessLink API](https://www.polar.com/accesslink-api/)
- [Polar Developer Portal](https://admin.polaraccesslink.com/)
- [MCP Protokoll](https://modelcontextprotocol.io/)
- [Cloudflare Workers](https://workers.cloudflare.com/)

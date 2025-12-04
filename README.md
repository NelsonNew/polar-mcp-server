# Polar MCP Server

Ein MCP (Model Context Protocol) Server für die Polar AccessLink API. Ermöglicht Claude den Zugriff auf deine Polar Fitness-Daten wie Trainings, Schlaf, Nightly Recharge und tägliche Aktivitäten.

## Features

- **get_exercises** - Trainingseinheiten der letzten 30 Tage abrufen, mit optionalen Samples (Herzfrequenz, Geschwindigkeit, Höhe, etc.) und Trainingszonen
- **get_exercise** - Details zu einem spezifischen Training abrufen
- **get_nightly_recharge** - Nightly Recharge Daten (ANS Charge, HRV, Atemfrequenz, Erholungsstatus)
- **get_sleep** - Schlafanalyse (Schlafphasen, Schlaf-Score, Schlafdauer, Unterbrechungen)
- **get_daily_activity** - Tägliche Aktivität (Schritte, Kalorien, aktive Zeit, Aktivitätsziel)
- **get_user_info** - Benutzerinformationen (Name, Gewicht, Größe, etc.)
- **get_physical_info** - Körperliche Daten (max. Herzfrequenz, Ruhe-HF, VO2max)

## Voraussetzungen

1. Ein [Polar Flow](https://flow.polar.com/) Konto
2. Eine Polar Uhr (z.B. Pacer Pro, Vantage V2, Grit X, Ignite)
3. API-Zugangsdaten von [Polar AccessLink](https://admin.polaraccesslink.com/)

## Setup

### 1. API-Client erstellen

1. Gehe zu https://admin.polaraccesslink.com/
2. Melde dich mit deinem Polar Flow Konto an
3. Erstelle einen neuen API-Client
4. Setze die Redirect URI auf: `http://localhost:8888/callback`
5. Notiere dir die **Client ID** und das **Client Secret**

### 2. Installation

```bash
git clone https://github.com/NelsonNew/polar-mcp-server.git
cd polar-mcp-server
npm install
npm run build
```

### 3. Access Token generieren

```bash
export POLAR_CLIENT_ID="deine_client_id"
export POLAR_CLIENT_SECRET="dein_client_secret"
npx tsx src/auth.ts
```

Folge den Anweisungen:
1. Öffne die angezeigte URL im Browser
2. Autorisiere die Anwendung bei Polar
3. Kopiere den Access Token aus dem Terminal

### 4. Claude Desktop konfigurieren

Füge folgendes zu deiner Claude Desktop Konfiguration hinzu:

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

### 5. Claude neu starten

Starte Claude Desktop neu, um den MCP Server zu laden.

## Verwendung

Sobald der Server läuft, kannst du Claude nach deinen Polar Daten fragen:

- "Zeig mir meine letzten Trainings"
- "Wie war mein Schlaf letzte Nacht?"
- "Analysiere meinen Nightly Recharge der letzten Woche"
- "Wie viele Schritte bin ich heute gegangen?"
- "Zeig mir meine Herzfrequenz-Samples vom letzten Lauf"

## API Endpoints

Der Server nutzt folgende Polar AccessLink API v3 Endpoints:

| Tool | Endpoint | Beschreibung |
|------|----------|--------------|
| get_user_info | `/v3/users/me` | Benutzerinformationen |
| get_exercises | `/v3/exercises` | Trainingsübersicht |
| get_exercise | `/v3/exercises/{id}` | Training-Details |
| get_nightly_recharge | `/v3/users/nightly-recharge` | Nightly Recharge |
| get_sleep | `/v3/users/sleep` | Schlafdaten |
| get_daily_activity | `/v3/users/activity` | Tägliche Aktivität |
| get_physical_info | `/v3/users/physical-information` | Körperliche Daten |

## Datenbeispiele

### Nightly Recharge
```json
{
  "polar_user": "...",
  "date": "2024-01-15",
  "heart_rate_avg": 52,
  "heart_rate_variability_avg": 45,
  "breathing_rate_avg": 14.5,
  "nightly_recharge_status": 3,
  "ans_charge": 2.5,
  "ans_charge_status": 3
}
```

### Sleep
```json
{
  "polar_user": "...",
  "date": "2024-01-15",
  "sleep_start_time": "2024-01-14T23:15:00",
  "sleep_end_time": "2024-01-15T07:30:00",
  "device_id": "...",
  "continuity": 3.5,
  "continuity_class": 3,
  "light_sleep": 14400,
  "deep_sleep": 7200,
  "rem_sleep": 5400,
  "total_interruption_duration": 1800,
  "sleep_score": 82
}
```

## Fehlerbehebung

### "POLAR_ACCESS_TOKEN environment variable is required"
Stelle sicher, dass der Access Token in der Claude Desktop Konfiguration gesetzt ist.

### "Polar API error (403)"
- Der Access Token könnte abgelaufen sein → Generiere einen neuen
- Der Benutzer ist möglicherweise nicht registriert → Führe das Auth-Script erneut aus

### "Polar API error (401)"
Ungültiger Access Token → Generiere einen neuen Token mit dem Auth-Script

## Lizenz

MIT

## Links

- [Polar AccessLink API Dokumentation](https://www.polar.com/accesslink-api/)
- [Polar Developer Portal](https://admin.polaraccesslink.com/)
- [MCP Protokoll](https://modelcontextprotocol.io/)

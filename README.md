# nanoclaw-ui

Standalone web UI for [NanoClaw](https://github.com/davekim917/nanoclaw). Chat, workflows, skills, and session history in a single-page app that connects to any NanoClaw instance.

## Quick Start

### Standalone Mode (recommended for development)

1. Clone and install:
```bash
git clone https://github.com/davekim917/nanoclaw-ui.git
cd nanoclaw-ui
npm install
```

2. Make sure your NanoClaw instance has `WEB_UI_TOKEN` set in `.env`:
```bash
# In your NanoClaw .env file
WEB_UI_TOKEN=your-secret-token
WEB_UI_ORIGINS=http://localhost:5173
```

3. Start the dev server:
```bash
npm run dev
```

4. Open `http://localhost:5173` in your browser. Enter your NanoClaw URL (e.g., `http://localhost:3002`) and the token you set above.

### Bundled Mode (production)

Install `nanoclaw-ui` into your NanoClaw instance so it serves the UI on `/ui/`:

```bash
cd /path/to/nanoclaw
npm install nanoclaw-ui
```

NanoClaw automatically detects the package and serves the built SPA at `http://your-nanoclaw:3002/ui/`. No CORS configuration needed in this mode.

## NanoClaw Requirements

Requires a NanoClaw instance running the API gateway (PR #49 or later). The API gateway adds:

- REST endpoints for sessions, tasks, memories, backlog, skills
- WebSocket for real-time chat streaming
- Capability discovery at `GET /api/capabilities`

### Environment Variables (NanoClaw side)

| Variable | Required | Description |
|----------|----------|-------------|
| `WEB_UI_TOKEN` | Yes | Bearer token for API authentication |
| `WEB_UI_ORIGINS` | Standalone only | Comma-separated allowed CORS origins (e.g., `http://localhost:5173`) |
| `WEB_UI_SENDER_NAME` | No | Display name for messages sent from the web UI (default: `Web User`) |

## Features

- **Chat** — Real-time streaming via WebSocket, markdown rendering (DOMPurify-sanitized), tool call indicators
- **Sessions** — Browse conversation history with search and pagination
- **Skills** — Browse installed skills, search the marketplace, install with progress tracking
- **Workflows** — Manage scheduled tasks with run history, pause/resume, inline editing (Town.com-inspired)
- **Capability-driven UI** — Sidebar adapts to your NanoClaw instance's features (memory, backlog, ship log shown only when available)
- **Dark + Light theme** — Dark mode default, derived from nanoclaw.dev brand

## Development

```bash
npm run dev       # Start dev server with hot reload
npm run build     # Build for production
npm run preview   # Preview production build locally
```

## Tech Stack

- [Lit](https://lit.dev/) 3.x — Web components
- [Vite](https://vitejs.dev/) — Build tool
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitization (security requirement)
- TypeScript (strict mode)
- URLPattern API for client-side routing
- EventTarget-based state management

## Architecture

The SPA connects to NanoClaw via two protocols:

- **REST** — CRUD operations (sessions, tasks, memories, skills)
- **WebSocket** — Real-time chat streaming, progress events, session lifecycle

All state lives in NanoClaw's SQLite database. The UI is stateless — it reads from the API and renders.

## License

MIT

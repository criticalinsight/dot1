# Velocity CMS - Product Requirements Document

## Overview

**Velocity** is a lean, speed-first Kanban-based content management system built on modern edge technologies. The application provides a minimal, focused task tracking interface for content pipelines.

## Core Value Proposition

- **Edge-Native**: Runs on Cloudflare Workers with Durable Objects
- **Real-Time Sync**: WebSocket-based live updates between frontend and backend
- **Local-First**: PGlite (PostgreSQL in WASM) for offline-capable frontend
- **Minimal Footprint**: No bloat, only essential features

## Features

### Must Have (P0)
| Feature | Status |
|---------|--------|
| Kanban board with 5 status columns | ✅ Implemented |
| Project context display | ✅ Implemented |
| Task persistence (SQLite) | ✅ Implemented |
| Backend-frontend sync | ✅ Implemented |

### Future Considerations (P1)
| Feature | Status |
|---------|--------|
| Task creation UI | ⏳ Planned |
| Drag-and-drop status changes | ⏳ Planned |
| Multi-project support | ⏳ Planned |
| User authentication | ⏳ Planned |

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | SolidJS, Vite, PGlite |
| Backend | Cloudflare Workers, Durable Objects |
| Database | SQLite (DO) + PGlite (Browser) |
| Styling | Tailwind CSS |

## Success Metrics

1. **Cold Start**: < 50ms for Durable Object initialization
2. **Sync Latency**: < 100ms for task updates via WebSocket
3. **Bundle Size**: < 200KB gzipped for frontend

## Non-Goals

- AI content generation (removed for lean scope)
- Multi-CMS publishing (removed)
- Voice input (removed)
- Image generation (removed)

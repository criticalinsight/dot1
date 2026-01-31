# Architecture

## System Overview

Velocity uses a **local-first** architecture with **edge synchronization**.

![Velocity Architecture](architecture.png)

## Data Flow

### Read Path
1. Frontend loads → PGlite initializes schema
2. Frontend fetches `/sync` → Backend returns all projects/tasks
3. Data stored in PGlite for local queries

### Write Path
1. Task created/updated in PGlite
2. POST to `/task` endpoint
3. Backend stores in SQLite, broadcasts via WebSocket
4. All connected clients receive update

## Components

### Frontend
| Component | Purpose |
|-----------|---------|
| `App.tsx` | UI Shell & State Management |
| `commands.ts` | CLI Command Logic (ls, add, mv) |
| `db/store.ts` | State Store, Sync, & Caching |
| `KanbanBoard` | Renders columns & tasks |

### Backend
| Component | Purpose |
|-----------|---------|
| `index.ts` | Worker Entry Point (WebSocket Fix) |
| `ProjectBrain.ts` | Durable Object (State, Cron, Telegram) |
| `Generator.ts` | Report Formatting Engine (Elixir-style) |
| `prompts.ts` | Research Prompt Templates (Epistemic, Rotary, etc) |
| `deepResearch.ts` | Gemini Agent Client |
| `proxy/` | Subpath Routing Worker |

## Database Schema

```sql
-- Projects
CREATE TABLE projects(
  id TEXT PRIMARY KEY,
  name TEXT,
  globalPrompt TEXT, // Not used currently
  knowledgeContext TEXT, // Not used currently
  scheduleInterval TEXT, // 'daily'
  lastRun TEXT,
  nextRun TEXT
);

-- Tasks
CREATE TABLE tasks(
  id TEXT PRIMARY KEY,
  projectId TEXT,
  title TEXT,
  status TEXT,  -- backlog|researching|drafting|review|published
  researchData TEXT, // JSON or Markdown report
  contentDraft TEXT,
  publishedUrl TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

-- Settings
CREATE TABLE system_settings(
  key TEXT PRIMARY KEY, // e.g., 'telegram_chat_id'
  value TEXT
);
```

## Performance Characteristics

| Operation | Complexity | Latency |
|-----------|------------|---------|
| Task read | O(log N) | < 1ms |
| Task write | O(log N) | < 5ms |
| Full sync | O(N) | < 50ms |
| WebSocket broadcast | O(C) | < 10ms |

*N = tasks, C = connected clients*

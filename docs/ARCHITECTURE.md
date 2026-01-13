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
| `App.tsx` | Root, project loader |
| `KanbanBoard` | Renders 5 status columns |
| `KanbanColumn` | Single status column |
| `KanbanCard` | Individual task card |
| `db/client.ts` | PGlite + sync logic |

### Backend
| Component | Purpose |
|-----------|---------|
| `index.ts` | Worker entry, routes to DO |
| `ProjectBrain.ts` | Durable Object, SQLite CRUD |

## Database Schema

```sql
-- Projects
CREATE TABLE projects(
  id TEXT PRIMARY KEY,
  name TEXT,
  globalPrompt TEXT,
  knowledgeContext TEXT,
  scheduleInterval TEXT
);

-- Tasks
CREATE TABLE tasks(
  id TEXT PRIMARY KEY,
  projectId TEXT,
  title TEXT,
  status TEXT,  -- backlog|researching|drafting|review|published
  researchData TEXT,
  contentDraft TEXT,
  publishedUrl TEXT,
  createdAt TEXT,
  updatedAt TEXT
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

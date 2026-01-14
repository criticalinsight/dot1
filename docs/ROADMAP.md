# Gemini Ops Roadmap

> Visual roadmap for the Gemini Operations Platform.

```mermaid
gantt
    title Gemini Ops Development Roadmap
    dateFormat  YYYY-MM
    axisFormat  %b %Y

    section v3.x Foundation
    Kanban Board UI           :done, kanban, 2026-01, 2026-01
    Playground Modal          :done, modal, 2026-01, 2026-01
    Add Task UI               :done, addtask, 2026-01, 2026-01
    Remove Legacy CLI         :done, rmcli, 2026-01, 2026-01

    section v4.0 Local-First
    PGlite Integration        :pglite, 2026-02, 2026-03
    IndexedDB Persistence     :idb, after pglite, 1M
    Enhanced WebSocket Sync   :sync, 2026-03, 2026-04

    section v4.5 Advanced Ops
    Compare Mode              :compare, 2026-04, 2026-05
    Evaluation Framework      :eval, after compare, 1M
    Template Library          :templates, 2026-05, 2026-06

    section v5.0 Polish
    Drag & Drop               :dnd, 2026-06, 2026-07
    Animations                :anim, after dnd, 1M
    Offline Mode              :offline, 2026-07, 2026-08
```

---

## Phase Breakdown

### Phase 1: Local Intelligence (v4.0) - Q1 2026
| Task | Description | Status |
|------|-------------|--------|
| PGlite Integration | Replace in-memory store with WASM Postgres | Planned |
| IndexedDB Persistence | Persist PGlite to browser storage | Planned |
| Advanced Querying | Enable SQL filtering/sorting on tasks | Planned |

### Phase 2: Enhanced Sync (v4.0) - Q1-Q2 2026
| Task | Description | Status |
|------|-------------|--------|
| Robust Sync Protocol | Upgrade WebSocket buffer | Planned |
| Conflict Resolution | Handle local/edge conflicts gracefully | Planned |
| Delta Updates | MessagePack-based incremental sync | Planned |

### Phase 3: Advanced Prompt Ops (v4.5) - Q2 2026
| Task | Description | Status |
|------|-------------|--------|
| Compare Mode | Side-by-side version comparison | Planned |
| Evaluation Framework | Automated output scoring | Planned |
| Template Library | Reusable system prompts | Planned |

### Phase 4: UI Polish (v5.0) - Q3 2026
| Task | Description | Status |
|------|-------------|--------|
| Drag & Drop | Kanban column reordering | Planned |
| Animations | Enter/exit card transitions | Planned |
| Offline Mode | Full read/write offline support | Planned |

---

## Current Sprint Focus (Jan 2026)

- [x] Kanban Board Implementation
- [x] Playground Modal (Markdown, Params, History)
- [x] Add Task UI
- [x] CLI Removal
- [ ] Code Refactoring & Documentation

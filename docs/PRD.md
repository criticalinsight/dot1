# Gemini Operations Platform (Gemini Ops) - Product Requirements Document

## Overview

**Gemini Ops** (formerly Velocity CMS) is a high-performance, edge-native operations platform for managing AI prompt engineering lifecycles. It combines a terminal-grade CLI for power users with a rich, visual Kanban interface for prompt iteration, batch testing, and version control.

## Core Value Proposition

- **AI-First Workflow**: dedicated lifecycle stats (Draft -> Queued -> Generating -> Deployed).
- **Prompt Engineering**: Split-view playground, markdown rendering, parameter tuning (Top-P, Temp), and version history.
- **Edge-Native Speed**: 6KB initial bundle, instant loads via Edge Caching.
- **Hybrid Database Architecture**: PGlite (WASM) for powerful local querying + Edge SQLite for global persistence.
- **Real-Time Sync**: Bi-directional WebSocket synchronization.

## Key User Workflows (Refined)

### 1. Prompt Creation (The "Draft" Cycle)
*   **Trigger**: User clicks `+` button in "Draft Prompts" column header.
*   **Action**: Opens a blank card or focused input at the top of the column.
*   **Input**: User types raw prompt concept (e.g., "Summarize this article").
*   **State**: Task created in `draft` status. Project default parameters applied.

### 2. Prompt Engineering (The Playground)
*   **Trigger**: User clicks any card.
*   **UI**: Opens Split-View Modal.
    *   *Left*: Prompt Editor (Textarea), Param Controls (Top-P, Temp), System Instructions.
    *   *Right*: Markdown Preview of latest output.
*   **Action**: User modifies prompt and hits `Cmd+Enter` (Run) or `Cmd+S` (Save).
*   **History**: Every "Run" creates a version snapshot. User can click timeline dots to revert.

### 3. Batch Execution
*   **Context**: User has multiple concepts in "Draft".
*   **Action**: Click `Run All` in column header.
*   **System**: 
    1.  Validates all drafts.
    2.  Moves all to `queued`.
    3.  Backend processes concurrently (respecting rate limits).
    4.  Cards update to `generating` -> `deployed` live.

### 4. Analysis & refinement
*   **Context**: Tasks are `deployed` (have results).
*   **Action**: User reviews outputs in header/preview mode on board, or opens modal for full read.
*   **Next Step**: 
    *   *Good*: Archive/Star (Future).
    *   *Bad*: Edit prompt in Modal -> New Version -> Re-run.

---

## Current State (v3.2 - Gemini Ops)

| Feature | Status |
|---------|--------|
| **Gemini Ops Kanban Board** | ✅ |
| -- Draft/Queued/Generating/Deployed Columns | ✅ |
| -- Batch "Run All" Operations | ✅ |
| -- Card Anatomy (Prompt/Output/Tokens) | ✅ |
| -- "Add Task" Button/Input | ✅ |
| -- Drag & Drop Reordering | ❌ (Planned) |
| **Playground Modal** | ✅ |
| -- Split View (Input / Markdown Output) | ✅ |
| -- Parameter Controls (Temp, Top-P) | ✅ |
| -- Version History & Rollback | ✅ |

---

## Technical Stack Architecture (Target)

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend Framework** | **SolidJS** | Signal-based reactivity, no VDOM. Ultra-light. |
| **Local Database** | **PGlite** | PostgreSQL compiled to WASM. Runs in browser for complex local queries and offline capability. |
| **Edge Backend** | **Cloudflare Workers** + **Durable Objects** | Serverless compute and state management. |
| **Edge Database** | **Native SQLite** | Embedded in Durable Objects for low-latency global persistence. |
| **Communication** | **WebSockets** | Bi-directional sync between Local PGlite and Edge SQLite. |
| **Styling** | **Tailwind CSS** | Utility-first styling. |

---

## Roadmap: Stack Migration & Refinement

### Phase 1: Local Intelligence (PGlite Integration)
- [ ] Replace current `db/store.ts` (in-memory/localStorage) with **PGlite**.
- [ ] Implement local SQL querying for advanced filtering/sorting of tasks.
- [ ] Persist PGlite state to IndexedDB.

### Phase 2: Enhanced Sync (WebSocket Protocol)
- [ ] Upgrade current simple WebSocket buffer to a robust Sync Protocol.
- [ ] Handle conflict resolution between Local PGlite and Edge SQLite.
- [ ] Implement delta updates (MessagePack).

### Phase 3: Advanced Prompt Ops
- [ ] Compare Mode: Select multiple versions to view side-by-side.
- [ ] Evaluation Framework: Automated scoring of outputs against test cases.
- [ ] Template Library: Reusable system prompts.

### Phase 4: UI Polish & Animations
- [ ] Drag-and-Drop for Kanban columns.
- [ ] Optimistic UI updates for all actions.
- [ ] Enter/Exit animations for cards.

---

## Success Metrics

| Metric | Current | Target v4.0 |
|--------|---------|-------------|
| Bundle Size (gzip) | ~66KB | <50KB (excluding WASM) |
| Time to Interactive | ~300ms | <100ms |
| Local Query Speed | N/A | <10ms (via PGlite) |
| Sync Latency | ~100ms | <50ms |
| Offline Support | Partial | Full (Read/Write) |

## Non-Goals
- Multi-tenant SaaS (Single-tenant / Personal usage focus).
- File uploads (Text/Code focus).



# Changelog

## [2.2.0] - 2026-01-13

### Added
- **Phase 7 (Rendering)**: Virtual terminal scrolling for 10k+ lines, `requestIdleCallback` for non-critical sync.
- **Phase 8 (Extreme)**: Off-main-thread CLI command processing (Web Worker), COOP/COEP security headers.
- **Deep Research Agent**: Integrated Gemini for automated research with advanced prompts (Epistemic/Strategic).
- **Recurring Schedule**: Projects with `scheduleInterval='daily'` auto-generate tasks via cron.
- **Telegram Integration**: Full research reports sent to Telegram bot (`/telegram/webhook`).
- **Subpath Deployment**: Frontend ported to `/1/` base path for `moecapital.com/1`.
- **Proxy Worker**: Cloudflare Worker to route `moecapital.com/1/*` to key frontend.

### Fixed
- **WebSocket RangeError**: Fixed status 101 handling in Worker entry point.
- **Deployment**: Resolved subpath asset loading issues.

---

## [2.1.0] - 2026-01-13

### Added
- **Phase 5 (Network)**: ETag support (304 Not Modified) for `/sync`
- **Phase 6 (Protocol)**: Delta Sync (fetching only changed items via `?since=`)
- Refactoring: Extracted `commands.ts` for CLI logic in frontend
- Refactoring: Split `ProjectBrain.ts` into discrete route handlers

### Optimizations
- **Network**: Reduced payload size by ~90% for subsequent syncs
- **Code Quality**: Separated concerns in Backend (routes) and Frontend (commands)
- **Performance**: Validated caching headers and weak ETag generation

### Added (Previous)
- Speed optimizations: indexes, memoization, batched transactions
- JSDoc with Big O complexity analysis on all functions
- Input validation with length limits and type checks
- Cloudflare deployment: Pages + Workers

### Changed
- wrangler.toml: `new_sqlite_classes` for free tier DO support
- vite.config: esnext target, code splitting, console removal

---

## [2.0.0] - 2026-01-13

### Removed
- **AIBand** - decorative AI ensemble display
- **VoiceInput** - voice-to-task creation
- **StyleDesigner** - brand voice calibration
- **ImageGen** - Vertex AI image generation
- **KnowledgeGraph** - relational context extraction
- **VectorMemory** - vector embeddings/RAG
- **ResearchScraper** - web scraping for research
- **PluginSystem** - WordPress/Ghost publishing plugins
- **Publisher** - Cloudflare Pages deployment
- **AI Router** - multi-model ensemble routing

### Changed
- Simplified `App.tsx` to core Kanban + project display
- Reduced `ProjectBrain.ts` to CRUD + sync only
- Removed `styleProfile` and image fields from types
- Cleaned database schemas (removed knowledge_graph, analytics, variations)

### Metrics
| Metric | Before | After |
|--------|--------|-------|
| Frontend files | 11 | 7 |
| Backend files | 8 | 2 |
| Types | 4 | 2 |

---

## [1.5.0] - 2026-01-12

### Added
- Multimodal image generation (Phase 5)
- Adaptive brand voice with StyleProfile
- Relational knowledge graph
- Task variations for A/B testing

---

## [1.0.0] - 2026-01-10

### Added
- Initial release
- Kanban board with 5 status columns
- SolidJS frontend with PGlite
- Cloudflare Worker backend with Durable Objects
- WebSocket real-time sync

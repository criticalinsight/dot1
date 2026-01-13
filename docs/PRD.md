# Velocity CMS - Product Requirements Document

## Overview

**Velocity** is a lean, speed-first CLI-style task management system built on modern edge technologies. Browser-based terminal interface with real-time sync.

## Core Value Proposition

- **Edge-Native**: Cloudflare Workers + Durable Objects
- **Real-Time Sync**: WebSocket live updates
- **Ultra-Light**: **6KB** gzipped bundle
- **CLI Interface**: Terminal-style browser app

## Current State (v2.2)

| Feature | Status |
|---------|--------|
| Browser CLI interface | ✅ |
| Commands: ls, add, mv, clear, help | ✅ |
| SQLite Durable Object backend | ✅ |
| WebSocket real-time sync | ✅ |
| 6KB gzipped bundle | ✅ |

---

## Speed Enhancements Roadmap

### Phase 1: Network (v2.3 - Feb 2026)
| Enhancement | Impact | Effort |
|-------------|--------|--------|
| HTTP/3 QUIC support | -20ms latency | Low |
| Brotli compression | -15% payload | Low |
| Edge caching (stale-while-revalidate) | -50ms TTFB | Done ✅ |
| Connection keepalive | -100ms reconnect | Medium |

### Phase 2: Runtime (v2.4 - Mar 2026)
| Enhancement | Impact | Effort |
|-------------|--------|--------|
| WebSocket binary protocol | -30% message size | Medium |
| Batch command execution | -n× round trips | Medium |
| Optimistic UI updates | Instant feedback | Low |
| Debounced sync (100ms) | -80% network calls | Low |

### Phase 3: Backend (v2.5 - Apr 2026)
| Enhancement | Impact | Effort |
|-------------|--------|--------|
| SQLite WAL mode | 10x write speed | Low |
| Prepared statements | -5ms query time | Done ✅ |
| Index on (projectId, status) | O(log n) queries | Done ✅ |
| Query result streaming | -50% memory | High |

### Phase 4: Bundle (v2.6 - May 2026)
| Enhancement | Impact | Effort |
|-------------|--------|--------|
| Tree-shake SolidJS | -2KB | Low |
| Inline critical CSS | -1 request | Low |
| Preload hints | -100ms FCP | Low |
| Service Worker caching | Offline capable | Medium |

---

## Success Metrics

| Metric | Current | Target v3.0 |
|--------|---------|-------------|
| Bundle (gzip) | **6KB** | <5KB |
| First paint | ~200ms | <100ms |
| Sync latency | ~50ms | <20ms |
| Backend cold start | ~30ms | <10ms |

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | SolidJS, Vite, Terminal CSS |
| Backend | Cloudflare Workers, Durable Objects |
| Database | SQLite (DO) |
| Protocol | HTTPS/WSS |

## Non-Goals

- AI features
- Rich text editor
- File uploads
- Multi-tenant

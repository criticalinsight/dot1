# Velocity CMS - Product Requirements Document

## Overview

**Velocity** is a lean, speed-first CLI-style task management system built on modern edge technologies. Browser-based terminal interface with real-time sync.

## Core Value Proposition

- **Edge-Native**: Cloudflare Workers + Durable Objects
- **Real-Time Sync**: WebSocket live updates
- **Deep Research**: Automated multi-agent research (Epistemic/Strategic)
- **Telegram Integration**: Research reports delivered to chat
- **Ultra-Light**: **6KB** gzipped bundle
- **CLI Interface**: Terminal-style browser app

## Current State (v3.0)

| Feature | Status |
|---------|--------|
| Browser CLI interface | ✅ |
| Commands: ls, add, mv, clear, help | ✅ |
| SQLite Durable Object backend | ✅ |
| WebSocket real-time sync | ✅ |
| Deep Research Agent (Daily Task) | ✅ |
| Telegram Reports | ✅ |
| Virtual Scrolling (10k+ lines) | ✅ |
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

### Phase 4: Bundle (v2.6 - May 2026) ✅
| Enhancement | Impact | Effort |
|-------------|--------|--------|
| Tree-shake SolidJS | -2KB | Low |
| Inline critical CSS | -1 request | Done ✅ |
| Preload hints | -100ms FCP | Done ✅ |
| Service Worker caching | Offline capable | Medium |

---

## Advanced Speed Optimizations (v3.0+)

### Phase 5: Edge Computing (Jun 2026)
| Enhancement | Impact | Effort |
|-------------|--------|--------|
| Smart Caching | Cache per-user at edge | Medium |
| Edge KV for session | -50ms auth lookup | Low |
| Geographic routing | -30ms for distant users | Low |
| Request coalescing | -n× concurrent requests | Medium |

### Phase 6: Protocol (Jul 2026)
| Enhancement | Impact | Effort |
|-------------|--------|--------|
| MessagePack over WS | -40% payload vs JSON | Medium |
| Delta sync | Only send changed fields | High |
| Compression (zstd) | -60% message size | Low |
| Multiplexing | Single connection for all | High |

### Phase 7: Rendering (Active - v3.0) ✅
| Enhancement | Impact | Effort |
|-------------|--------|--------|
| Virtual scrolling | O(1) render for 10k items | Done ✅ |
| requestIdleCallback | Non-blocking updates | Done ✅ |
| Web Workers | Off-main-thread processing | Done ✅ |
| Canvas rendering | 60fps for large lists | Skipped |

### Phase 8: Extreme (Active - v3.0) ✅
| Enhancement | Impact | Effort |
|-------------|--------|--------|
| Web Worker CLI | 0ms UI blocking | Done ✅ |
| SharedArrayBuffer | Zero-copy data transfer | Deferred |
| COOP/COEP Headers | Security for High-Res timers | Done ✅ |
| Predictive prefetch | Anticipate user actions | Planned |

---

## Success Metrics

| Metric | Current | Target v3.0 | Target v4.0 |
|--------|---------|-------------|-------------|
| Bundle (gzip) | **6KB** | <5KB | <3KB |
| First paint | ~200ms | <100ms | <50ms |
| Sync latency | ~50ms | <20ms | <10ms |
| Backend cold start | ~30ms | <10ms | <5ms |
| Offline capable | ❌ | ⏳ | ✅ |

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | SolidJS, Vite, Terminal CSS |
| Backend | Cloudflare Workers, Durable Objects |
| Database | SQLite (DO) |
| Protocol | HTTPS/WSS, MessagePack |

## Non-Goals

- Rich text editor
- File uploads
- Multi-tenant


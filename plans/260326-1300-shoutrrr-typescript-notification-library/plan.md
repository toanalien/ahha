---
title: "Shoutrrr TypeScript Notification Library"
description: "TypeScript-first notification library with Shoutrrr-compatible URL config, plugin services, delivery strategies"
status: pending
priority: P1
effort: 24h
branch: main
tags: [typescript, notifications, library, open-source, npm]
created: 2026-03-26
---

# Shoutrrr - TypeScript Notification Library

## Overview

Lightweight, TypeScript-first notification library inspired by Shoutrrr (Go) and Apprise (Python). URL-based config, zero runtime deps, plugin service architecture.

**Package name:** `shoutrrr` (npm)
**License:** MIT
**Target:** Node.js 18+ (native fetch)

## API Preview

```typescript
import { send, createSender } from 'shoutrrr';

// One-liner
await send('slack://token@channel', 'Hello!');

// Reusable sender with multiple services
const sender = createSender([
  'slack://token@channel',
  'discord://token@webhook',
]);
await sender.send('Hello!');
```

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Project Scaffold & Tooling | pending | 2h | [phase-01-project-scaffold.md](./phase-01-project-scaffold.md) |
| 2 | Core Infrastructure | pending | 6h | [phase-02-core-infrastructure.md](./phase-02-core-infrastructure.md) |
| 3 | Delivery Strategies | pending | 3h | [phase-03-delivery-strategies.md](./phase-03-delivery-strategies.md) |
| 4 | MVP Services (6) | pending | 6h | [phase-04-mvp-services.md](./phase-04-mvp-services.md) |
| 5 | Public API & Bundling | pending | 3h | [phase-05-public-api-and-bundling.md](./phase-05-public-api-and-bundling.md) |
| 6 | Testing | pending | 3h | [phase-06-testing.md](./phase-06-testing.md) |
| 7 | Documentation & Publish | pending | 1h | [phase-07-documentation-and-publish.md](./phase-07-documentation-and-publish.md) |

## Key Dependencies

- Node.js 18+ (native fetch, native URL)
- TypeScript 5.x
- tsup (bundling ESM+CJS)
- Vitest (testing)
- No runtime dependencies

## Architecture

```
src/
  core/          -- types, url-parser, router, service-registry
  services/      -- slack, discord, telegram, email, webhook, ntfy
  strategies/    -- direct, fallback, broadcast, round-robin
  index.ts       -- public API (send, createSender)
```

## Research Reports

- [Research Summary](../reports/RESEARCH-SUMMARY.md)
- [Architecture Recommendations](../reports/architecture-recommendations.md)
- [Competitive Gap Analysis](../reports/competitive-gap-analysis.md)
- [Shoutrrr Research](../reports/shoutrrr-research-report.md)

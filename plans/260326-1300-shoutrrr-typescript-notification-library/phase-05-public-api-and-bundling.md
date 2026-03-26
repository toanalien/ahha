# Phase 5: Public API & Bundling

## Context Links
- [Plan Overview](./plan.md)
- [Phase 2: Core Infrastructure](./phase-02-core-infrastructure.md)
- [Phase 3: Delivery Strategies](./phase-03-delivery-strategies.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 3h
- **Description:** Wire everything together into the public API surface. Match Shoutrrr's simplicity.

## Key Insights
- Shoutrrr exports 3 main functions: `Send()`, `CreateSender()`, `NewSender()`
- Our API should mirror this: `send()`, `createSender()`
- The `send()` one-liner is the hero API -- must be dead simple
- `createSender()` returns a reusable Sender object with strategy support
- Auto-register all built-in services on first import

## Requirements

### Functional
- `send(url, message, params?)` -- one-liner, single URL
- `createSender(urls, options?)` -- returns Sender with `.send()` and `.sendAsync()`
- `Sender` class with configurable strategy
- All built-in services auto-registered on import
- Re-export types for consumer use

### Non-functional
- Public API in `src/index.ts` < 80 lines
- Tree-shakeable where possible
- Clean type exports for IDE autocomplete

## Architecture

### Public API Surface

```typescript
// Main functions
export async function send(url: string, message: string, params?: Params): Promise<SendResult>;
export function createSender(urls: string[], options?: SenderOptions): Sender;

// Sender class
export class Sender {
  send(message: string, params?: Params): Promise<SendResult[]>;
}

// Options
export interface SenderOptions {
  strategy?: 'direct' | 'fallback' | 'broadcast' | 'round-robin';
}

// Re-exported types
export type { SendResult, Params, Service, ServiceDefinition, ParsedUrl };
export type { DeliveryStrategy, StrategyName };

// For custom services
export { registerService } from './core/service-registry.js';
export { parseUrl } from './core/url-parser.js';
```

## Related Code Files

### Files to Create
- `src/sender.ts` -- Sender class wrapping Router
- `src/index.ts` -- Public API exports

### Files to Modify
- `src/core/router.ts` -- ensure Router supports single-URL mode for `send()`

## Implementation Steps

### Step 1: Sender Class (`src/sender.ts`)

```typescript
import { Router } from './core/router.js';
import type { SendResult, Params } from './core/types.js';
import type { StrategyName } from './strategies/index.js';

export interface SenderOptions {
  strategy?: StrategyName;
}

export class Sender {
  private router: Router;

  constructor(urls: string[], options?: SenderOptions) {
    this.router = new Router(urls, { strategy: options?.strategy ?? 'broadcast' });
  }

  async send(message: string, params?: Params): Promise<SendResult[]> {
    return this.router.send(message, params);
  }
}
```

### Step 2: Public API (`src/index.ts`)

```typescript
// Auto-register all built-in services
import './services/index.js';

import { Router } from './core/router.js';
import { Sender } from './sender.js';
import type { SendResult, Params } from './core/types.js';
import type { SenderOptions } from './sender.js';

/**
 * Send a notification via a single service URL.
 *
 * @example
 * await send('slack://hook:token@webhook', 'Hello!');
 */
export async function send(
  url: string,
  message: string,
  params?: Params,
): Promise<SendResult> {
  const router = new Router([url], { strategy: 'direct' });
  const results = await router.send(message, params);
  return results[0];
}

/**
 * Create a reusable sender for multiple service URLs.
 *
 * @example
 * const sender = createSender(['slack://...', 'discord://...']);
 * await sender.send('Hello!');
 */
export function createSender(
  urls: string[],
  options?: SenderOptions,
): Sender {
  return new Sender(urls, options);
}

// Re-export types
export type { SendResult, Params, SenderOptions };
export type { Service, ServiceDefinition, ParsedUrl } from './core/types.js';
export type { DeliveryStrategy, StrategyName } from './strategies/types.js';

// Re-export for custom service registration
export { registerService, listServices } from './core/service-registry.js';
export { parseUrl } from './core/url-parser.js';
export { Sender } from './sender.js';
```

### Step 3: Verify Bundle

1. Run `npm run build`
2. Verify dist/ contains: `index.js`, `index.cjs`, `index.d.ts`
3. Verify no runtime deps in output
4. Test import from both ESM and CJS:
   ```typescript
   // ESM
   import { send, createSender } from './dist/index.js';
   // CJS
   const { send, createSender } = require('./dist/index.cjs');
   ```

### Step 4: Verify API Ergonomics

Write a smoke test that exercises the full API:

```typescript
import { send, createSender } from 'shoutrrr';

// One-liner
const result = await send('ntfy://test-topic', 'Hello from shoutrrr!');
assert(result.success || result.error);

// Multi-service sender
const sender = createSender([
  'ntfy://topic1',
  'ntfy://topic2',
], { strategy: 'broadcast' });
const results = await sender.send('Broadcast test');
assert(results.length === 2);
```

## Todo List

- [ ] Create `src/sender.ts`
- [ ] Create final `src/index.ts` with public API
- [ ] Verify build output (ESM + CJS + types)
- [ ] Verify type exports are correct
- [ ] Smoke test: `send()` one-liner
- [ ] Smoke test: `createSender()` with strategy
- [ ] Smoke test: custom service registration
- [ ] Verify bundle size < 50KB minified

## Success Criteria
- `send(url, msg)` works as one-liner
- `createSender(urls, opts)` returns Sender with `.send()`
- All types exported and usable by consumers
- `registerService()` allows adding custom services
- ESM and CJS outputs both work
- Bundle size < 50KB minified

## Risk Assessment
- **Auto-registration side effects**: Importing `src/services/index.ts` triggers all registrations. Acceptable for a notification library (all services are lightweight).
- **Tree-shaking**: Side-effect imports prevent tree-shaking of unused services. Acceptable for MVP. Future: allow `import 'shoutrrr/slack'` for selective registration.

## Next Steps
- Phase 6: Testing

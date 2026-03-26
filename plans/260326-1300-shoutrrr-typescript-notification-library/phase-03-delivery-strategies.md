# Phase 3: Delivery Strategies

## Context Links
- [Plan Overview](./plan.md)
- [Phase 2: Core Infrastructure](./phase-02-core-infrastructure.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 3h
- **Description:** Implement 4 delivery strategies: direct, fallback, broadcast, round-robin.

## Key Insights
- Shoutrrr default: send to ALL configured services (broadcast)
- Fallback is most requested pattern: try services in order until one succeeds
- Round-robin useful for load distribution across redundant channels
- Direct = send to single service (used by `send(url, msg)` one-liner)
- Strategy interface must be simple: `execute(services, message, params) => SendResult[]`

## Requirements

### Functional
- `direct` -- send via single service, return single result
- `fallback` -- try services in order, stop on first success
- `broadcast` -- send to all services concurrently, return all results
- `round-robin` -- rotate through services across calls

### Non-functional
- Strategies are stateless (except round-robin needs index)
- Timeout per service: configurable, default 10s (matches Shoutrrr)
- Each strategy file < 100 lines

## Architecture

```typescript
/** Strategy interface */
export interface DeliveryStrategy {
  execute(
    services: Service[],
    message: string,
    params?: Params,
  ): Promise<SendResult[]>;
}
```

### Strategy Behaviors

| Strategy | Concurrency | Stops Early | Returns |
|----------|-------------|-------------|---------|
| direct | single | n/a | 1 result |
| fallback | sequential | on success | 1 result (first success or all errors) |
| broadcast | parallel | never | N results |
| round-robin | single | on success, then rotates | 1 result |

## Related Code Files

### Files to Create
- `src/strategies/types.ts` -- DeliveryStrategy interface
- `src/strategies/direct-strategy.ts` -- single service
- `src/strategies/fallback-strategy.ts` -- try until success
- `src/strategies/broadcast-strategy.ts` -- send to all
- `src/strategies/round-robin-strategy.ts` -- rotate index
- `src/strategies/index.ts` -- re-exports + factory function

### Files to Modify
- `src/core/router.ts` -- integrate strategy into Router.send()

## Implementation Steps

### Step 1: Strategy Interface (`src/strategies/types.ts`)

```typescript
import type { Service, SendResult, Params } from '../core/types.js';

export interface DeliveryStrategy {
  readonly name: string;
  execute(
    services: Service[],
    message: string,
    params?: Params,
  ): Promise<SendResult[]>;
}
```

### Step 2: Direct Strategy

Send to first (and only) service. Used internally by `send(url, msg)`.

### Step 3: Fallback Strategy

```typescript
// Try each service in order. Return on first success.
// If all fail, return array of all error results.
for (const service of services) {
  const result = await service.send(message, params);
  if (result.success) return [result];
  errors.push(result);
}
return errors;
```

### Step 4: Broadcast Strategy

```typescript
// Send to all concurrently via Promise.allSettled
const results = await Promise.allSettled(
  services.map(s => s.send(message, params))
);
// Map settled results to SendResult[]
```

### Step 5: Round-Robin Strategy

Maintains internal index. Each call picks next service, wraps around.
On failure, tries next service (like fallback from current index).

### Step 6: Strategy Factory

```typescript
export type StrategyName = 'direct' | 'fallback' | 'broadcast' | 'round-robin';

export function createStrategy(name: StrategyName): DeliveryStrategy {
  switch (name) {
    case 'direct': return new DirectStrategy();
    case 'fallback': return new FallbackStrategy();
    case 'broadcast': return new BroadcastStrategy();
    case 'round-robin': return new RoundRobinStrategy();
  }
}
```

### Step 7: Integrate into Router

Update Router to accept strategy option. Default strategy = broadcast (Shoutrrr behavior).

```typescript
export class Router {
  private strategy: DeliveryStrategy;

  constructor(urls: string[], options?: { strategy?: StrategyName }) {
    this.strategy = createStrategy(options?.strategy ?? 'broadcast');
    // ... service creation
  }

  async send(message: string, params?: Params): Promise<SendResult[]> {
    return this.strategy.execute(this.services, message, params);
  }
}
```

## Todo List

- [ ] Create `src/strategies/types.ts`
- [ ] Implement DirectStrategy
- [ ] Implement FallbackStrategy
- [ ] Implement BroadcastStrategy
- [ ] Implement RoundRobinStrategy
- [ ] Create strategy factory in `src/strategies/index.ts`
- [ ] Update Router to use strategies
- [ ] Unit test: each strategy with mock services (success, failure, mixed)
- [ ] Unit test: round-robin index rotation
- [ ] Unit test: fallback stops on first success
- [ ] Verify build

## Success Criteria
- All 4 strategies behave per specification
- Fallback stops trying after first success
- Broadcast sends to all concurrently
- Round-robin rotates correctly across multiple calls
- All tests pass

## Risk Assessment
- **Round-robin state**: Index persists across calls but resets on Router re-creation. Acceptable for MVP.
- **Promise.allSettled**: Available in Node 18+. No polyfill needed.
- **Timeout**: Defer per-service timeout to Phase 4 (services handle own timeouts via AbortController). Keep strategies clean.

## Next Steps
- Phase 4: MVP Services

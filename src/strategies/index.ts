import type { DeliveryStrategy, StrategyName } from './types.js';
import { DirectStrategy } from './direct-strategy.js';
import { FallbackStrategy } from './fallback-strategy.js';
import { BroadcastStrategy } from './broadcast-strategy.js';
import { RoundRobinStrategy } from './round-robin-strategy.js';

export type { DeliveryStrategy, StrategyName } from './types.js';

export function createStrategy(name: StrategyName): DeliveryStrategy {
  switch (name) {
    case 'direct': return new DirectStrategy();
    case 'fallback': return new FallbackStrategy();
    case 'broadcast': return new BroadcastStrategy();
    case 'round-robin': return new RoundRobinStrategy();
  }
}

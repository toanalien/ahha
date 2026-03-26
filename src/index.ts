// shoutrrr - Notification library for Node.js
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

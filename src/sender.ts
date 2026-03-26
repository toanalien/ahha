import { Router } from './core/router.js';
import type { SendResult, Params } from './core/types.js';
import type { StrategyName } from './strategies/types.js';

export interface SenderOptions {
  strategy?: StrategyName;
}

/**
 * Reusable sender for multiple service URLs.
 *
 * @example
 * const sender = new Sender(['slack://...', 'discord://...']);
 * await sender.send('Hello!');
 */
export class Sender {
  private router: Router;

  constructor(urls: string[], options?: SenderOptions) {
    this.router = new Router(urls, {
      strategy: options?.strategy ?? 'broadcast',
    });
  }

  async send(message: string, params?: Params): Promise<SendResult[]> {
    return this.router.send(message, params);
  }
}

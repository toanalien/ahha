import type { Service, SendResult, Params } from './types.js';
import { parseUrl } from './url-parser.js';
import { getService } from './service-registry.js';
import { ServiceNotFoundError } from './errors.js';
import { createStrategy } from '../strategies/index.js';
import type { StrategyName } from '../strategies/types.js';

export interface RouterOptions {
  strategy?: StrategyName;
}

/**
 * Router resolves URLs to services and delegates sending to a strategy.
 */
export class Router {
  private services: Service[] = [];
  private strategy;

  constructor(urls: string[], options?: RouterOptions) {
    this.strategy = createStrategy(options?.strategy ?? 'broadcast');

    for (const url of urls) {
      const parsed = parseUrl(url);
      const def = getService(parsed.scheme);
      if (!def) {
        throw new ServiceNotFoundError(parsed.scheme);
      }
      this.services.push(def.create(parsed));
    }
  }

  async send(message: string, params?: Params): Promise<SendResult[]> {
    return this.strategy.execute(this.services, message, params);
  }
}

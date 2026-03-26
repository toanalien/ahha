import type { Service, SendResult, Params } from '../core/types.js';
import type { DeliveryStrategy } from './types.js';

/** Send via the first (and typically only) service */
export class DirectStrategy implements DeliveryStrategy {
  readonly name = 'direct';

  async execute(
    services: Service[],
    message: string,
    params?: Params,
  ): Promise<SendResult[]> {
    if (services.length === 0) {
      return [{
        success: false,
        service: 'direct',
        timestamp: new Date(),
        error: new Error('No services configured'),
      }];
    }
    const result = await services[0].send(message, params);
    return [result];
  }
}

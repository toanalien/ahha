import type { Service, SendResult, Params } from '../core/types.js';
import type { DeliveryStrategy } from './types.js';

/** Send to all services concurrently, return all results */
export class BroadcastStrategy implements DeliveryStrategy {
  readonly name = 'broadcast';

  async execute(
    services: Service[],
    message: string,
    params?: Params,
  ): Promise<SendResult[]> {
    const settled = await Promise.allSettled(
      services.map(s => s.send(message, params)),
    );

    return settled.map(result => {
      if (result.status === 'fulfilled') return result.value;
      return {
        success: false,
        service: 'unknown',
        timestamp: new Date(),
        error: result.reason instanceof Error
          ? result.reason
          : new Error(String(result.reason)),
      };
    });
  }
}

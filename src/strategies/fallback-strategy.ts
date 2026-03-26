import type { Service, SendResult, Params } from '../core/types.js';
import type { DeliveryStrategy } from './types.js';

/** Try services in order, stop on first success */
export class FallbackStrategy implements DeliveryStrategy {
  readonly name = 'fallback';

  async execute(
    services: Service[],
    message: string,
    params?: Params,
  ): Promise<SendResult[]> {
    const errors: SendResult[] = [];

    for (const service of services) {
      try {
        const result = await service.send(message, params);
        if (result.success) return [result];
        errors.push(result);
      } catch (err) {
        errors.push({
          success: false,
          service: 'unknown',
          timestamp: new Date(),
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }

    return errors;
  }
}

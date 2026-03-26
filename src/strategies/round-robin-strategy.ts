import type { Service, SendResult, Params } from '../core/types.js';
import type { DeliveryStrategy } from './types.js';

/** Rotate through services across calls. On failure, try next. */
export class RoundRobinStrategy implements DeliveryStrategy {
  readonly name = 'round-robin';
  private currentIndex = 0;

  async execute(
    services: Service[],
    message: string,
    params?: Params,
  ): Promise<SendResult[]> {
    if (services.length === 0) {
      return [{
        success: false,
        service: 'round-robin',
        timestamp: new Date(),
        error: new Error('No services configured'),
      }];
    }

    const errors: SendResult[] = [];

    for (let i = 0; i < services.length; i++) {
      const index = (this.currentIndex + i) % services.length;
      try {
        const result = await services[index].send(message, params);
        if (result.success) {
          this.currentIndex = (index + 1) % services.length;
          return [result];
        }
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

    this.currentIndex = (this.currentIndex + 1) % services.length;
    return errors;
  }
}

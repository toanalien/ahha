import type { Service, SendResult, Params } from '../core/types.js';

export type StrategyName = 'direct' | 'fallback' | 'broadcast' | 'round-robin';

export interface DeliveryStrategy {
  readonly name: string;
  execute(
    services: Service[],
    message: string,
    params?: Params,
  ): Promise<SendResult[]>;
}

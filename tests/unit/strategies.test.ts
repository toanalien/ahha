import { describe, it, expect, vi } from 'vitest';
import type { Service, SendResult } from '../../src/core/types.js';
import { DirectStrategy } from '../../src/strategies/direct-strategy.js';
import { FallbackStrategy } from '../../src/strategies/fallback-strategy.js';
import { BroadcastStrategy } from '../../src/strategies/broadcast-strategy.js';
import { RoundRobinStrategy } from '../../src/strategies/round-robin-strategy.js';

function mockService(name: string, success: boolean): Service {
  return {
    send: vi.fn(async (): Promise<SendResult> => ({
      success,
      service: name,
      timestamp: new Date(),
      error: success ? undefined : new Error(`${name} failed`),
    })),
  };
}

describe('DirectStrategy', () => {
  it('sends via first service', async () => {
    const s = mockService('a', true);
    const result = await new DirectStrategy().execute([s], 'hello');
    expect(result).toHaveLength(1);
    expect(result[0].success).toBe(true);
    expect(s.send).toHaveBeenCalledWith('hello', undefined);
  });

  it('returns error for no services', async () => {
    const result = await new DirectStrategy().execute([], 'hello');
    expect(result[0].success).toBe(false);
  });
});

describe('FallbackStrategy', () => {
  it('returns first success', async () => {
    const a = mockService('a', false);
    const b = mockService('b', true);
    const c = mockService('c', true);
    const result = await new FallbackStrategy().execute([a, b, c], 'hello');
    expect(result).toHaveLength(1);
    expect(result[0].service).toBe('b');
    expect(c.send).not.toHaveBeenCalled();
  });

  it('returns all errors if all fail', async () => {
    const a = mockService('a', false);
    const b = mockService('b', false);
    const result = await new FallbackStrategy().execute([a, b], 'hello');
    expect(result).toHaveLength(2);
    expect(result.every(r => !r.success)).toBe(true);
  });
});

describe('BroadcastStrategy', () => {
  it('sends to all services concurrently', async () => {
    const a = mockService('a', true);
    const b = mockService('b', true);
    const result = await new BroadcastStrategy().execute([a, b], 'hello');
    expect(result).toHaveLength(2);
    expect(result.every(r => r.success)).toBe(true);
  });

  it('handles mixed results', async () => {
    const a = mockService('a', true);
    const b = mockService('b', false);
    const result = await new BroadcastStrategy().execute([a, b], 'hello');
    expect(result).toHaveLength(2);
    expect(result[0].success).toBe(true);
    expect(result[1].success).toBe(false);
  });

  it('handles exceptions', async () => {
    const throwing: Service = {
      send: vi.fn(async () => { throw new Error('boom'); }),
    };
    const result = await new BroadcastStrategy().execute([throwing], 'hello');
    expect(result[0].success).toBe(false);
    expect(result[0].error?.message).toBe('boom');
  });
});

describe('RoundRobinStrategy', () => {
  it('rotates through services', async () => {
    const a = mockService('a', true);
    const b = mockService('b', true);
    const strategy = new RoundRobinStrategy();

    const r1 = await strategy.execute([a, b], 'msg1');
    expect(r1[0].service).toBe('a');

    const r2 = await strategy.execute([a, b], 'msg2');
    expect(r2[0].service).toBe('b');

    const r3 = await strategy.execute([a, b], 'msg3');
    expect(r3[0].service).toBe('a');
  });

  it('falls back to next on failure', async () => {
    const a = mockService('a', false);
    const b = mockService('b', true);
    const strategy = new RoundRobinStrategy();

    const result = await strategy.execute([a, b], 'msg');
    expect(result[0].service).toBe('b');
  });
});

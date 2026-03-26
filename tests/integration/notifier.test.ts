import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally for integration tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('send() one-liner', () => {
  it('sends a notification via single URL', async () => {
    const { send } = await import('../../src/index.js');
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await send('ntfy://test-topic@ntfy.sh', 'Hello!');
    expect(result.success).toBe(true);
    expect(result.service).toBe('ntfy');
  });
});

describe('createSender()', () => {
  it('creates sender and broadcasts to multiple services', async () => {
    const { createSender } = await import('../../src/index.js');
    mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));

    const sender = createSender([
      'ntfy://topic1@ntfy.sh',
      'ntfy://topic2@ntfy.sh',
    ]);
    const results = await sender.send('Broadcast test');

    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('supports fallback strategy', async () => {
    const { createSender } = await import('../../src/index.js');
    // First fails, second succeeds
    mockFetch
      .mockResolvedValueOnce(new Response('error', { status: 500 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const sender = createSender([
      'ntfy://topic1@ntfy.sh',
      'ntfy://topic2@ntfy.sh',
    ], { strategy: 'fallback' });
    const results = await sender.send('Fallback test');

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });
});

describe('custom service registration', () => {
  it('allows registering custom services', async () => {
    const { registerService, send } = await import('../../src/index.js');

    registerService({
      scheme: 'test-custom',
      create: () => ({
        send: async (message) => ({
          success: true,
          service: 'test-custom',
          timestamp: new Date(),
        }),
      }),
    });

    const result = await send('test-custom://whatever', 'Hello custom!');
    expect(result.success).toBe(true);
    expect(result.service).toBe('test-custom');
  });
});

describe('error handling', () => {
  it('throws ServiceNotFoundError for unknown scheme', async () => {
    const { send } = await import('../../src/index.js');
    await expect(send('unknown://foo', 'msg')).rejects.toThrow('Service not found');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ParsedUrl } from '../../src/core/types.js';
import { parseUrl } from '../../src/core/url-parser.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function okResponse(body: unknown = 'ok') {
  return new Response(JSON.stringify(body), { status: 200 });
}

function errorResponse(status = 500) {
  return new Response('error', { status });
}

describe('Slack service', () => {
  it('sends via webhook', async () => {
    const { default: slack } = await import('../../src/services/slack-service.js');
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const config = parseUrl('slack://hook:T00/B00/XXX@webhook');
    const service = slack.create(config);
    const result = await service.send('Hello Slack');

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('hooks.slack.com');
    expect(opts.method).toBe('POST');
  });

  it('sends via bot API', async () => {
    const { default: slack } = await import('../../src/services/slack-service.js');
    mockFetch.mockResolvedValueOnce(okResponse({ ok: true }));

    const config = parseUrl('slack://xoxb:my-token@C12345678');
    const service = slack.create(config);
    const result = await service.send('Hello Bot');

    expect(result.success).toBe(true);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('slack.com/api/chat.postMessage');
    expect(opts.headers.Authorization).toBe('Bearer my-token');
  });
});

describe('Discord service', () => {
  it('sends via webhook', async () => {
    const { default: discord } = await import('../../src/services/discord-service.js');
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const config = parseUrl('discord://mytoken@123456789');
    const service = discord.create(config);
    const result = await service.send('Hello Discord');

    expect(result.success).toBe(true);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('discord.com/api/webhooks/123456789/');
  });

  it('handles HTTP errors', async () => {
    const { default: discord } = await import('../../src/services/discord-service.js');
    mockFetch.mockResolvedValueOnce(errorResponse(401));

    const config = parseUrl('discord://bad@123');
    const service = discord.create(config);
    const result = await service.send('fail');

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('401');
  });
});

describe('Telegram service', () => {
  it('sends to chat', async () => {
    const { default: telegram } = await import('../../src/services/telegram-service.js');
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const config = parseUrl('telegram://123456:ABC@telegram?chats=-100123&parsemode=HTML');
    const service = telegram.create(config);
    const result = await service.send('Hello Telegram');

    expect(result.success).toBe(true);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('api.telegram.org/bot123456:ABC/sendMessage');
    const body = JSON.parse(opts.body);
    expect(body.parse_mode).toBe('HTML');
    expect(body.chat_id).toBe('-100123');
  });

  it('fails when no chats specified', async () => {
    const { default: telegram } = await import('../../src/services/telegram-service.js');
    const config = parseUrl('telegram://token@telegram');
    const service = telegram.create(config);
    const result = await service.send('no chats');

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('No chat IDs');
  });
});

describe('Webhook (generic) service', () => {
  it('sends raw text', async () => {
    const { default: webhook } = await import('../../src/services/webhook-service.js');
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const config = parseUrl('generic+https://example.com/webhook');
    const service = webhook.create(config);
    const result = await service.send('Hello Webhook');

    expect(result.success).toBe(true);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('example.com/webhook');
    expect(opts.headers['Content-Type']).toBe('text/plain');
    expect(opts.body).toBe('Hello Webhook');
  });

  it('sends JSON template', async () => {
    const { default: webhook } = await import('../../src/services/webhook-service.js');
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const config = parseUrl('generic+https://example.com/api?template=json');
    const service = webhook.create(config);
    const result = await service.send('test', { title: 'Alert' });

    expect(result.success).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message).toBe('test');
    expect(body.title).toBe('Alert');
  });
});

describe('Ntfy service', () => {
  it('sends to ntfy.sh by default', async () => {
    const { default: ntfy } = await import('../../src/services/ntfy-service.js');
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const config = parseUrl('ntfy://alerts@ntfy.sh');
    const service = ntfy.create(config);
    const result = await service.send('Hello Ntfy');

    expect(result.success).toBe(true);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('ntfy.sh/alerts');
  });

  it('sets ntfy headers from params', async () => {
    const { default: ntfy } = await import('../../src/services/ntfy-service.js');
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const config = parseUrl('ntfy://topic@ntfy.sh');
    const service = ntfy.create(config);
    await service.send('msg', { title: 'Test', priority: '5', tags: 'warning' });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Title).toBe('Test');
    expect(headers.Priority).toBe('5');
    expect(headers.Tags).toBe('warning');
  });
});

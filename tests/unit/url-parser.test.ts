import { describe, it, expect } from 'vitest';
import { parseUrl } from '../../src/core/url-parser.js';

describe('parseUrl', () => {
  it('parses slack bot URL', () => {
    const result = parseUrl('slack://xoxb:my-token@C12345678');
    expect(result.scheme).toBe('slack');
    expect(result.user).toBe('xoxb');
    expect(result.password).toBe('my-token');
    expect(result.host).toBe('C12345678');
  });

  it('parses slack webhook URL', () => {
    const result = parseUrl('slack://hook:T00/B00/XXX@webhook');
    expect(result.scheme).toBe('slack');
    expect(result.user).toBe('hook');
    expect(result.password).toBe('T00/B00/XXX');
    expect(result.host).toBe('webhook');
  });

  it('parses discord URL', () => {
    const result = parseUrl('discord://abcdef@123456789');
    expect(result.scheme).toBe('discord');
    expect(result.user).toBe('abcdef');
    expect(result.host).toBe('123456789');
  });

  it('parses telegram URL with query params', () => {
    const result = parseUrl('telegram://123456:ABC-DEF@telegram?chats=-100123&parsemode=HTML');
    expect(result.scheme).toBe('telegram');
    expect(result.user).toBe('123456');
    expect(result.password).toBe('ABC-DEF');
    expect(result.query.chats).toBe('-100123');
    expect(result.query.parsemode).toBe('HTML');
  });

  it('parses smtp URL', () => {
    const result = parseUrl('smtp://user:pass@smtp.gmail.com:587?to=me@example.com');
    expect(result.scheme).toBe('smtp');
    expect(result.user).toBe('user');
    expect(result.password).toBe('pass');
    expect(result.host).toBe('smtp.gmail.com');
    expect(result.port).toBe(587);
    expect(result.query.to).toBe('me@example.com');
  });

  it('parses generic+https URL', () => {
    const result = parseUrl('generic+https://example.com/webhook');
    expect(result.scheme).toBe('generic+https');
    expect(result.host).toBe('example.com');
    expect(result.path).toEqual(['webhook']);
  });

  it('parses ntfy URL with host', () => {
    const result = parseUrl('ntfy://alerts@ntfy.sh');
    expect(result.scheme).toBe('ntfy');
    expect(result.user).toBe('alerts');
    expect(result.host).toBe('ntfy.sh');
  });

  it('parses ntfy URL without host', () => {
    const result = parseUrl('ntfy://my-topic');
    expect(result.scheme).toBe('ntfy');
    expect(result.host).toBe('my-topic');
  });

  it('preserves raw URL', () => {
    const raw = 'slack://xoxb:token@channel';
    const result = parseUrl(raw);
    expect(result.raw).toBe(raw);
  });

  it('parses path segments', () => {
    const result = parseUrl('generic+https://example.com/api/v1/notify');
    expect(result.path).toEqual(['api', 'v1', 'notify']);
  });

  it('throws on missing scheme', () => {
    expect(() => parseUrl('no-scheme')).toThrow('Invalid URL');
  });

  it('throws on missing scheme', () => {
    expect(() => parseUrl('just-a-string-no-scheme')).toThrow('Invalid URL');
  });

  it('handles URL-encoded credentials', () => {
    const result = parseUrl('smtp://user%40domain:p%40ss@host');
    expect(result.user).toBe('user@domain');
    expect(result.password).toBe('p@ss');
  });
});

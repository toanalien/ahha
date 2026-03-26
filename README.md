# ahha

Notification library for Node.js. Send messages to Slack, Discord, Telegram, Email, and more through URL-based configuration.

Inspired by [Shoutrrr](https://github.com/containrrr/shoutrrr) (Go) and [Apprise](https://github.com/caronc/apprise) (Python).

## Features

- **URL-based configuration** -- configure services with a single URL string
- **TypeScript-first** -- full type safety and IntelliSense
- **Zero runtime dependencies** -- uses native `fetch` and Node.js built-ins
- **6 built-in services** -- Slack, Discord, Telegram, Email (SMTP), Webhook, Ntfy
- **4 delivery strategies** -- direct, fallback, broadcast, round-robin
- **Extensible** -- register custom services with `registerService()`
- **Dual output** -- ESM + CommonJS

## Install

```bash
npm install ahha
```

Requires Node.js 18+.

## Quick Start

```typescript
import { send, createSender } from 'ahha';

// One-liner: send via a single service
await send('ntfy://my-alerts@ntfy.sh', 'Deployment complete!');

// Multi-service sender with broadcast (default)
const sender = createSender([
  'slack://xoxb:token@C12345678',
  'discord://webhooktoken@webhookid',
  'telegram://123456:ABCDEF@telegram?chats=-100123',
]);
await sender.send('Server is up!');

// Fallback strategy: try services in order until one succeeds
const fallback = createSender([
  'slack://xoxb:token@channel',
  'ntfy://backup-topic@ntfy.sh',
], { strategy: 'fallback' });
await fallback.send('Alert!');
```

## Supported Services

| Service | URL Format | Example |
|---------|-----------|---------|
| **Slack** (webhook) | `slack://hook:TOKEN@webhook` | `slack://hook:T00/B00/XXX@webhook` |
| **Slack** (bot) | `slack://xoxb:TOKEN@CHANNEL` | `slack://xoxb:xoxb-123@C12345678` |
| **Discord** | `discord://TOKEN@WEBHOOK_ID` | `discord://abcdef@123456789` |
| **Telegram** | `telegram://TOKEN@telegram?chats=ID` | `telegram://123:ABC@telegram?chats=-100` |
| **Email** | `smtp://USER:PASS@HOST:PORT?to=ADDR` | `smtp://user:pass@smtp.gmail.com:465?to=me@x.com` |
| **Webhook** | `generic+https://HOST/PATH` | `generic+https://example.com/webhook` |
| **Ntfy** | `ntfy://TOPIC[@HOST]` | `ntfy://alerts@ntfy.sh` |

## Delivery Strategies

| Strategy | Behavior |
|----------|----------|
| `broadcast` (default) | Send to all services concurrently |
| `fallback` | Try services in order, stop on first success |
| `round-robin` | Rotate through services across calls |
| `direct` | Send via first service only |

```typescript
const sender = createSender(urls, { strategy: 'fallback' });
```

## Service Details

### Slack

```typescript
// Webhook
await send('slack://hook:T00000/B00000/XXXXXXX@webhook', 'Hello!');

// Bot API
await send('slack://xoxb:xoxb-your-token@C12345678', 'Hello!');
```

### Discord

```typescript
await send('discord://webhook-token@webhook-id', 'Hello Discord!');
```

### Telegram

```typescript
// Multiple chats, HTML parse mode
await send(
  'telegram://123456:ABC-DEF@telegram?chats=-100123,-100456&parsemode=HTML',
  '<b>Bold alert!</b>'
);
```

### Email (SMTP)

```typescript
// TLS on port 465
await send(
  'smtp://user:password@smtp.gmail.com:465?to=recipient@example.com&subject=Alert',
  'Email body here'
);
```

### Generic Webhook

```typescript
// JSON template with custom headers
await send(
  'generic+https://api.example.com/notify?template=json&@Authorization=Bearer%20token',
  'Hello webhook!',
  { title: 'Alert' }
);

// Raw text
await send('generic+https://example.com/hook', 'plain text body');
```

### Ntfy

```typescript
// Public ntfy.sh
await send('ntfy://my-topic', 'Hello!', {
  title: 'Server Alert',
  priority: '5',
  tags: 'warning,server',
});

// Self-hosted
await send('ntfy://my-topic@ntfy.example.com', 'Hello!');
```

## Custom Services

```typescript
import { registerService, send } from 'ahha';

registerService({
  scheme: 'my-service',
  create(config) {
    return {
      async send(message, params) {
        // Your notification logic here
        await fetch(`https://my-api.com/notify`, {
          method: 'POST',
          body: JSON.stringify({ text: message }),
        });
        return { success: true, service: 'my-service', timestamp: new Date() };
      },
    };
  },
});

await send('my-service://config', 'Hello custom!');
```

## API Reference

### `send(url, message, params?)`

Send a notification via a single service URL. Returns `Promise<SendResult>`.

### `createSender(urls, options?)`

Create a reusable sender for multiple URLs. Returns `Sender`.

Options:
- `strategy`: `'broadcast'` | `'fallback'` | `'round-robin'` | `'direct'` (default: `'broadcast'`)

### `Sender.send(message, params?)`

Send via all configured services. Returns `Promise<SendResult[]>`.

### `registerService(definition)`

Register a custom service. `definition` must have `scheme` and `create(config)`.

### `listServices()`

Returns array of registered service scheme names.

### `parseUrl(url)`

Parse a notification URL into components. Returns `ParsedUrl`.

### Types

```typescript
interface SendResult {
  success: boolean;
  service: string;
  timestamp: Date;
  error?: Error;
}

type Params = Record<string, string>;
```

## License

MIT

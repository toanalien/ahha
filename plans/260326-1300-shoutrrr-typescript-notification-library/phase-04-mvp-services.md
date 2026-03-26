# Phase 4: MVP Services (6)

## Context Links
- [Plan Overview](./plan.md)
- [Shoutrrr Research](../reports/shoutrrr-research-report.md)
- [Phase 2: Core Infrastructure](./phase-02-core-infrastructure.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 6h (~1h per service)
- **Description:** Implement 6 MVP notification services: Slack, Discord, Telegram, Email (SMTP), Webhook (Generic), Ntfy.

## Key Insights
- Each service is a ServiceDefinition with `scheme` + `create()` factory
- Service instances implement `Service.send(message, params)`
- All HTTP services use native `fetch()`
- Email (SMTP) needs raw TCP socket via `net`/`tls` modules (Node built-in) -- no nodemailer
- Each service extracts its config from ParsedUrl (scheme-specific URL format)
- Shoutrrr URL formats are the reference for compatibility

## Requirements

### Functional
- 6 services, each registered via service registry on import
- Each service parses its own URL format
- Each service sends via HTTP fetch or SMTP socket
- Returns SendResult with success/error

### Non-functional
- Zero runtime dependencies (native fetch, native net/tls)
- Each service file < 150 lines
- Timeout: 10s default per request (AbortController)

## Architecture

### Service File Pattern

Each service file exports a ServiceDefinition and auto-registers:

```typescript
// src/services/slack-service.ts
import { registerService } from '../core/service-registry.js';
import type { ServiceDefinition, Service, ParsedUrl, SendResult, Params } from '../core/types.js';

const slackService: ServiceDefinition = {
  scheme: 'slack',
  create(config: ParsedUrl): Service {
    // Extract token, channel from config
    return { send: async (message, params) => { ... } };
  },
};

registerService(slackService);
export default slackService;
```

### URL Formats (Shoutrrr-compatible)

| Service | URL Format | Example |
|---------|-----------|---------|
| Slack (webhook) | `slack://hook:TOKEN@webhook` | `slack://hook:T00000000/B00000000/XXXXXXX@webhook` |
| Slack (bot) | `slack://xoxb:TOKEN@CHANNEL` | `slack://xoxb:xoxb-123-456@C12345678` |
| Discord | `discord://TOKEN@WEBHOOK_ID` | `discord://abcdef@123456789` |
| Telegram | `telegram://TOKEN@telegram?chats=CHAT_ID` | `telegram://123456:ABC-DEF@telegram?chats=-100123` |
| Email | `smtp://USER:PASS@HOST:PORT?to=ADDR` | `smtp://user:pass@smtp.gmail.com:587?to=me@example.com` |
| Webhook | `generic+https://HOST/PATH` | `generic+https://example.com/webhook?@Auth=Bearer%20x` |
| Ntfy | `ntfy://TOPIC@HOST` or `ntfy://TOPIC` | `ntfy://alerts@ntfy.sh` or `ntfy://alerts` |

## Related Code Files

### Files to Create
- `src/services/slack-service.ts`
- `src/services/discord-service.ts`
- `src/services/telegram-service.ts`
- `src/services/email-service.ts`
- `src/services/webhook-service.ts`
- `src/services/ntfy-service.ts`
- `src/services/index.ts` -- imports all services (triggers registration)

## Implementation Steps

### Step 1: Slack Service (`src/services/slack-service.ts`)

**URL parsing:**
- `slack://hook:WEBHOOK_TOKEN@webhook` -> Webhook URL mode
- `slack://xoxb:BOT_TOKEN@CHANNEL_ID` -> Bot API mode
- Params: `color`, `title`, `icon`, `username`

**Webhook mode:**
```typescript
POST https://hooks.slack.com/services/{token}
Content-Type: application/json
{ "text": message }
```

**Bot API mode:**
```typescript
POST https://slack.com/api/chat.postMessage
Authorization: Bearer {token}
{ "channel": channelId, "text": message }
```

### Step 2: Discord Service (`src/services/discord-service.ts`)

**URL:** `discord://TOKEN@WEBHOOK_ID`
- Token from password field, webhook ID from host

**API call:**
```typescript
POST https://discord.com/api/webhooks/{webhookId}/{token}
Content-Type: application/json
{ "content": message }
```

Params: `username`, `avatar_url`

### Step 3: Telegram Service (`src/services/telegram-service.ts`)

**URL:** `telegram://BOT_TOKEN@telegram?chats=CHAT_ID&parsemode=HTML`
- Bot token from user:password (combined)
- Chat IDs from `chats` query param (comma-separated for multiple)

**API call:**
```typescript
POST https://api.telegram.org/bot{token}/sendMessage
Content-Type: application/json
{ "chat_id": chatId, "text": message, "parse_mode": parseMode }
```

Params: `parsemode` (None|Markdown|HTML|MarkdownV2), `preview` (yes|no), `notification` (yes|no)

### Step 4: Email/SMTP Service (`src/services/email-service.ts`)

**URL:** `smtp://USER:PASS@HOST:PORT?from=sender@x.com&to=recipient@x.com&subject=Alert`

**Implementation approach -- Minimal SMTP client using Node `net`/`tls`:**

This is the most complex service. Implement bare-minimum SMTP:
1. Connect via TCP (port 25/587) or TLS (port 465)
2. EHLO handshake
3. STARTTLS upgrade if port 587
4. AUTH LOGIN (base64 user/pass)
5. MAIL FROM, RCPT TO, DATA, message body, QUIT

Keep it simple: plain text emails only for MVP. No MIME attachments.

**Alternative consideration:** If raw SMTP is too complex for MVP (~150 lines), implement as a "send via HTTP email API" placeholder and document that SMTP is coming. But raw SMTP with net/tls is achievable in ~120 lines.

### Step 5: Generic Webhook Service (`src/services/webhook-service.ts`)

**URL:** `generic+https://example.com/path?@Header=value&$field=value&template=json`

**Parsing:**
- Scheme: `generic` with sub-protocol (`https` or `http`)
- `@` prefixed params -> HTTP headers
- `$` prefixed params -> extra JSON body fields
- `template` param -> `json` or `raw` (default: raw = plain text body)

**JSON template mode:**
```typescript
POST {url}
Content-Type: application/json
{ "message": message, "title": params.title, ...extraFields }
```

**Raw mode:**
```typescript
POST {url}
Content-Type: text/plain
{message}
```

### Step 6: Ntfy Service (`src/services/ntfy-service.ts`)

**URL:** `ntfy://TOPIC` (uses ntfy.sh) or `ntfy://TOPIC@HOST` (self-hosted)

**API call:**
```typescript
POST https://{host}/{topic}
Content-Type: text/plain
{message}
```

Headers from params: `Title`, `Priority`, `Tags`, `Click`, `Attach`, `Actions`

Simplest service -- Ntfy's API is just a POST with headers.

### Step 7: Service Barrel (`src/services/index.ts`)

Import all service files to trigger auto-registration:
```typescript
import './slack-service.js';
import './discord-service.js';
import './telegram-service.js';
import './email-service.ts';
import './webhook-service.js';
import './ntfy-service.js';
```

## Todo List

- [ ] Implement Slack service (webhook + bot modes)
- [ ] Implement Discord service
- [ ] Implement Telegram service
- [ ] Implement Email/SMTP service
- [ ] Implement Generic Webhook service
- [ ] Implement Ntfy service
- [ ] Create services barrel export
- [ ] Unit test each service with mocked fetch (use Vitest vi.fn())
- [ ] Test URL parsing for each service
- [ ] Verify all services registered in registry
- [ ] Verify build

## Success Criteria
- All 6 services registered and discoverable via registry
- Each service correctly parses its URL format
- Each service constructs correct HTTP request (verified via mocked fetch)
- SMTP service can construct valid SMTP conversation
- Build succeeds with zero runtime deps

## Risk Assessment
- **SMTP implementation without nodemailer**: Highest risk. Raw SMTP is fiddly (STARTTLS, AUTH). Mitigation: implement basic SMTP (port 465 TLS only for MVP), skip STARTTLS upgrade initially. Test against real SMTP server in integration tests.
- **Fetch mocking in Vitest**: Use `vi.stubGlobal('fetch', mockFn)`. Well-supported.
- **URL format deviations from Shoutrrr**: Some Shoutrrr URLs are Go-specific. Document any deviations.

## Security Considerations
- Never log tokens/passwords from parsed URLs
- SMTP credentials sent over TLS only (no plain TCP auth)
- Webhook service: warn users about sending tokens in URL query params

## Next Steps
- Phase 5: Public API & Bundling

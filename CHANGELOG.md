# Changelog

## 0.1.0 (2026-03-26)

### Features

- **URL-based configuration** -- configure notification services with a single URL string
- **6 built-in services**: Slack (webhook + bot API), Discord, Telegram, Email (SMTP/TLS), Generic Webhook, Ntfy
- **4 delivery strategies**: broadcast (default), fallback, round-robin, direct
- **`send()` one-liner** -- send a notification in one function call
- **`createSender()` multi-service** -- reusable sender with strategy support
- **Custom service registration** via `registerService()`
- **Zero runtime dependencies** -- uses native `fetch` and Node.js built-ins
- **TypeScript-first** with full type exports
- **Dual ESM + CJS output** with `.d.ts` declarations

### Services

| Service | URL Format |
|---------|-----------|
| Slack (webhook) | `slack://hook:TOKEN@webhook` |
| Slack (bot) | `slack://xoxb:TOKEN@CHANNEL` |
| Discord | `discord://TOKEN@WEBHOOK_ID` |
| Telegram | `telegram://TOKEN@telegram?chats=CHAT_ID` |
| Email (SMTP) | `smtp://USER:PASS@HOST:465?to=ADDR` |
| Webhook | `generic+https://HOST/PATH` |
| Ntfy | `ntfy://TOPIC[@HOST]` |

### Security

- SMTP header injection prevention (CRLF sanitization)
- SMTP auth requires TLS (port 465 only)
- RFC 5321 dot-stuffing in email body
- URL credential masking in error messages

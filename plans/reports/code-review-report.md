---
title: "Code Review Report - Shoutrrr TypeScript Library"
date: 2026-03-26
reviewer: code-reviewer
status: complete
---

# Code Review Report - Shoutrrr TypeScript Library

## Scope

- **Files reviewed:** 21 source files, 5 test files (26 total)
- **LOC:** ~1,013 source lines
- **Focus:** Full codebase review -- security, edge cases, type safety, API ergonomics, test coverage
- **Build:** TypeScript compiles cleanly, all 41 tests pass

## Overall Assessment

Well-structured, clean library with good separation of concerns. The URL parser, service registry, strategy pattern, and router compose nicely. Zero runtime dependencies is a strong selling point. Several security and robustness issues need addressing before production use.

---

## Critical Issues

### C1. SMTP Header Injection

**File:** `/Users/toanalien/Documents/git/ahha/src/services/email-service.ts` lines 90-91, 97-107

The `from`, `to`, and `subject` fields are interpolated directly into SMTP commands and email headers with no sanitization. An attacker who controls these values can inject arbitrary SMTP commands or email headers.

```typescript
// Current -- vulnerable
send(`MAIL FROM:<${opts.from}>`);
send(`RCPT TO:<${opts.to}>`);
`Subject: ${opts.subject}`,
```

**Fix:** Validate that `from`/`to` match a basic email regex and reject or strip `\r\n` from all header values. Reject subjects containing CRLF sequences.

### C2. SMTP STARTTLS Sends Credentials in Plaintext

**File:** `/Users/toanalien/Documents/git/ahha/src/services/email-service.ts` lines 75-79

On port 587, STARTTLS is initiated but TLS upgrade is not implemented. The code then proceeds to send AUTH LOGIN credentials in plaintext over the unencrypted connection.

```typescript
if (!useTls && opts.port === 587) {
  send('STARTTLS');
  await expect(220);
  // Upgrade to TLS not implemented for MVP -- use port 465 for TLS
}
// AUTH LOGIN follows in cleartext
```

**Fix:** Either (a) implement the TLS upgrade via `tls.connect({ socket })` after STARTTLS, or (b) refuse to send AUTH on port 587 and throw an error telling users to use port 465. Current behavior silently leaks credentials.

### C3. Raw URL Stored in ParsedUrl Leaks Credentials

**File:** `/Users/toanalien/Documents/git/ahha/src/core/url-parser.ts` line 92

The `raw` field stores the full URL including plaintext credentials. If `ParsedUrl` objects are logged, serialized, or included in error messages downstream, credentials are exposed.

**Fix:** Either remove `raw` from `ParsedUrl`, store a masked version, or document clearly that `raw` contains sensitive data and must not be logged.

---

## High Priority

### H1. Inconsistent Error Handling: Throw vs Return

**Files:** All services

Slack service throws `SendError` on API errors but returns `{ success: false }` on network errors. Discord, Telegram, Webhook, Ntfy all return `{ success: false }` on every failure. This inconsistency means callers must handle both thrown exceptions AND failed results, which is confusing.

The fallback/round-robin strategies do catch thrown errors (via try/catch), but the contract is unclear.

**Fix:** Pick one pattern -- recommend always returning `{ success: false }` from services and never throwing. Reserve throwing for configuration errors (invalid URL, missing service). Update Slack service lines 44-46 to return instead of throw.

### H2. SMTP `expect()` Race Condition / Multi-line Response Bug

**File:** `/Users/toanalien/Documents/git/ahha/src/services/email-service.ts` lines 56-68

The `expect()` function registers a **single** `'data'` event handler via `socket.once('data', ...)`. If the server sends a multi-line EHLO response (which all real SMTP servers do -- `250-` continuation lines), only the first chunk is read. Subsequent `expect()` calls will hang because the continuation data arrived in the first chunk but was partially consumed.

Additionally, there's a race: `check()` is called after registering the listener, but data may have already arrived in `buffer` from a previous chunk. The `once` listener will fire on *new* data and miss what's already buffered.

**Fix:** Use a persistent `'data'` listener pattern that accumulates into a shared buffer, and have `expect()` resolve by polling the buffer. Consider using a readline-style approach.

### H3. SMTP Socket Timeout Never Cleaned Up

**File:** `/Users/toanalien/Documents/git/ahha/src/services/email-service.ts` line 49

`socket.setTimeout(timeout)` is set but no `'timeout'` event handler is registered. The timeout event does not automatically destroy the socket in Node.js -- it just emits the event. Without a handler, the socket hangs indefinitely on timeout.

**Fix:** Add `socket.on('timeout', () => { socket.destroy(new Error('SMTP timeout')); });`

### H4. No Input Validation on Service URL Components

**Files:** All services

Services trust URL-parsed values without validation:
- Discord: `webhookId` and `token` could be empty strings, resulting in `fetch('https://discord.com/api/webhooks//')`
- Slack: empty `token` sends to `https://hooks.slack.com/services/`
- Telegram: empty `token` sends to `https://api.telegram.org/bot/sendMessage`

**Fix:** Validate required fields during `create()` and throw descriptive errors early, at config time rather than at send time.

### H5. Webhook Service Scheme Parsing Fragile

**File:** `/Users/toanalien/Documents/git/ahha/src/services/webhook-service.ts` line 8

```typescript
const subProtocol = config.scheme.includes('+')
  ? config.scheme.split('+')[1]
  : 'https';
```

The URL parser lowercases the scheme, so `config.scheme` is already `generic+https`. But the `create()` method is on the `webhookService` object which is registered under scheme `'generic'`. When accessed via `generic+https`, the compound scheme registration (line 84) passes the whole `webhookService` object, meaning `config.scheme` will be `'generic+https'` -- this works. But if someone registers a URL as just `generic://...`, `subProtocol` defaults to `'https'`, building a URL like `https://host/path` regardless of whether the user intended HTTP.

**Fix:** Document this behavior or support explicit `?scheme=http` override.

---

## Medium Priority

### M1. Global Mutable Service Registry -- No Isolation

**File:** `/Users/toanalien/Documents/git/ahha/src/core/service-registry.ts`

The registry is a module-level `Map`. In test environments or applications that need isolated instances, services registered by one test bleed into others. No `clearServices()` or `createRegistry()` factory exists.

**Fix:** Either export a `clearServices()` for testing, or provide a `createRegistry()` factory for isolated instances.

### M2. No Duplicate Scheme Protection

**File:** `/Users/toanalien/Documents/git/ahha/src/core/service-registry.ts` line 7

`registerService()` silently overwrites existing schemes. A user could accidentally replace the built-in `slack` service with a custom one.

**Fix:** Add a `{ force?: boolean }` option and warn or throw on duplicate scheme by default.

### M3. Email Service Dot-Stuffing Not Implemented

**File:** `/Users/toanalien/Documents/git/ahha/src/services/email-service.ts` lines 97-107

Per RFC 5321, lines in message body starting with `.` must be escaped by prepending another `.` (dot-stuffing). Currently, a message body containing a line starting with `.` will prematurely end the DATA command.

**Fix:** Before sending the body, replace `\r\n.` with `\r\n..` in `opts.body`.

### M4. Ntfy Topic Extraction Logic Ambiguous

**File:** `/Users/toanalien/Documents/git/ahha/src/services/ntfy-service.ts` lines 8-9

```typescript
const topic = config.user ?? config.path[0] ?? '';
const host = config.host && config.host !== topic ? config.host : 'ntfy.sh';
```

For `ntfy://my-topic` (no `@`), `config.user` is undefined and `config.host` is `'my-topic'`, `config.path` is `[]`. So `topic = undefined ?? undefined ?? ''` = `''`. The topic is actually in `host`. This means `ntfy://my-topic` sends to `ntfy.sh/` (empty topic) -- will fail silently.

**Fix:** Also check `config.host` as a topic source: `const topic = config.user ?? config.host ?? config.path[0] ?? '';` and adjust host logic accordingly.

### M5. `send()` Can Return `undefined` If Router Returns Empty Array

**File:** `/Users/toanalien/Documents/git/ahha/src/index.ts` line 23

```typescript
const results = await router.send(message, params);
return results[0]; // could be undefined if results is []
```

The `direct` strategy guards against empty services, but future strategies might not. The return type claims `Promise<SendResult>` but `results[0]` could be `undefined`.

**Fix:** Add a guard: `return results[0] ?? { success: false, service: 'unknown', ... }`

### M6. Missing `Content-Length` in SMTP

The SMTP implementation doesn't include a `Content-Length` header or proper MIME boundary. While not strictly required for simple text emails, some servers may behave unexpectedly.

---

## Low Priority

### L1. Duplicate Test Name

**File:** `/Users/toanalien/Documents/git/ahha/tests/unit/url-parser.test.ts` lines 78, 82

Two tests share the name `'throws on missing scheme'`.

### L2. `vitest.config.ts` and `tsup.config.ts` Not Reviewed

These are build configs; brief glance shows they're standard. No issues.

### L3. No JSDoc on Public API Functions

`send()` and `createSender()` in `src/index.ts` have examples but the JSDoc lacks `@param` and `@returns` tags. Would improve IntelliSense experience.

### L4. `SendError.cause` Shadows Built-in `Error.cause`

**File:** `/Users/toanalien/Documents/git/ahha/src/core/errors.ts` line 28

ES2022 `Error` has a native `cause` property. Declaring `public readonly cause?: Error` shadows it and may confuse error-handling libraries that inspect `Error.cause`.

**Fix:** Use the native cause via `super(message, { cause })` instead of a custom property.

---

## Test Coverage Gaps

| Area | Covered | Missing |
|------|---------|---------|
| URL parser | Good (12 tests) | Empty URL `''`, URL with only scheme `slack://`, port-only `slack://:8080`, extremely long URLs |
| Slack | Webhook + Bot | Bot API failure (non-ok response from Slack API), network error path |
| Discord | Success + HTTP error | Network error (fetch throws) |
| Telegram | Success + no-chats | Multiple chats, mixed success/fail per chat, `Promise.allSettled` rejection path |
| Email | **None** | No tests at all (presumably hard to test without SMTP mock) |
| Webhook | Raw + JSON | Custom headers via `@`, custom fields via `$`, HTTP error response |
| Ntfy | Success + headers | Missing topic, self-hosted host, HTTP error path |
| Strategies | Good (10 tests) | Empty services for fallback/broadcast, round-robin with all failures |
| Router | Via integration | Direct router construction, invalid URL, unknown scheme |
| Sender class | Via integration | Direct Sender construction |
| Error classes | **None** | No tests for error class properties |

**Most significant gap:** Email service has zero test coverage. The SMTP implementation has multiple bugs (H2, H3, C1, C2, M3) that would be caught by even basic tests with a mock TCP server.

---

## Edge Cases Found by Scouting

1. **URL with only scheme** (`slack://`): Parser returns `host: undefined`, services proceed with empty token/channel, fail at HTTP level rather than with helpful error
2. **Password containing `@`**: Parser uses `lastIndexOf('@')` -- correctly handled
3. **Password containing `/`** (Slack webhook tokens): Correctly handled via last-`@` split before first-`/` split
4. **Concurrent round-robin calls**: `currentIndex` is mutated without synchronization. If two `execute()` calls interleave (async), both could pick the same service index before either increments. Low risk since JS is single-threaded, but `await` yields could cause surprising ordering.
5. **Empty message string**: All services accept it without validation. Some APIs (Telegram) may reject empty messages. No guard exists.
6. **Webhook URL with port**: `generic+https://example.com:8443/path` -- port extraction works correctly via regex

---

## Positive Observations

1. **Clean architecture.** Strategy pattern, service registry, and URL parser compose well with clear boundaries.
2. **Zero runtime deps.** Native fetch + Node.js built-ins only -- excellent for a library.
3. **Proper use of `Promise.allSettled`** in broadcast strategy and Telegram multi-chat -- prevents one failure from killing others.
4. **URL masking in error messages** (`maskUrl`) -- good security hygiene.
5. **Dual ESM/CJS output** with proper `exports` field in `package.json`.
6. **All files under 200 lines** -- good modularity.
7. **TypeScript strict mode** enabled with clean compilation.

---

## Recommended Actions (Prioritized)

1. **[Critical]** Fix SMTP header injection -- sanitize `from`, `to`, `subject` against CRLF
2. **[Critical]** Fix SMTP STARTTLS credential leak -- either implement TLS upgrade or refuse plaintext auth on port 587
3. **[Critical]** Mask or remove `raw` URL from `ParsedUrl`, or document the risk
4. **[High]** Rewrite SMTP `expect()` to handle multi-line responses and buffered data
5. **[High]** Add socket timeout handler in SMTP
6. **[High]** Standardize error handling: return `{ success: false }` from services, never throw
7. **[High]** Validate required fields (token, channel, webhookId) during `create()`, not `send()`
8. **[Medium]** Fix ntfy topic extraction for `ntfy://my-topic` (no `@` in URL)
9. **[Medium]** Implement SMTP dot-stuffing
10. **[Medium]** Add email service tests with mock TCP server
11. **[Medium]** Add `clearServices()` or registry isolation for testing
12. **[Low]** Fix duplicate test name, add JSDoc params, use native `Error.cause`

## Metrics

- **Type Coverage:** 100% (strict mode, no `any`)
- **Test Coverage:** ~70% estimated (email service uncovered, some error paths missing)
- **Linting Issues:** 0 (no eslint config found, but TypeScript strict passes clean)
- **Build:** Passes

## Unresolved Questions

1. Should `ParsedUrl.raw` exist at all? It is not consumed by any service. If it's for debugging, a masked version would be safer.
2. Should the library support custom fetch implementations (e.g., for proxy support or testing)? Currently hardcoded to global `fetch`.
3. Is the SMTP implementation intended for production, or is it a placeholder? The number of edge cases (dot-stuffing, multi-line responses, STARTTLS) suggests using `nodemailer` as an optional peer dependency might be more practical.

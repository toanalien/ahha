# Phase 6: Testing

## Context Links
- [Plan Overview](./plan.md)
- All previous phases

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 3h
- **Description:** Comprehensive unit and integration tests using Vitest. Mock fetch for service tests.

## Key Insights
- All HTTP services testable by mocking global fetch
- SMTP service testable by mocking net/tls modules
- Strategies testable with mock Service implementations
- URL parser has most edge cases -- needs thorough testing
- Integration tests: full flow from `send()` to mocked HTTP call

## Requirements

### Functional
- Unit tests for every module
- Integration tests for end-to-end flows
- Coverage target: >85% line coverage

### Non-functional
- Tests run in < 10s
- No real network calls (all mocked)
- Tests work in CI (no environment-specific dependencies)

## Related Code Files

### Files to Create

```
tests/
  unit/
    core/
      url-parser.test.ts
      service-registry.test.ts
      router.test.ts
      errors.test.ts
    strategies/
      direct-strategy.test.ts
      fallback-strategy.test.ts
      broadcast-strategy.test.ts
      round-robin-strategy.test.ts
    services/
      slack-service.test.ts
      discord-service.test.ts
      telegram-service.test.ts
      email-service.test.ts
      webhook-service.test.ts
      ntfy-service.test.ts
  integration/
    send-one-liner.test.ts
    create-sender.test.ts
    custom-service-registration.test.ts
```

## Implementation Steps

### Step 1: Test Helpers

Create `tests/helpers/mock-fetch.ts`:
```typescript
export function mockFetch(response: { ok: boolean; status: number; json?: any; text?: string }) {
  return vi.fn(() => Promise.resolve({
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(response.json),
    text: () => Promise.resolve(response.text ?? ''),
  }));
}
```

Create `tests/helpers/mock-service.ts`:
```typescript
export function createMockService(name: string, shouldSucceed = true): Service {
  return {
    send: vi.fn(async (message, params) => ({
      success: shouldSucceed,
      service: name,
      timestamp: new Date(),
      error: shouldSucceed ? undefined : new Error(`${name} failed`),
    })),
  };
}
```

### Step 2: URL Parser Tests (`tests/unit/core/url-parser.test.ts`)

Test cases:
- Parse `slack://xoxb:token123@C12345`
- Parse `discord://webhooktoken@123456789`
- Parse `telegram://123456:ABCDEF@telegram?chats=-100123&parsemode=HTML`
- Parse `smtp://user:pass@smtp.gmail.com:587?to=me@x.com&from=you@x.com`
- Parse `generic+https://example.com/webhook?@Auth=Bearer%20token&$field=value`
- Parse `ntfy://alerts` (default host ntfy.sh)
- Parse `ntfy://alerts@selfhosted.com`
- Error: invalid URL (no scheme)
- Error: empty string
- Decode URI-encoded credentials
- Handle URL with port number
- Handle URL with multiple path segments
- Handle URL with no query params

### Step 3: Service Registry Tests

- Register and retrieve service
- Get returns undefined for unknown scheme
- List returns all registered schemes
- Has returns true/false correctly
- Register overwrites existing scheme

### Step 4: Strategy Tests

**Fallback:**
- First service succeeds -> returns immediately, second not called
- First fails, second succeeds -> returns second result
- All fail -> returns all error results

**Broadcast:**
- All succeed -> returns all results
- Some fail -> returns all results (mixed)
- Empty services array -> returns empty array

**Round-Robin:**
- Rotates through services across 3 calls
- Wraps around after reaching last service
- Failed service -> tries next

**Direct:**
- Single service -> returns its result

### Step 5: Service Tests (per service)

Pattern for each HTTP service:
```typescript
describe('SlackService', () => {
  beforeEach(() => { vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200 })); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('sends webhook message', async () => { ... });
  it('sends bot API message', async () => { ... });
  it('handles API error', async () => { ... });
  it('parses URL correctly', async () => { ... });
});
```

Verify for each service:
- Correct HTTP method (POST)
- Correct URL construction
- Correct headers (Authorization, Content-Type)
- Correct body payload
- Error handling (non-200, network error)

### Step 6: Integration Tests

**send-one-liner.test.ts:**
```typescript
it('sends via ntfy with one line', async () => {
  vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200 }));
  const result = await send('ntfy://test-topic', 'Hello!');
  expect(result.success).toBe(true);
  expect(fetch).toHaveBeenCalledWith(
    'https://ntfy.sh/test-topic',
    expect.objectContaining({ method: 'POST' })
  );
});
```

**create-sender.test.ts:**
```typescript
it('broadcasts to multiple services', async () => {
  vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200 }));
  const sender = createSender(['ntfy://topic1', 'ntfy://topic2']);
  const results = await sender.send('Hello!');
  expect(results).toHaveLength(2);
  expect(results.every(r => r.success)).toBe(true);
});
```

**custom-service-registration.test.ts:**
```typescript
it('registers and uses custom service', async () => {
  registerService({
    scheme: 'custom',
    create: () => ({ send: async (msg) => ({ success: true, service: 'custom', timestamp: new Date() }) }),
  });
  const result = await send('custom://anything', 'Hello!');
  expect(result.success).toBe(true);
});
```

## Todo List

- [ ] Create test helpers (mock-fetch, mock-service)
- [ ] Write URL parser tests (13+ cases)
- [ ] Write service registry tests
- [ ] Write router tests
- [ ] Write strategy tests (4 strategies)
- [ ] Write service tests (6 services)
- [ ] Write integration tests (3 flows)
- [ ] Run coverage report, target >85%
- [ ] Fix any failing tests
- [ ] Verify all tests pass in CI-like environment

## Success Criteria
- All tests pass: `npm test`
- Coverage >85%: `npm run test:coverage`
- No real network calls in any test
- Tests complete in < 10s

## Risk Assessment
- **Mocking fetch globally**: Vitest supports `vi.stubGlobal`. Clean up in afterEach.
- **SMTP testing**: Mock net.Socket. More complex but doable with vi.mock.

## Next Steps
- Phase 7: Documentation & Publish

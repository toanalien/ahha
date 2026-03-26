# Phase 2: Core Infrastructure

## Context Links
- [Plan Overview](./plan.md)
- [Architecture Recommendations](../reports/architecture-recommendations.md)
- [Shoutrrr Research](../reports/shoutrrr-research-report.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 6h
- **Description:** Build core types, URL parser, service interface, service registry, and router.

## Key Insights
- Shoutrrr API is function-based: `Send(url, msg)` and `CreateSender(urls...)` -- NOT class-heavy
- URL parsing must handle service-specific schemes (slack://, discord://, etc.)
- Each service defines its own `parseUrl()` to extract config from URL parts
- Router orchestrates URL parsing -> service lookup -> strategy execution
- Keep types minimal; avoid over-engineering (YAGNI)

## Requirements

### Functional
- Type definitions for SendResult, ServiceConfig, Message params
- URL parser that extracts scheme, credentials, host, path, query params
- Service interface: `send(message, params?) => Promise<SendResult>`
- Service registry: register services by scheme, lookup by scheme
- Router: parse URL -> find service -> create instance -> send

### Non-functional
- All files < 200 lines
- Full TypeScript strict mode compliance
- Zero external dependencies

## Architecture

### Data Flow
```
send(url, message)
  -> parseUrl(url) -> { scheme, config }
  -> registry.get(scheme) -> ServiceFactory
  -> factory.create(config) -> ServiceInstance
  -> instance.send(message) -> SendResult
```

### Core Types (Simplified vs Research)

The research reports suggest heavy types (Notification with attachments, cc, bcc, html, etc.). Per YAGNI, the MVP types match Shoutrrr's simplicity:

```typescript
// Message is just a string (like Shoutrrr)
// Params is a flat key-value map (like Shoutrrr)
type Params = Record<string, string>;

interface SendResult {
  success: boolean;
  service: string;
  error?: Error;
}

// Each service implements this
interface Service {
  send(message: string, params?: Params): Promise<SendResult>;
}

// Service factory registered in registry
interface ServiceDefinition {
  scheme: string;
  create(config: ParsedUrl): Service;
}
```

**Rationale:** Shoutrrr passes `(message string, params map[string]string)`. We mirror this. Rich notification objects (subject, html, attachments) can be added later via params or a v2 API.

## Related Code Files

### Files to Create
- `src/core/types.ts` -- SendResult, Params, Service interface, ParsedUrl
- `src/core/url-parser.ts` -- parseUrl() function
- `src/core/service-registry.ts` -- register(), get(), list()
- `src/core/router.ts` -- Router class: resolves URLs to services, delegates to strategy
- `src/core/errors.ts` -- Custom error classes (ServiceNotFoundError, UrlParseError, SendError)
- `src/core/index.ts` -- re-exports

## Implementation Steps

### Step 1: Core Types (`src/core/types.ts`)

```typescript
/** Result of a send operation */
export interface SendResult {
  success: boolean;
  service: string;
  timestamp: Date;
  error?: Error;
}

/** Key-value params passed to services (Shoutrrr-compatible) */
export type Params = Record<string, string>;

/** Parsed URL components */
export interface ParsedUrl {
  scheme: string;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  path: string[];      // path segments
  query: Params;        // query string params
  raw: string;          // original URL string
}

/** Service instance -- sends messages */
export interface Service {
  send(message: string, params?: Params): Promise<SendResult>;
}

/** Service definition -- factory for creating service instances from URL */
export interface ServiceDefinition {
  readonly scheme: string;
  create(config: ParsedUrl): Service;
}
```

### Step 2: URL Parser (`src/core/url-parser.ts`)

Parse `slack://xoxb:token@channel` into ParsedUrl struct.

Key considerations:
- Use native `URL` class with scheme normalization
- Handle schemes that URL class may not parse (custom protocols)
- Replace custom scheme with `http://` for parsing, then restore
- Extract path segments as array (split by `/`, filter empty)
- Decode URI components for credentials

```typescript
export function parseUrl(raw: string): ParsedUrl {
  // Replace custom scheme with http for URL parsing
  const schemeMatch = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (!schemeMatch) throw new UrlParseError(`Invalid URL: ${raw}`);

  const scheme = schemeMatch[1].toLowerCase();
  const httpUrl = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, 'http://');

  const url = new URL(httpUrl);

  return {
    scheme,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    host: url.hostname || undefined,
    port: url.port ? Number(url.port) : undefined,
    path: url.pathname.split('/').filter(Boolean),
    query: Object.fromEntries(url.searchParams),
    raw,
  };
}
```

### Step 3: Service Registry (`src/core/service-registry.ts`)

Simple Map-based registry. Services self-register by scheme.

```typescript
const registry = new Map<string, ServiceDefinition>();

export function registerService(definition: ServiceDefinition): void {
  registry.set(definition.scheme, definition);
}

export function getService(scheme: string): ServiceDefinition | undefined {
  return registry.get(scheme);
}

export function listServices(): string[] {
  return Array.from(registry.keys());
}

export function hasService(scheme: string): boolean {
  return registry.has(scheme);
}
```

### Step 4: Custom Errors (`src/core/errors.ts`)

```typescript
export class ShoutrrrError extends Error { constructor(msg: string) { super(msg); this.name = 'ShoutrrrError'; } }
export class UrlParseError extends ShoutrrrError { ... }
export class ServiceNotFoundError extends ShoutrrrError { ... }
export class SendError extends ShoutrrrError { ... }
```

### Step 5: Router (`src/core/router.ts`)

Router holds instantiated services and delegates sending to a strategy.

```typescript
export class Router {
  private services: Service[] = [];

  constructor(urls: string[]) {
    for (const url of urls) {
      const parsed = parseUrl(url);
      const def = getService(parsed.scheme);
      if (!def) throw new ServiceNotFoundError(parsed.scheme);
      this.services.push(def.create(parsed));
    }
  }

  async send(message: string, params?: Params): Promise<SendResult[]> {
    // Default: broadcast to all (like Shoutrrr's CreateSender)
    return Promise.all(
      this.services.map(s => s.send(message, params))
    );
  }

  // With strategy support (Phase 3)
  async sendWithStrategy(
    strategy: DeliveryStrategy,
    message: string,
    params?: Params
  ): Promise<SendResult[]> { ... }
}
```

### Step 6: Core barrel export (`src/core/index.ts`)

Re-export all public types and functions.

## Todo List

- [ ] Create `src/core/types.ts` with SendResult, Params, Service, ServiceDefinition, ParsedUrl
- [ ] Create `src/core/errors.ts` with ShoutrrrError, UrlParseError, ServiceNotFoundError, SendError
- [ ] Create `src/core/url-parser.ts` with parseUrl()
- [ ] Create `src/core/service-registry.ts` with register/get/list/has
- [ ] Create `src/core/router.ts` with Router class
- [ ] Create `src/core/index.ts` barrel exports
- [ ] Write unit tests for url-parser (10+ cases)
- [ ] Write unit tests for service-registry
- [ ] Write unit tests for router (with mock services)
- [ ] Verify build succeeds

## Success Criteria
- parseUrl correctly handles: slack://, discord://, telegram://, email://, generic+https://, ntfy://
- Registry stores and retrieves service definitions
- Router instantiates services from URLs and delegates send()
- All unit tests pass
- Build succeeds

## Risk Assessment
- **URL parsing edge cases**: Custom schemes may break native URL parser. Mitigation: replace scheme with http:// for parsing.
- **generic+https:// scheme**: Compound scheme needs special handling in parser. Handle `+` as sub-protocol indicator.

## Security Considerations
- URLs contain credentials (tokens, passwords). Never log full URLs in error messages.
- Sanitize URL in error output: mask password/token fields.

## Next Steps
- Phase 3: Delivery Strategies

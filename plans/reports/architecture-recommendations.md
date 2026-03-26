# Architecture Recommendations: TypeScript Notification Library

**Date**: March 26, 2026
**Purpose**: Detailed architecture recommendations for implementing a Shoutrrr-equivalent Node.js library.

---

## 1. Core Architecture Decision: Plugin-Based Service Registry

### Why Plugin-Based?
- **Extensibility**: Add services without modifying core
- **Scalability**: Support 50+ services efficiently
- **Maintainability**: Each service is independent
- **Community-driven**: Contributors can own service plugins
- **Lazy loading**: Only load services you use

### Registry Pattern Implementation

```typescript
// core/service-registry.ts
export interface INotificationService {
  readonly type: string;
  readonly displayName: string;
  readonly version: string;

  validate(config: ServiceConfig): ValidationResult;
  send(notification: Notification): Promise<SendResult>;
  getMetadata(): ServiceMetadata;
}

export interface ServiceMetadata {
  requiresAuth: boolean;
  supportedChannels: string[];
  rateLimits?: RateLimit;
  retryPolicy?: RetryPolicy;
}

export class ServiceRegistry {
  private services: Map<string, ServiceConstructor> = new Map();
  private instances: Map<string, INotificationService> = new Map();

  register(service: ServiceConstructor): void {
    const instance = new service({});
    this.services.set(instance.type, service);
  }

  create(
    type: string,
    config: ServiceConfig
  ): INotificationService {
    const Constructor = this.services.get(type);
    if (!Constructor) {
      throw new Error(`Service not found: ${type}`);
    }
    return new Constructor(config);
  }

  getAvailableServices(): string[] {
    return Array.from(this.services.keys());
  }

  isRegistered(type: string): boolean {
    return this.services.has(type);
  }
}

// Usage
const registry = new ServiceRegistry();
registry.register(SlackService);
registry.register(EmailService);
registry.register(DiscordService);

const slack = registry.create('slack', { token: '...' });
```

**Benefits**:
- ✅ Runtime service discovery
- ✅ Plugins registered once at startup
- ✅ Type-safe service creation
- ✅ Easy to test (mock registry)

---

## 2. URL Parser: Apprise-Inspired Configuration

### Design: Service URL Syntax

```
scheme://[user:password@]host[:port][/path][?param1=value1&param2=value2]

Examples:
- slack://xoxb-token-here/channel-id-here
- mailto://username:password@gmail.com?to=recipient@example.com
- discord://webhook-id/webhook-token?threads=1
- telegram://bot-token/chat-id
- twilio://account-sid:auth-token@service-name/to-number
```

### URL Parser Implementation

```typescript
// core/url-parser.ts
export interface ParsedServiceConfig {
  type: string;                        // From scheme
  credentials: {
    username?: string;
    password?: string;
    token?: string;                    // Primary auth
  };
  host?: string;                       // Domain/ID
  port?: number;
  path?: string;                       // Path segments
  params: Record<string, string>;      // Query params
  raw: string;                         // Original URL
}

export class URLServiceParser {
  static parse(url: string): ParsedServiceConfig {
    // Normalize URL (handle custom schemes)
    const normalizedUrl = this.normalizeURL(url);
    const parsed = new URL(normalizedUrl);

    const type = parsed.protocol.replace('://', '').toLowerCase();

    return {
      type,
      credentials: {
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        // For some services, password is the token
        token: parsed.password || undefined,
      },
      host: parsed.hostname || undefined,
      port: parsed.port ? parseInt(parsed.port) : undefined,
      path: parsed.pathname === '/' ? undefined : parsed.pathname,
      params: Object.fromEntries(parsed.searchParams),
      raw: url,
    };
  }

  private static normalizeURL(url: string): string {
    // Handle URLs without protocol
    if (!url.includes('://')) {
      // Assume first part before : or @ is the scheme
      const match = url.match(/^([a-z]+):/i);
      if (match) {
        return url;
      }
    }

    // Handle service-specific formats
    // slack://xoxb-token/channel → slack://xoxb-token@slack.com/channel
    if (url.startsWith('slack://')) {
      const parts = url.replace('slack://', '').split('/');
      if (parts.length === 2) {
        return `slack://${parts[0]}@slack.com/${parts[1]}`;
      }
    }

    return url;
  }

  static buildURL(
    type: string,
    config: ServiceConfig
  ): string {
    const url = new URL(`${type}://placeholder`);

    if (config.token) {
      url.password = config.token;
    }
    if (config.channel || config.webhookId) {
      url.hostname = config.channel || config.webhookId;
    }
    if (config.to) {
      url.pathname = `/${config.to}`;
    }

    Object.entries(config).forEach(([key, value]) => {
      if (!['token', 'channel', 'webhookId', 'to'].includes(key)) {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString().replace('://placeholder', '://');
  }
}

// Usage
const parsed = URLServiceParser.parse('slack://xoxb-123/general?thread=1');
// Returns: {
//   type: 'slack',
//   credentials: { token: '123' },
//   path: '/general',
//   params: { thread: '1' }
// }
```

**Benefits**:
- ✅ Minimal configuration
- ✅ Environment-friendly (URL = string)
- ✅ Apprise-compatible syntax
- ✅ Zero boilerplate
- ✅ Easy to pass via env vars

---

## 3. Notification Types and Interfaces

```typescript
// core/types.ts

/**
 * Core notification payload
 */
export interface Notification {
  // Standard fields
  subject?: string;                    // Email subject, title
  body: string;                        // Main content

  // Metadata
  tags?: string[];                     // Categorization
  priority?: 'low' | 'normal' | 'high';
  timestamp?: Date;
  messageId?: string;                  // Idempotency key

  // Recipients
  to?: string | string[];              // Recipients per service
  cc?: string[];                       // Email only
  bcc?: string[];                      // Email only

  // Content
  html?: string;                       // Email HTML version
  data?: Record<string, any>;          // Service-specific data
  attachments?: Attachment[];

  // Retry behavior
  retryPolicy?: RetryPolicy;
  timeout?: number;                    // ms
}

export interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;                // ms
  maxDelay: number;                    // ms
  backoffMultiplier: number;           // Exponential backoff
  jitter?: boolean;                    // Add randomness
}

/**
 * Service configuration (after parsing URL or manual config)
 */
export interface ServiceConfig extends Record<string, any> {
  token?: string;                      // Primary auth method
  apiKey?: string;
  webhookUrl?: string;
  channel?: string;
  to?: string;                         // Recipient
  from?: string;                       // Sender
  [key: string]: any;
}

/**
 * Result of sending notification
 */
export interface SendResult {
  success: boolean;
  messageId: string;
  service: string;
  timestamp: Date;
  error?: Error;
  errorCode?: string;
  errorDetails?: Record<string, any>;
  deliveryTime?: number;               // ms
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Rate limit information
 */
export interface RateLimit {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerDay?: number;
}

/**
 * Service metadata
 */
export interface ServiceMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  website?: string;
  icon?: string;
  requiresAuth: boolean;
  authMethods: ('token' | 'apiKey' | 'oauth' | 'basic')[];
  supportedChannels: ('email' | 'sms' | 'chat' | 'push' | 'webhook')[];
  rateLimit?: RateLimit;
  retryPolicy?: RetryPolicy;
  costs?: {
    perRequest?: number;
    currency: string;
  };
}
```

---

## 4. Multi-Provider Strategies

```typescript
// core/strategies/
export interface DeliveryStrategy {
  name: string;
  execute(
    notification: Notification,
    services: INotificationService[]
  ): Promise<SendResult>;
}

// fallback.ts
export class FallbackStrategy implements DeliveryStrategy {
  name = 'fallback';

  async execute(
    notification: Notification,
    services: INotificationService[]
  ): Promise<SendResult> {
    const errors: Error[] = [];

    for (const service of services) {
      try {
        const result = await this.withTimeout(
          service.send(notification),
          notification.timeout || 5000
        );
        if (result.success) return result;
        errors.push(result.error || new Error('Unknown error'));
      } catch (error) {
        errors.push(error as Error);
      }
    }

    return {
      success: false,
      messageId: notification.messageId || '',
      service: 'fallback',
      timestamp: new Date(),
      error: new Error(
        `All services failed: ${errors.map(e => e.message).join('; ')}`
      ),
    };
  }

  private withTimeout<T>(
    promise: Promise<T>,
    ms: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
      ),
    ]);
  }
}

// round-robin.ts
export class RoundRobinStrategy implements DeliveryStrategy {
  name = 'round-robin';
  private currentIndex = 0;

  async execute(
    notification: Notification,
    services: INotificationService[]
  ): Promise<SendResult> {
    if (services.length === 0) {
      return {
        success: false,
        messageId: '',
        service: 'round-robin',
        timestamp: new Date(),
        error: new Error('No services available'),
      };
    }

    let lastError: Error | undefined;

    for (let i = 0; i < services.length; i++) {
      const index = (this.currentIndex + i) % services.length;
      const service = services[index];

      try {
        const result = await service.send(notification);
        this.currentIndex = (index + 1) % services.length;
        return result;
      } catch (error) {
        lastError = error as Error;
      }
    }

    return {
      success: false,
      messageId: '',
      service: 'round-robin',
      timestamp: new Date(),
      error: lastError,
    };
  }
}

// parallel.ts
export class ParallelStrategy implements DeliveryStrategy {
  name = 'parallel';

  async execute(
    notification: Notification,
    services: INotificationService[]
  ): Promise<SendResult> {
    const results = await Promise.allSettled(
      services.map(service =>
        service.send(notification).catch(error => ({
          success: false,
          error,
          service: 'unknown',
          messageId: '',
          timestamp: new Date(),
        }))
      )
    );

    const successful = results.filter(
      r => r.status === 'fulfilled' && (r.value as SendResult).success
    );

    return {
      success: successful.length > 0,
      messageId: notification.messageId || '',
      service: 'parallel',
      timestamp: new Date(),
      error: successful.length === 0
        ? new Error('All parallel sends failed')
        : undefined,
      errorDetails: {
        totalAttempts: services.length,
        successful: successful.length,
        failed: services.length - successful.length,
      },
    };
  }
}

// broadcast.ts
export class BroadcastStrategy implements DeliveryStrategy {
  name = 'broadcast';

  async execute(
    notification: Notification,
    services: INotificationService[]
  ): Promise<SendResult> {
    // Send to ALL services, collect all results
    const results = await Promise.allSettled(
      services.map(service => service.send(notification))
    );

    const successful = results.filter(
      r => r.status === 'fulfilled' && (r.value as SendResult).success
    );

    return {
      success: true,  // Always succeeds if any succeed
      messageId: notification.messageId || '',
      service: 'broadcast',
      timestamp: new Date(),
      errorDetails: {
        totalAttempts: services.length,
        successful: successful.length,
        failed: services.length - successful.length,
        results: results.map((r, i) => ({
          index: i,
          service: services[i].type,
          status: r.status,
          result: r.status === 'fulfilled' ? r.value : r.reason,
        })),
      },
    };
  }
}
```

---

## 5. Main Notifier Class

```typescript
// notifier.ts
export class Notifier {
  private registry: ServiceRegistry;
  private services: Map<string, INotificationService> = new Map();
  private strategy: DeliveryStrategy;
  private logger: Logger;

  constructor(options?: NotifierOptions) {
    this.registry = options?.registry || new ServiceRegistry();
    this.logger = options?.logger || new ConsoleLogger();
    this.strategy = options?.strategy || new FallbackStrategy();
  }

  /**
   * Add service from URL (Apprise-style)
   */
  addService(url: string, name?: string): this {
    const parsed = URLServiceParser.parse(url);
    const service = this.registry.create(parsed.type, parsed);
    const key = name || `${parsed.type}-${Date.now()}`;
    this.services.set(key, service);
    return this;
  }

  /**
   * Add service from config object
   */
  addServiceConfig(
    type: string,
    config: ServiceConfig,
    name?: string
  ): this {
    const service = this.registry.create(type, config);
    const key = name || `${type}-${Date.now()}`;
    this.services.set(key, service);
    return this;
  }

  /**
   * Set delivery strategy
   */
  setStrategy(strategy: 'fallback' | 'round-robin' | 'parallel' | 'broadcast'): this {
    switch (strategy) {
      case 'fallback':
        this.strategy = new FallbackStrategy();
        break;
      case 'round-robin':
        this.strategy = new RoundRobinStrategy();
        break;
      case 'parallel':
        this.strategy = new ParallelStrategy();
        break;
      case 'broadcast':
        this.strategy = new BroadcastStrategy();
        break;
    }
    return this;
  }

  /**
   * Send notification to all registered services
   */
  async send(notification: Notification): Promise<SendResult> {
    if (this.services.size === 0) {
      throw new Error('No notification services configured');
    }

    const services = Array.from(this.services.values());

    this.logger.info(`Sending notification via ${this.strategy.name}`, {
      serviceCount: services.length,
      notification: { subject: notification.subject },
    });

    return this.strategy.execute(notification, services);
  }

  /**
   * Send to specific service
   */
  async sendTo(
    serviceName: string,
    notification: Notification
  ): Promise<SendResult> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    return service.send(notification);
  }

  /**
   * Get registered services
   */
  getServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Remove service
   */
  removeService(name: string): this {
    this.services.delete(name);
    return this;
  }

  /**
   * Clear all services
   */
  clearServices(): this {
    this.services.clear();
    return this;
  }
}

export interface NotifierOptions {
  registry?: ServiceRegistry;
  logger?: Logger;
  strategy?: DeliveryStrategy;
}

export interface Logger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}

class ConsoleLogger implements Logger {
  info(message: string, data?: any) { console.log(`[INFO] ${message}`, data); }
  warn(message: string, data?: any) { console.warn(`[WARN] ${message}`, data); }
  error(message: string, data?: any) { console.error(`[ERROR] ${message}`, data); }
  debug(message: string, data?: any) { console.debug(`[DEBUG] ${message}`, data); }
}
```

---

## 6. Service Base Class

```typescript
// services/base-service.ts
export abstract class BaseNotificationService implements INotificationService {
  protected config: ServiceConfig;
  protected logger: Logger;

  constructor(config: ServiceConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new ConsoleLogger();
  }

  abstract readonly type: string;
  abstract readonly displayName: string;
  abstract readonly version: string = '1.0.0';

  abstract validate(config: ServiceConfig): ValidationResult;
  abstract send(notification: Notification): Promise<SendResult>;

  getMetadata(): ServiceMetadata {
    return {
      id: this.type,
      name: this.displayName,
      version: this.version,
      description: '',
      requiresAuth: true,
      authMethods: ['token'],
      supportedChannels: ['chat'],
    };
  }

  /**
   * Helper: Generate unique message ID
   */
  protected generateMessageId(): string {
    return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Wrap send with error handling
   */
  protected async withErrorHandling<T>(
    fn: () => Promise<T>,
    serviceName: string
  ): Promise<SendResult> {
    try {
      await fn();
      return {
        success: true,
        messageId: this.generateMessageId(),
        service: serviceName,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Send failed in ${serviceName}`, error);
      return {
        success: false,
        messageId: '',
        service: serviceName,
        timestamp: new Date(),
        error: error as Error,
        errorCode: (error as any).code,
      };
    }
  }

  /**
   * Helper: Validate config before send
   */
  protected validateBeforeSend(notification: Notification): void {
    if (!notification.body) {
      throw new Error('Notification body is required');
    }
  }
}
```

---

## 7. Example Service Implementation

```typescript
// services/slack.service.ts
export class SlackService extends BaseNotificationService {
  type = 'slack';
  displayName = 'Slack';
  version = '1.0.0';

  validate(config: ServiceConfig): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config.token && !config.webhookUrl) {
      errors.push({
        field: 'token|webhookUrl',
        message: 'Either token or webhookUrl is required',
        code: 'MISSING_AUTH',
      });
    }

    if (config.token && !config.token.startsWith('xoxb-')) {
      errors.push({
        field: 'token',
        message: 'Invalid Slack bot token format',
        code: 'INVALID_TOKEN',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async send(notification: Notification): Promise<SendResult> {
    return this.withErrorHandling(async () => {
      this.validateBeforeSend(notification);

      const payload = {
        text: notification.body,
        thread_ts: notification.data?.threadId,
      };

      if (this.config.webhookUrl) {
        await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Use token-based API
        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.token}`,
          },
          body: JSON.stringify({
            channel: this.config.channel || notification.data?.channel,
            ...payload,
          }),
        });

        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Slack API error: ${data.error}`);
        }
      }
    }, this.type);
  }

  getMetadata(): ServiceMetadata {
    return {
      id: 'slack',
      name: 'Slack',
      version: '1.0.0',
      description: 'Send messages to Slack channels',
      website: 'https://slack.com',
      requiresAuth: true,
      authMethods: ['token', 'webhook'],
      supportedChannels: ['chat'],
      rateLimit: {
        requestsPerSecond: 1,
      },
    };
  }
}
```

---

## 8. Project Structure

```
src/
├── core/
│   ├── index.ts
│   ├── service.interface.ts       # INotificationService
│   ├── service-registry.ts        # Plugin registry
│   ├── url-parser.ts              # Apprise-style parser
│   ├── types.ts                   # Notification, Result, etc.
│   └── logger.ts                  # Logger interface
│
├── strategies/
│   ├── index.ts
│   ├── fallback.ts
│   ├── round-robin.ts
│   ├── parallel.ts
│   └── broadcast.ts
│
├── services/
│   ├── index.ts
│   ├── base-service.ts            # AbstractClass
│   ├── slack.service.ts
│   ├── email.service.ts
│   ├── discord.service.ts
│   ├── telegram.service.ts
│   ├── sms.service.ts
│   └── webhook.service.ts         # Generic HTTP
│
├── notifier.ts                    # Main class
├── index.ts                       # Public API
└── version.ts                     # Version info

tests/
├── unit/
│   ├── url-parser.test.ts
│   ├── service-registry.test.ts
│   ├── strategies.test.ts
│   └── services/
│       ├── slack.test.ts
│       ├── email.test.ts
│       └── ...
│
└── integration/
    ├── multi-service.test.ts
    └── notifier.test.ts

docs/
├── README.md
├── ARCHITECTURE.md
├── API.md
├── SERVICES.md
├── CONTRIBUTING.md
└── examples/
    ├── basic.ts
    ├── url-based.ts
    ├── strategies.ts
    └── custom-service.ts
```

---

## 9. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Plugin-based** | Scales to 50+ services without core bloat |
| **URL parser** | Apprise-compatible, minimal config |
| **Strategy pattern** | Supports fallback, round-robin, parallel, broadcast |
| **Async/await** | Modern async throughout |
| **TypeScript** | Full type safety, DX |
| **Base class** | Consistent service implementations |
| **Registry pattern** | Runtime service discovery |
| **No external deps** | Lightweight, fast installs |
| **Builder pattern** | Fluent, chainable API |
| **Logger interface** | Pluggable logging |

---

## 10. Development Timeline

**Week 1-2**: Core infrastructure
- Service registry, URL parser, strategies
- Base service class
- Type definitions
- Unit tests

**Week 3-4**: Core services
- Slack, Discord, Email, Telegram, Webhook
- Integration tests
- Documentation

**Week 5**: Polish & release
- npm publish
- README, examples
- GitHub setup
- Initial marketing

**Weeks 6-8**: Extended services (20 total)
- SMS (Twilio, Vonage)
- Notifications (Firebase, OneSignal)
- Chat (MS Teams, Mattermost)
- Custom integrations

---

## Conclusion

This architecture provides:
- ✅ Lightweight core (~50KB minified)
- ✅ Extensible plugin system
- ✅ TypeScript-first with full types
- ✅ Apprise-compatible URLs
- ✅ Multiple delivery strategies
- ✅ Zero external dependencies (optional)
- ✅ Comprehensive testing foundation
- ✅ Clear upgrade path from NotifMe-SDK

Ready for implementation.

/**
 * Register and use a custom notification service.
 *
 * Usage: npx tsx examples/custom-service.ts
 */
import { registerService, send } from 'ahha';
import type { ParsedUrl, Service, SendResult } from 'ahha';

// Register a custom service for your internal API
registerService({
  scheme: 'myapi',
  create(config: ParsedUrl): Service {
    const apiKey = config.password ?? '';
    const host = config.host ?? 'localhost';

    return {
      async send(message: string, params?): Promise<SendResult> {
        try {
          const response = await fetch(`https://${host}/api/notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey,
            },
            body: JSON.stringify({
              message,
              channel: params?.channel ?? 'default',
              severity: params?.severity ?? 'info',
            }),
          });

          return {
            success: response.ok,
            service: 'myapi',
            timestamp: new Date(),
            error: response.ok ? undefined : new Error(`HTTP ${response.status}`),
          };
        } catch (err) {
          return {
            success: false,
            service: 'myapi',
            timestamp: new Date(),
            error: err instanceof Error ? err : new Error(String(err)),
          };
        }
      },
    };
  },
});

// Now use it like any built-in service
const result = await send(
  'myapi://:my-secret-key@api.example.com',
  'Custom service notification!',
  { channel: 'alerts', severity: 'warning' },
);

console.log('Custom service:', result.success ? 'sent' : result.error?.message);

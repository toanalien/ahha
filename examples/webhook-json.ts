/**
 * Send JSON payload to a generic webhook endpoint.
 *
 * Usage: npx tsx examples/webhook-json.ts
 */
import { send } from '@toanalien/ahha';

// JSON template mode with custom headers
const result = await send(
  'generic+https://httpbin.org/post?template=json&@X-Custom-Header=my-value',
  'Server health check passed',
  { title: 'Health Check' },
);

console.log('Webhook:', result.success ? 'sent' : result.error?.message);

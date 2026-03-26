/**
 * Send notifications to multiple services simultaneously (broadcast).
 *
 * Usage: npx tsx examples/multi-service-broadcast.ts
 */
import { createSender } from '@toanalien/ahha';

// Configure services via URL strings (can come from env vars)
const sender = createSender([
  'slack://xoxb:xoxb-your-token@C12345678',
  'discord://webhook-token@webhook-id',
  'ntfy://server-alerts@ntfy.sh',
]);

// Broadcast sends to ALL services concurrently
const results = await sender.send('Production deploy v2.1.0 complete');

for (const result of results) {
  const status = result.success ? 'OK' : 'FAIL';
  console.log(`[${status}] ${result.service}`, result.error?.message ?? '');
}

const succeeded = results.filter(r => r.success).length;
console.log(`\n${succeeded}/${results.length} services delivered`);

/**
 * Round-robin strategy: rotate through services across calls.
 * Useful for distributing load across redundant notification channels.
 *
 * Usage: npx tsx examples/round-robin.ts
 */
import { createSender } from '@toanalien/ahha';

const sender = createSender([
  'ntfy://channel-1@ntfy.sh',
  'ntfy://channel-2@ntfy.sh',
  'ntfy://channel-3@ntfy.sh',
], { strategy: 'round-robin' });

// Each call rotates to the next service
for (let i = 1; i <= 6; i++) {
  const results = await sender.send(`Alert #${i}`);
  const r = results[0];
  console.log(`Alert #${i} -> ${r.service}: ${r.success ? 'sent' : r.error?.message}`);
}

// Output: alternates between channel-1, channel-2, channel-3

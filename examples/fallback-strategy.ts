/**
 * Fallback strategy: try services in order until one succeeds.
 * Useful for high-availability alerting.
 *
 * Usage: npx tsx examples/fallback-strategy.ts
 */
import { createSender } from 'ahha';

// Primary: Slack, Fallback: Ntfy
const sender = createSender([
  'slack://xoxb:xoxb-your-token@C12345678',
  'ntfy://backup-alerts@ntfy.sh',
], { strategy: 'fallback' });

// If Slack fails, automatically tries Ntfy
const results = await sender.send('CRITICAL: Database connection lost');

const winner = results.find(r => r.success);
if (winner) {
  console.log(`Delivered via ${winner.service}`);
} else {
  console.error('All services failed:');
  for (const r of results) {
    console.error(`  ${r.service}: ${r.error?.message}`);
  }
}

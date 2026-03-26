/**
 * Load notification URLs from environment variables.
 * This is the recommended pattern for production use.
 *
 * Usage:
 *   NOTIFY_URLS="slack://xoxb:token@channel,ntfy://alerts" npx tsx examples/env-urls.ts
 */
import { createSender } from 'ahha';

// URLs from env var, comma-separated
const urlString = process.env.NOTIFY_URLS;

if (!urlString) {
  console.error('Set NOTIFY_URLS env var, e.g.:');
  console.error('  NOTIFY_URLS="ntfy://test1,ntfy://test2" npx tsx examples/env-urls.ts');
  process.exit(1);
}

const urls = urlString.split(',').map(u => u.trim());
console.log(`Loaded ${urls.length} notification service(s)`);

const sender = createSender(urls, { strategy: 'broadcast' });
const results = await sender.send('Hello from env-based config!');

for (const r of results) {
  console.log(`${r.service}: ${r.success ? 'sent' : r.error?.message}`);
}

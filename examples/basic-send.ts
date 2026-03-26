/**
 * Basic one-liner notification sending.
 *
 * Usage: npx tsx examples/basic-send.ts
 */
import { send } from 'ahha';

// Send to Ntfy (simplest service - no auth needed for public topics)
const result = await send('ntfy://my-alerts', 'Server deployment complete!');

console.log('Success:', result.success);
console.log('Service:', result.service);

if (!result.success) {
  console.error('Error:', result.error?.message);
}

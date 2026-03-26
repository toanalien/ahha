/**
 * Send formatted Telegram message with HTML parse mode.
 *
 * Usage: npx tsx examples/telegram-html.ts
 */
import { send } from 'ahha';

const botToken = '123456:ABC-DEF-your-token';
const chatId = '-1001234567890';

const result = await send(
  `telegram://${botToken}@telegram?chats=${chatId}&parsemode=HTML`,
  `<b>Deploy Alert</b>
<i>Service:</i> api-gateway
<i>Version:</i> v2.1.0
<i>Status:</i> <code>SUCCESS</code>

Deployed by @devops at ${new Date().toISOString()}`,
);

console.log('Telegram:', result.success ? 'sent' : result.error?.message);

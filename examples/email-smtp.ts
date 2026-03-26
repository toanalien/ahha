/**
 * Send email via SMTP with TLS (port 465).
 *
 * Usage: npx tsx examples/email-smtp.ts
 *
 * Note: Uses direct TLS connection (port 465).
 * Gmail requires an App Password: https://myaccount.google.com/apppasswords
 */
import { send } from '@toanalien/ahha';

const user = 'you@gmail.com';
const pass = 'your-app-password';
const to = 'recipient@example.com';

const result = await send(
  `smtp://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@smtp.gmail.com:465?to=${to}&subject=Server%20Alert`,
  'The API server restarted at ' + new Date().toISOString(),
);

console.log('Email:', result.success ? 'sent' : result.error?.message);

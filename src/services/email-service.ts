import * as net from 'node:net';
import * as tls from 'node:tls';
import { registerService } from '../core/service-registry.js';
import type { ServiceDefinition, Service, ParsedUrl, SendResult, Params } from '../core/types.js';

/** Sanitize header value: strip CR/LF to prevent SMTP injection */
function sanitize(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
}

/** Dot-stuff lines starting with '.' per RFC 5321 */
function dotStuff(body: string): string {
  return body.replace(/\r\n\./g, '\r\n..').replace(/^\./m, '..');
}

const emailService: ServiceDefinition = {
  scheme: 'smtp',
  create(config: ParsedUrl): Service {
    const user = config.user ?? '';
    const pass = config.password ?? '';
    const host = config.host ?? 'localhost';
    const port = config.port ?? 465;
    const to = config.query.to ?? '';
    const from = config.query.from ?? user;

    return {
      async send(message: string, params?: Params): Promise<SendResult> {
        const recipient = sanitize(params?.to ?? to);
        const subject = sanitize(params?.subject ?? config.query.subject ?? 'Notification');
        const sender = sanitize(params?.from ?? from);

        if (!recipient) {
          return {
            success: false, service: 'smtp', timestamp: new Date(),
            error: new Error('No recipient specified (use ?to= in URL)'),
          };
        }

        try {
          await sendSmtp({ host, port, user, pass, from: sender, to: recipient, subject, body: message });
          return { success: true, service: 'smtp', timestamp: new Date() };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          return { success: false, service: 'smtp', timestamp: new Date(), error };
        }
      },
    };
  },
};

interface SmtpOpts {
  host: string; port: number; user: string; pass: string;
  from: string; to: string; subject: string; body: string;
}

async function sendSmtp(opts: SmtpOpts): Promise<void> {
  // Only support implicit TLS (port 465). Refuse auth on unencrypted connections.
  if (opts.port !== 465 && opts.user) {
    throw new Error('SMTP auth requires TLS (port 465). Port 587 STARTTLS not yet supported.');
  }

  return new Promise((resolve, reject) => {
    const useTls = opts.port === 465;
    const timeout = 10_000;
    let settled = false;

    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      err ? reject(err) : resolve();
    };

    const onConnect = (socket: net.Socket | tls.TLSSocket) => {
      socket.setTimeout(timeout);
      socket.on('timeout', () => { socket.destroy(); done(new Error('SMTP timeout')); });
      let buffer = '';

      const write = (cmd: string) => socket.write(cmd + '\r\n');

      /** Read SMTP response, handling multi-line (250-xxx continuation) */
      const readResponse = (expectedCode: number): Promise<string[]> =>
        new Promise((res, rej) => {
          const lines: string[] = [];

          const tryParse = () => {
            while (true) {
              const idx = buffer.indexOf('\r\n');
              if (idx === -1) break;
              const line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);

              const code = line.slice(0, 3);
              const sep = line[3]; // '-' = continuation, ' ' = final
              lines.push(line);

              if (code !== String(expectedCode)) {
                rej(new Error(`SMTP expected ${expectedCode}, got: ${line}`));
                return;
              }
              if (sep !== '-') { res(lines); return; }
            }
          };

          const onData = (chunk: Buffer) => {
            buffer += chunk.toString();
            tryParse();
          };
          socket.on('data', onData);
          // Clean up listener after resolution
          const cleanup = () => socket.removeListener('data', onData);
          const origRes = res, origRej = rej;
          res = (v) => { cleanup(); origRes(v); };
          rej = (e) => { cleanup(); origRej(e); };

          tryParse(); // Check buffer for data already received
        });

      (async () => {
        await readResponse(220);
        write('EHLO localhost');
        await readResponse(250);

        if (opts.user) {
          write('AUTH LOGIN');
          await readResponse(334);
          write(Buffer.from(opts.user).toString('base64'));
          await readResponse(334);
          write(Buffer.from(opts.pass).toString('base64'));
          await readResponse(235);
        }

        write(`MAIL FROM:<${sanitize(opts.from)}>`);
        await readResponse(250);
        write(`RCPT TO:<${sanitize(opts.to)}>`);
        await readResponse(250);
        write('DATA');
        await readResponse(354);

        const headers = [
          `From: ${sanitize(opts.from)}`,
          `To: ${sanitize(opts.to)}`,
          `Subject: ${sanitize(opts.subject)}`,
          `Date: ${new Date().toUTCString()}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/plain; charset=utf-8`,
        ].join('\r\n');

        const body = dotStuff(opts.body.replace(/\r?\n/g, '\r\n'));
        write(`${headers}\r\n\r\n${body}\r\n.`);
        await readResponse(250);

        write('QUIT');
        socket.end();
        done();
      })().catch(err => { socket.destroy(); done(err); });
    };

    if (useTls) {
      const socket = tls.connect({ host: opts.host, port: opts.port }, () => onConnect(socket));
      socket.on('error', done);
    } else {
      const socket = net.connect({ host: opts.host, port: opts.port }, () => onConnect(socket));
      socket.on('error', done);
    }
  });
}

registerService(emailService);
export default emailService;

import type { ParsedUrl } from './types.js';
import { UrlParseError } from './errors.js';

/**
 * Parse a Shoutrrr-compatible notification URL into components.
 *
 * Uses manual parsing for user:password@host to handle edge cases
 * that the native URL class doesn't support well (slashes in passwords,
 * numeric-only hostnames interpreted as IPs, etc.).
 *
 * @example
 * parseUrl('slack://xoxb:token@C12345678')
 * parseUrl('generic+https://example.com/webhook')
 * parseUrl('slack://hook:T00/B00/XXX@webhook')
 */
export function parseUrl(raw: string): ParsedUrl {
  const schemeMatch = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (!schemeMatch) {
    throw new UrlParseError(`Invalid URL: missing scheme in "${maskUrl(raw)}"`);
  }

  const scheme = schemeMatch[1].toLowerCase();
  // Everything after scheme://
  const rest = raw.slice(schemeMatch[0].length);

  let user: string | undefined;
  let password: string | undefined;
  let host: string | undefined;
  let port: number | undefined;
  let pathStr = '';
  let queryStr = '';

  // Split off query string first
  const qIdx = rest.indexOf('?');
  const beforeQuery = qIdx >= 0 ? rest.slice(0, qIdx) : rest;
  queryStr = qIdx >= 0 ? rest.slice(qIdx + 1) : '';

  // Find the LAST @ to split credentials from host (allows @ in passwords)
  const atIdx = beforeQuery.lastIndexOf('@');
  let hostAndPath: string;

  if (atIdx >= 0) {
    const credentials = beforeQuery.slice(0, atIdx);
    hostAndPath = beforeQuery.slice(atIdx + 1);

    // Split credentials into user:password (first colon separates them)
    const colonIdx = credentials.indexOf(':');
    if (colonIdx >= 0) {
      user = decodeURIComponent(credentials.slice(0, colonIdx));
      password = decodeURIComponent(credentials.slice(colonIdx + 1));
    } else {
      user = decodeURIComponent(credentials);
    }
  } else {
    hostAndPath = beforeQuery;
  }

  // Split host from path (first / after host)
  const slashIdx = hostAndPath.indexOf('/');
  let hostPart: string;
  if (slashIdx >= 0) {
    hostPart = hostAndPath.slice(0, slashIdx);
    pathStr = hostAndPath.slice(slashIdx + 1);
  } else {
    hostPart = hostAndPath;
  }

  // Extract port from host
  const portMatch = hostPart.match(/:(\d+)$/);
  if (portMatch) {
    port = Number(portMatch[1]);
    host = hostPart.slice(0, -portMatch[0].length) || undefined;
  } else {
    host = hostPart || undefined;
  }

  // Parse query params
  const query: Record<string, string> = {};
  if (queryStr) {
    for (const pair of queryStr.split('&')) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx >= 0) {
        query[decodeURIComponent(pair.slice(0, eqIdx))] = decodeURIComponent(pair.slice(eqIdx + 1));
      } else {
        query[decodeURIComponent(pair)] = '';
      }
    }
  }

  const path = pathStr.split('/').filter(Boolean);

  return { scheme, user, password, host, port, path, query, raw };
}

/** Mask credentials in URL for safe error messages */
function maskUrl(url: string): string {
  return url.replace(
    /\/\/([^:@]+):([^@]+)@/,
    '//$1:***@',
  );
}

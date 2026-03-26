import { registerService } from '../core/service-registry.js';
import type { ServiceDefinition, Service, ParsedUrl, SendResult, Params } from '../core/types.js';

const webhookService: ServiceDefinition = {
  scheme: 'generic',
  create(config: ParsedUrl): Service {
    // generic+https://example.com/path?@Header=val&$field=val&template=json
    const subProtocol = config.scheme.includes('+')
      ? config.scheme.split('+')[1]
      : 'https';

    const targetHost = config.host ?? '';
    const targetPath = config.path.length > 0 ? '/' + config.path.join('/') : '';
    const baseUrl = `${subProtocol}://${targetHost}${config.port ? ':' + config.port : ''}${targetPath}`;

    // Separate @headers, $fields, and regular query params
    const headers: Record<string, string> = {};
    const extraFields: Record<string, string> = {};
    const queryParams: Record<string, string> = {};
    const template = config.query.template ?? 'raw';

    for (const [key, value] of Object.entries(config.query)) {
      if (key === 'template') continue;
      if (key.startsWith('@')) headers[key.slice(1)] = value;
      else if (key.startsWith('$')) extraFields[key.slice(1)] = value;
      else queryParams[key] = value;
    }

    return {
      async send(message: string, params?: Params): Promise<SendResult> {
        try {
          // Build URL with query params manually (avoid URL class for compatibility)
          const qs = Object.entries(queryParams)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
          const fetchUrl = qs ? `${baseUrl}?${qs}` : baseUrl;

          const reqHeaders: Record<string, string> = { ...headers };
          let body: string;

          if (template === 'json') {
            reqHeaders['Content-Type'] = reqHeaders['Content-Type'] ?? 'application/json';
            const titleKey = config.query.titleKey ?? 'title';
            const messageKey = config.query.messageKey ?? 'message';
            body = JSON.stringify({
              [messageKey]: message,
              ...(params?.title ? { [titleKey]: params.title } : {}),
              ...extraFields,
            });
          } else {
            reqHeaders['Content-Type'] = reqHeaders['Content-Type'] ?? 'text/plain';
            body = message;
          }

          const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: reqHeaders,
            body,
          });

          if (!response.ok) {
            return {
              success: false,
              service: 'generic',
              timestamp: new Date(),
              error: new Error(`HTTP ${response.status}: ${response.statusText}`),
            };
          }

          return { success: true, service: 'generic', timestamp: new Date() };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          return { success: false, service: 'generic', timestamp: new Date(), error };
        }
      },
    };
  },
};

// Register both 'generic' and handle 'generic+https'/'generic+http' via scheme parsing
registerService(webhookService);

// Also register compound schemes
registerService({ ...webhookService, scheme: 'generic+https' });
registerService({ ...webhookService, scheme: 'generic+http' });

export default webhookService;

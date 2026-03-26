import { registerService } from '../core/service-registry.js';
import type { ServiceDefinition, Service, ParsedUrl, SendResult, Params } from '../core/types.js';

const ntfyService: ServiceDefinition = {
  scheme: 'ntfy',
  create(config: ParsedUrl): Service {
    // ntfy://TOPIC@HOST -> user=TOPIC, host=HOST
    // ntfy://TOPIC       -> user=undefined, host=TOPIC
    const hasExplicitHost = !!config.user;
    const topic = config.user ?? config.host ?? config.path[0] ?? '';
    const host = hasExplicitHost ? (config.host ?? 'ntfy.sh') : 'ntfy.sh';
    const scheme = config.query.scheme ?? 'https';

    return {
      async send(message: string, params?: Params): Promise<SendResult> {
        if (!topic) {
          return {
            success: false, service: 'ntfy', timestamp: new Date(),
            error: new Error('No topic specified'),
          };
        }

        try {
          const url = `${scheme}://${host}/${topic}`;
          const headers: Record<string, string> = {};

          // Map params to ntfy headers
          if (params?.title ?? config.query.title) headers['Title'] = params?.title ?? config.query.title;
          if (params?.priority ?? config.query.priority) headers['Priority'] = params?.priority ?? config.query.priority;
          if (params?.tags ?? config.query.tags) headers['Tags'] = params?.tags ?? config.query.tags;
          if (params?.click ?? config.query.click) headers['Click'] = params?.click ?? config.query.click;
          if (params?.attach ?? config.query.attach) headers['Attach'] = params?.attach ?? config.query.attach;
          if (params?.actions ?? config.query.actions) headers['Actions'] = params?.actions ?? config.query.actions;

          const response = await fetch(url, {
            method: 'POST',
            body: message,
            headers,
          });

          if (!response.ok) {
            const body = await response.text();
            return {
              success: false, service: 'ntfy', timestamp: new Date(),
              error: new Error(`HTTP ${response.status}: ${body}`),
            };
          }

          return { success: true, service: 'ntfy', timestamp: new Date() };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          return { success: false, service: 'ntfy', timestamp: new Date(), error };
        }
      },
    };
  },
};

registerService(ntfyService);
export default ntfyService;

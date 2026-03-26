import { registerService } from '../core/service-registry.js';
import type { ServiceDefinition, Service, ParsedUrl, SendResult, Params } from '../core/types.js';

const slackService: ServiceDefinition = {
  scheme: 'slack',
  create(config: ParsedUrl): Service {
    const isWebhook = config.user === 'hook';
    const token = config.password ?? '';
    const channel = config.host ?? '';

    return {
      async send(message: string, params?: Params): Promise<SendResult> {
        const payload: Record<string, unknown> = { text: message };

        if (params?.color) payload.attachments = [{ color: params.color, text: message }];
        if (params?.username) payload.username = params.username;
        if (params?.icon) payload.icon_emoji = params.icon;

        try {
          let response: Response;

          if (isWebhook) {
            const webhookUrl = `https://hooks.slack.com/services/${token}`;
            response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } else {
            payload.channel = channel;
            response = await fetch('https://slack.com/api/chat.postMessage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });

            const data = await response.json() as { ok: boolean; error?: string };
            if (!data.ok) {
              return {
                success: false, service: 'slack', timestamp: new Date(),
                error: new Error(`Slack API error: ${data.error}`),
              };
            }
          }

          if (!response.ok && isWebhook) {
            return {
              success: false, service: 'slack', timestamp: new Date(),
              error: new Error(`HTTP ${response.status}: ${response.statusText}`),
            };
          }

          return { success: true, service: 'slack', timestamp: new Date() };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          return { success: false, service: 'slack', timestamp: new Date(), error };
        }
      },
    };
  },
};

registerService(slackService);
export default slackService;

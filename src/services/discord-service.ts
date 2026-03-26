import { registerService } from '../core/service-registry.js';
import type { ServiceDefinition, Service, ParsedUrl, SendResult, Params } from '../core/types.js';

const discordService: ServiceDefinition = {
  scheme: 'discord',
  create(config: ParsedUrl): Service {
    // discord://TOKEN@WEBHOOK_ID
    const token = config.password ?? config.user ?? '';
    const webhookId = config.host ?? '';

    return {
      async send(message: string, params?: Params): Promise<SendResult> {
        const payload: Record<string, unknown> = { content: message };

        if (params?.username) payload.username = params.username;
        if (params?.avatar_url) payload.avatar_url = params.avatar_url;

        try {
          const url = `https://discord.com/api/webhooks/${webhookId}/${token}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const body = await response.text();
            return {
              success: false,
              service: 'discord',
              timestamp: new Date(),
              error: new Error(`HTTP ${response.status}: ${body}`),
            };
          }

          return { success: true, service: 'discord', timestamp: new Date() };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          return { success: false, service: 'discord', timestamp: new Date(), error };
        }
      },
    };
  },
};

registerService(discordService);
export default discordService;

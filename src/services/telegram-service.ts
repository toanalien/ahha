import { registerService } from '../core/service-registry.js';
import type { ServiceDefinition, Service, ParsedUrl, SendResult, Params } from '../core/types.js';

const telegramService: ServiceDefinition = {
  scheme: 'telegram',
  create(config: ParsedUrl): Service {
    // telegram://BOT_TOKEN@telegram?chats=CHAT_ID&parsemode=HTML
    // Token can be in user:password format (e.g., 123456:ABC-DEF)
    const token = config.user && config.password
      ? `${config.user}:${config.password}`
      : config.user ?? '';
    const chats = (config.query.chats ?? '').split(',').filter(Boolean);
    const parseMode = config.query.parsemode ?? config.query.parse_mode;
    const disablePreview = config.query.preview === 'no';
    const silent = config.query.notification === 'no';

    return {
      async send(message: string, params?: Params): Promise<SendResult> {
        const chatIds = chats.length > 0
          ? chats
          : params?.chats?.split(',').filter(Boolean) ?? [];

        if (chatIds.length === 0) {
          return {
            success: false,
            service: 'telegram',
            timestamp: new Date(),
            error: new Error('No chat IDs specified'),
          };
        }

        try {
          const results = await Promise.allSettled(
            chatIds.map(chatId => {
              const payload: Record<string, unknown> = {
                chat_id: chatId,
                text: message,
              };
              if (parseMode) payload.parse_mode = parseMode;
              if (disablePreview) payload.disable_web_page_preview = true;
              if (silent) payload.disable_notification = true;

              return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
            }),
          );

          const hasFailure = results.some(
            r => r.status === 'rejected' ||
              (r.status === 'fulfilled' && !r.value.ok),
          );

          if (hasFailure) {
            return {
              success: false,
              service: 'telegram',
              timestamp: new Date(),
              error: new Error('One or more Telegram sends failed'),
            };
          }

          return { success: true, service: 'telegram', timestamp: new Date() };
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          return { success: false, service: 'telegram', timestamp: new Date(), error };
        }
      },
    };
  },
};

registerService(telegramService);
export default telegramService;

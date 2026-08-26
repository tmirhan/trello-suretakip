/**
 * discordAdapter.js
 * -----------------------------------------------------------------------
 * Kanal: Discord Webhook.
 *
 * Discord'un webhook uç noktaları, tarayıcıdan doğrudan JSON POST
 * isteklerine (CORS ile) izin verir; bu yüzden bu adaptör güvenilir
 * biçimde istemci tarafından (client-side) çalışır ve gerçek bir
 * başarı/hata durumu okuyabilir.
 * -----------------------------------------------------------------------
 */

(function initDiscordAdapter(root) {
  /**
   * @param {import('./notificationService.js').NotificationMessage} message
   * @param {{webhookUrl: string}} config
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function send(message, config) {
    const webhookUrl = config && config.webhookUrl;
    if (!webhookUrl) {
      return { success: false, error: "Discord webhook URL tanımlı değil (Ayarlar'dan ekleyin)." };
    }

    const payload = {
      embeds: [
        {
          title: message.title,
          description: message.bodyLines.join('\n'),
          color: message.thresholdKey === 'overdue' ? 15158332 : 3447003, // kırmızı / mavi
          url: message.cardUrl,
        },
      ],
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return { success: false, error: `Discord webhook HTTP ${response.status} döndürdü.` };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : 'Discord isteği başarısız oldu.' };
    }
  }

  const DiscordAdapter = { channelId: 'discord', send };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiscordAdapter;
  } else {
    root.DiscordAdapter = DiscordAdapter;
  }
})(typeof window !== 'undefined' ? window : globalThis);

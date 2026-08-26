/**
 * slackAdapter.js
 * -----------------------------------------------------------------------
 * Kanal: Slack Incoming Webhook.
 *
 * ⚠️ CORS SINIRI: hooks.slack.com uç noktası tarayıcı isteklerine CORS
 * başlığı (Access-Control-Allow-Origin) DÖNMEZ. Bu yüzden istek
 * `mode: 'no-cors'` ile ve önden-kontrol (preflight) tetiklemeyen bir
 * Content-Type (`text/plain`) ile gönderilir — Slack, gövdeyi JSON
 * olarak ayrıştırabildiği sürece mesajı yine de işler. Ancak `no-cors`
 * modunda tarayıcı, yanıtı JavaScript'e OKUTMAZ (response "opaque"tır);
 * bu nedenle bu adaptör "istek gönderildi" ile "Slack mesajı kabul etti"
 * ayrımını KESİN olarak yapamaz — başarı, "istek atılabildi" anlamına
 * gelir, "Slack'te göründü" garantisi değildir.
 *
 * Daha güvenilir/doğrulanabilir teslimat isteniyorsa (örn. hata
 * durumunu kesin olarak yakalamak), bu isteğin sunucu tarafında (küçük
 * bir serverless fonksiyon üzerinden — bkz. api/send-email.js'teki
 * yaklaşımın aynısı) atılması önerilir — bkz. README.md §
 * "Platform Sınırları — Dürüst Bir Değerlendirme".
 * -----------------------------------------------------------------------
 */

(function initSlackAdapter(root) {
  /**
   * @param {import('./notificationService.js').NotificationMessage} message
   * @param {{webhookUrl: string}} config
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function send(message, config) {
    const webhookUrl = config && config.webhookUrl;
    if (!webhookUrl) {
      return { success: false, error: "Slack webhook URL tanımlı değil (Ayarlar'dan ekleyin)." };
    }

    const payload = {
      text: `*${message.title}*\n${message.bodyLines.join('\n')}${message.cardUrl ? `\n<${message.cardUrl}|Kartı Aç>` : ''}`,
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      // no-cors modunda yanıt okunamaz; istek fetch tarafından reddedilmediyse
      // (ağ hatası fırlatılmadıysa) "gönderildi" kabul edilir.
      return { success: true, note: 'Yanıt tarayıcı CORS kısıtlaması nedeniyle doğrulanamadı.' };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : 'Slack isteği başarısız oldu.' };
    }
  }

  const SlackAdapter = { channelId: 'slack', send };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlackAdapter;
  } else {
    root.SlackAdapter = SlackAdapter;
  }
})(typeof window !== 'undefined' ? window : globalThis);

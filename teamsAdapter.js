/**
 * teamsAdapter.js
 * -----------------------------------------------------------------------
 * Kanal: Microsoft Teams Incoming Webhook (Office 365 Connector /
 * Power Automate Workflow webhook URL'i).
 *
 * ⚠️ Aynı CORS sınırı slackAdapter.js'de olduğu gibi geçerlidir: Teams
 * webhook uç noktası tarayıcıya CORS izni vermez, bu yüzden istek
 * `no-cors` + `text/plain` ile "en iyi çaba" (best-effort) mantığıyla
 * gönderilir; kesin teslim doğrulaması yapılamaz.
 * -----------------------------------------------------------------------
 */

(function initTeamsAdapter(root) {
  /**
   * @param {import('./notificationService.js').NotificationMessage} message
   * @param {{webhookUrl: string}} config
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function send(message, config) {
    const webhookUrl = config && config.webhookUrl;
    if (!webhookUrl) {
      return { success: false, error: "Teams webhook URL tanımlı değil (Ayarlar'dan ekleyin)." };
    }

    // MessageCard formatı (Office 365 Connector). Yeni "Workflows" webhook'ları
    // basit { text } gövdesini de kabul eder; bu yüzden ikisini de içeren
    // basit ve uyumlu bir gövde tercih edilmiştir.
    const payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: message.title,
      title: message.title,
      text: message.bodyLines.join('\n\n'),
      potentialAction: message.cardUrl
        ? [
            {
              '@type': 'OpenUri',
              name: 'Kartı Aç',
              targets: [{ os: 'default', uri: message.cardUrl }],
            },
          ]
        : undefined,
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      return { success: true, note: 'Yanıt tarayıcı CORS kısıtlaması nedeniyle doğrulanamadı.' };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : 'Teams isteği başarısız oldu.' };
    }
  }

  const TeamsAdapter = { channelId: 'teams', send };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamsAdapter;
  } else {
    root.TeamsAdapter = TeamsAdapter;
  }
})(typeof window !== 'undefined' ? window : globalThis);

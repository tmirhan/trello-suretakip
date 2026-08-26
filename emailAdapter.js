/**
 * emailAdapter.js
 * -----------------------------------------------------------------------
 * Kanal: E-posta.
 *
 * Tarayıcı JavaScript'i bir SMTP sunucusuna doğrudan erişemez — bu,
 * tarayıcıların temel güvenlik modelidir, Power-Up'a özgü değildir. Bu
 * adaptör, gerçek gönderimi bu depodaki `api/send-email.js` Vercel
 * Serverless Function'ına devreder; gönderici API anahtarı (Resend)
 * yalnızca sunucu tarafında, Vercel Ortam Değişkenleri'nde tutulur ve
 * tarayıcıya ASLA gönderilmez.
 *
 * Kurulum: README.md § "E-posta Bildirimleri (Backend Kurulumu)".
 * -----------------------------------------------------------------------
 */

(function initEmailAdapter(root) {
  /**
   * @param {import('./notificationService.js').NotificationMessage} message
   * @param {{toEmails: string[], fromName?: string, fromEmail?: string, backendUrl?: string}} config
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function send(message, config) {
    const { toEmails, fromName, fromEmail, backendUrl } = config || {};

    if (!toEmails || toEmails.length === 0) {
      return {
        success: false,
        error: "Gönderilecek e-posta adresi bulunamadı (Ayarlar > 'Belirli Kullanıcılar' alanına adres ekleyin).",
      };
    }

    const url = backendUrl || '/api/send-email';
    const text =
      message.bodyLines.join('\n') + (message.cardUrl ? `\n\nKartı Aç: ${message.cardUrl}` : '');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmails,
          subject: message.title,
          text,
          fromName,
          fromEmail,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { success: false, error: data.error || `E-posta backend HTTP ${response.status} döndürdü.` };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: (err && err.message) || 'E-posta isteği başarısız oldu (backend uç noktasına ulaşılamadı).',
      };
    }
  }

  const EmailAdapter = { channelId: 'email', send };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailAdapter;
  } else {
    root.EmailAdapter = EmailAdapter;
  }
})(typeof window !== 'undefined' ? window : globalThis);

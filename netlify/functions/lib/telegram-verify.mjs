import crypto from 'node:crypto';

/* Validates a Telegram Mini App `initData` string against the bot token, per
   https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   Returns { user, authDate } on success, null if the signature doesn't match
   or the data is older than maxAgeSeconds (replay-attack guard). Pure/no I/O
   so it's covered by test-telegram-verify.js without hitting the network. */
export function verifyInitData(initData, botToken, maxAgeSeconds = 86400) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (computedHash !== hash) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) return null;

  let user = null;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { user = null; }
  return { user, authDate };
}

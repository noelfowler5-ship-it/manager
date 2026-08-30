/* Tests netlify/functions/lib/telegram-verify.mjs in isolation — pure HMAC
   logic, no network, no Netlify runtime needed. Run with:
     node test-telegram-verify.js */
const crypto = require('crypto');

(async () => {
  const { verifyInitData } = await import('./netlify/functions/lib/telegram-verify.mjs');

  let pass = 0, fail = 0;
  const failures = [];
  function ok(cond, label) {
    if (cond) { pass++; console.log('  ✓ ' + label); }
    else { fail++; failures.push(label); console.log('  ✗ FAIL: ' + label); }
  }

  const BOT_TOKEN = 'test-bot-token-123456';

  // Mirrors Telegram's own signing algorithm so we can build a
  // self-consistent "valid" initData string for the test, without any real
  // bot token or network access.
  function buildInitData(fields, token) {
    const params = new URLSearchParams(fields);
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    params.set('hash', hash);
    return params.toString();
  }

  console.log('\n[verifyInitData]');
  const now = Math.floor(Date.now() / 1000);
  const validInitData = buildInitData({
    auth_date: String(now),
    user: JSON.stringify({ id: 12345, first_name: 'Noel' }),
    query_id: 'AAH123',
  }, BOT_TOKEN);

  const result = verifyInitData(validInitData, BOT_TOKEN);
  ok(result !== null, 'a correctly-signed initData string verifies');
  ok(result && result.user && result.user.id === 12345, 'verified payload exposes the Telegram user id');

  ok(verifyInitData(validInitData, 'a-different-bot-token') === null, 'wrong bot token is rejected');

  const tampered = validInitData.replace('Noel', 'Mallory');
  ok(verifyInitData(tampered, BOT_TOKEN) === null, 'tampering with a signed field invalidates the hash');

  const staleInitData = buildInitData({
    auth_date: String(now - 999999),
    user: JSON.stringify({ id: 1 }),
  }, BOT_TOKEN);
  ok(verifyInitData(staleInitData, BOT_TOKEN) === null, 'stale auth_date (past max age) is rejected');

  ok(verifyInitData('', BOT_TOKEN) === null, 'empty initData is rejected, not thrown');
  ok(verifyInitData(validInitData, '') === null, 'missing bot token is rejected, not thrown');
  ok(verifyInitData(validInitData.replace(/hash=[a-f0-9]+/, ''), BOT_TOKEN) === null, 'missing hash param is rejected, not thrown');

  console.log('\n' + '='.repeat(40));
  console.log(pass + ' passed, ' + fail + ' failed');
  console.log('='.repeat(40));
  if (fail) {
    console.log('\nFailures:');
    failures.forEach(f => console.log('  - ' + f));
    process.exit(1);
  }
})();

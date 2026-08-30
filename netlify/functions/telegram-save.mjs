/* POST /api/telegram/save

   Receives transactions parsed by telegram.html's Mini App capture screen
   and appends them to the real Transaction Log sheet, the same way the main
   app's Sync tab does — but from the server, using a Google service account,
   because Telegram's in-app WebView cannot reliably run the Google Identity
   Services OAuth popup the main app's Sync tab uses. Every request must carry
   a Telegram-signed `initData` string; see lib/telegram-verify.mjs. */

import { verifyInitData } from './lib/telegram-verify.mjs';
import { appendTransactions } from './lib/sheets-writer.mjs';

export const config = { path: '/api/telegram/save' };

// Same default as index.html's REAL_SHEET_ID.
const REAL_SHEET_ID = '1JR4CjH-KyZfyc5ZLTlWNE5SP6cl70P6rxnDzmDQzGa4';

// Category names must match index.html's CATEGORIES exactly — duplicated
// here (not imported, see sheets-writer.mjs's note) purely as a server-side
// sanity check so a buggy/tampered client can't write an arbitrary category
// string into the sheet's Category column.
const CATEGORY_NAMES = new Set([
  'Full-time salary (net)', 'Part-time / gig income', 'Sewa rumah (own rent)',
  "Girlfriend's rent help", 'Petrol', 'Reload (Boost eWallet)', 'Utility',
  'Food (daily)', 'Car sinking fund', 'Emergency Fund Tier 1',
  'Emergency Fund Tier 2 (ASB)', 'Gold savings for Mom', 'Sunday treat',
  'Dobi (laundry)', 'Post-jog drinks', 'PTPTN voluntary payment',
  'Other food', 'Other / Miscellaneous',
]);

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON body' }); }

  const { initData, transactions } = body || {};

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return json(500, { error: 'TELEGRAM_BOT_TOKEN is not configured on the server' });

  const verified = verifyInitData(initData, botToken);
  if (!verified) return json(401, { error: 'Invalid or expired Telegram session' });

  // Optional extra guard: this is a single-user app, so if TELEGRAM_ALLOWED_USER_ID
  // is set, reject anyone else even if they somehow got a validly-signed initData
  // (e.g. the bot token leaked and someone messaged the bot directly).
  const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID;
  if (allowedUserId && String(verified.user && verified.user.id) !== String(allowedUserId)) {
    return json(403, { error: 'This bot is configured for a different Telegram account' });
  }

  if (!Array.isArray(transactions) || !transactions.length) {
    return json(400, { error: 'No transactions to save' });
  }
  for (const t of transactions) {
    if (!(t && typeof t.amount === 'number' && t.amount > 0 && typeof t.date === 'string' && CATEGORY_NAMES.has(t.category))) {
      return json(400, { error: 'Each transaction needs a positive amount, an ISO date, and a known category' });
    }
  }

  const sheetId = process.env.FINANCE_SHEET_ID || REAL_SHEET_ID;
  try {
    const result = await appendTransactions(sheetId, transactions);
    return json(200, { ok: true, ...result });
  } catch (e) {
    return json(502, { error: 'Sheets write failed: ' + e.message });
  }
};

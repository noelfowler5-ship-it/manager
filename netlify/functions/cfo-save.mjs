/* POST /api/cfo/save

   Appends transactions captured in the CFO tab to the real pm-money
   combined sheet's Money - Transactions tab, using a Google service
   account — Telegram's in-app WebView blocks Google's own OAuth sign-in
   screen, so the client-side "Sign in with Google" pattern pm-money itself
   uses in a real browser can't be reused here. */

import { verifyInitData } from './lib/telegram-verify.mjs';
import { getSpreadsheetTabTitles, getValues, batchUpdateValues, resolveTabs, findFirstEmptyRow, fmtSheetDate, a1 } from './lib/sheets-client.mjs';
import { CATEGORY_NAMES } from './lib/cfo-categories.mjs';

export const config = { path: '/api/cfo/save' };

const COMBINED_SHEET_ID = '18gPV_WMHzWHH4zppVu8jGl8Y36rAxknjBv3pD3OivXY';

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

  const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID;
  if (allowedUserId && String(verified.user && verified.user.id) !== String(allowedUserId)) {
    return json(403, { error: 'This bot is configured for a different Telegram account' });
  }

  if (!Array.isArray(transactions) || !transactions.length) return json(400, { error: 'No transactions to save' });
  for (const t of transactions) {
    if (!(t && typeof t.amount === 'number' && t.amount > 0 && typeof t.date === 'string' && CATEGORY_NAMES.has(t.category))) {
      return json(400, { error: 'Each transaction needs a positive amount, an ISO date, and a known category' });
    }
  }

  const sheetId = process.env.CFO_SHEET_ID || COMBINED_SHEET_ID;
  let tab;
  try {
    const titles = await getSpreadsheetTabTitles(sheetId);
    const resolved = resolveTabs(titles);
    if (resolved.missing.length) return json(502, { error: 'Could not find tab(s): ' + resolved.missing.join(', ') });
    tab = resolved.tabs.moneyTransactions;
  } catch (e) {
    return json(502, { error: 'Could not read the spreadsheet: ' + e.message });
  }

  try {
    const colA = await getValues(sheetId, a1(tab, 'A:A'));
    const startRow = findFirstEmptyRow(colA);

    // One write pair per transaction: columns A/B (Date/Category) and D/E
    // (Amount/Notes) only — never C (Type) or F (Month), the sheet's own
    // pre-filled formulas for that row. Mirrors pm-money's buildSyncWrites.
    const data = [];
    transactions.forEach((t, i) => {
      const row = startRow + i;
      data.push({ range: a1(tab, `A${row}:B${row}`), values: [[fmtSheetDate(t.date), t.category]] });
      data.push({ range: a1(tab, `D${row}:E${row}`), values: [[t.amount, t.note || '']] });
    });
    await batchUpdateValues(sheetId, data);
    return json(200, { ok: true, written: transactions.length, startRow });
  } catch (e) {
    return json(502, { error: 'Sheets write failed: ' + e.message });
  }
};

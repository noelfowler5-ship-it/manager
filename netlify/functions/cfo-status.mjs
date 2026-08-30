/* GET /api/cfo/status

   Returns the current month's income/expense/balance, spending by category
   (against budget targets from Money - Budget Plan), and recent
   transactions — everything the CFO tab's summary + capture-duplicate-check
   need, computed server-side against the real pm-money combined sheet since
   the client never holds a full local ledger for this tab (per the "thin
   view, don't reimplement sync logic" instruction). */

import { verifyInitData } from './lib/telegram-verify.mjs';
import { getSpreadsheetTabTitles, getValues, resolveTabs, parseSheetDate, toISO } from './lib/sheets-client.mjs';
import { catInfo } from './lib/cfo-categories.mjs';

export const config = { path: '/api/cfo/status' };

const COMBINED_SHEET_ID = '18gPV_WMHzWHH4zppVu8jGl8Y36rAxknjBv3pD3OivXY';

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async (req) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return json(500, { error: 'TELEGRAM_BOT_TOKEN is not configured on the server' });

  const initData = req.headers.get('x-telegram-init-data') || new URL(req.url).searchParams.get('initData') || '';
  const verified = verifyInitData(initData, botToken);
  if (!verified) return json(401, { error: 'Invalid or expired Telegram session' });

  const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID;
  if (allowedUserId && String(verified.user && verified.user.id) !== String(allowedUserId)) {
    return json(403, { error: 'This bot is configured for a different Telegram account' });
  }

  const sheetId = process.env.CFO_SHEET_ID || COMBINED_SHEET_ID;
  let tabs;
  try {
    const titles = await getSpreadsheetTabTitles(sheetId);
    const resolved = resolveTabs(titles);
    if (resolved.missing.length) return json(502, { error: 'Could not find tab(s): ' + resolved.missing.join(', ') });
    tabs = resolved.tabs;
  } catch (e) {
    return json(502, { error: 'Could not read the spreadsheet: ' + e.message });
  }

  try {
    const rows = await getValues(sheetId, `'${tabs.moneyTransactions}'!A2:E`);
    const today = new Date();
    const ymKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const todayISO = toISO(today);

    let income = 0, expense = 0;
    const byCategory = {};
    const transactions = [];
    rows.forEach(([dateRaw, category, , amountRaw, note]) => {
      const date = parseSheetDate(dateRaw);
      const amount = Number(String(amountRaw ?? '').replace(/[, ]/g, '')) || 0;
      if (!date || !category || !amount) return;
      const iso = toISO(date);
      const type = catInfo(category).type;
      const tx = { date: iso, category, type, amount, note: note || '' };
      transactions.push(tx);
      const rowYmKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (rowYmKey === ymKey) {
        if (type === 'Income') income += amount; else expense += amount;
        byCategory[category] = (byCategory[category] || 0) + amount;
      }
    });

    let budgets = {};
    if (tabs.moneyBudget) {
      try {
        const budgetRows = await getValues(sheetId, `'${tabs.moneyBudget}'!A2:C`);
        budgetRows.forEach(([category, , targetRaw]) => {
          if (!category) return;
          budgets[category] = Number(String(targetRaw ?? '').replace(/[, ]/g, '')) || 0;
        });
      } catch (e) { /* budget tab is optional context — status still works without it */ }
    }

    const today10 = transactions.filter(t => t.date === todayISO);
    const recent = transactions.slice(-10).reverse();

    return json(200, { income, expense, balance: income - expense, byCategory, budgets, recent, today: today10, monthKey: ymKey });
  } catch (e) {
    return json(502, { error: 'Could not read transactions: ' + e.message });
  }
};

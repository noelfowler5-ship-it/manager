import { google } from 'googleapis';

// Must match index.html's SHEET_TAB exactly — the real sheet's tab is
// literally named "Transactions" (the master prompt's "Transaction Log"
// label is documentation shorthand, not the tab's actual name).
const SHEET_TAB = 'Transactions';

// Duplicated from index.html's fmtSheetDate/findFirstEmptyRow rather than
// imported: index.html's logic lives inside an inline <script> block with no
// module boundary the harness can share (see harness.js). Keep any change to
// the date format or column layout in sync with both copies.
function fmtSheetDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month} ${d.getFullYear()}`;
}

function findFirstEmptyRow(columnValues) {
  for (let i = 1; i < columnValues.length; i++) { // skip header at index 0
    const cell = columnValues[i] && columnValues[i][0];
    if (!cell || !String(cell).trim()) return i + 1; // sheet rows are 1-indexed
  }
  return columnValues.length + 1;
}

function getServiceAccountAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not set');
  const key = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  return new google.auth.JWT(
    key.client_email, null, key.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

// Appends transactions into the Transaction Log's pre-formatted rows,
// writing only columns A/B (Date/Category) and D/E (Amount/Notes) — mirrors
// index.html's buildSyncWrites, never touching column C (Type) or F (Month),
// which are the sheet's own pre-filled formulas for that row.
export async function appendTransactions(spreadsheetId, transactions) {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${SHEET_TAB}!A:A`,
  });
  const startRow = findFirstEmptyRow(colA.data.values || [[]]);

  const data = [];
  transactions.forEach((t, i) => {
    const row = startRow + i;
    data.push({ range: `${SHEET_TAB}!A${row}:B${row}`, values: [[fmtSheetDate(t.date), t.category]] });
    data.push({ range: `${SHEET_TAB}!D${row}:E${row}`, values: [[t.amount, t.note || '']] });
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'USER_ENTERED', data },
  });

  return { written: transactions.length, startRow };
}

import { google } from 'googleapis';

// Quoted A1 range helper — tab names contain spaces/dashes ("Money -
// Transactions"), which need quoting in the Sheets API.
export function a1(tab, range) {
  return "'" + String(tab).replace(/'/g, "''") + "'!" + range;
}

/* Sheet dates arrive as whatever the sheet decided to store: ISO, Malaysian
   DD/MM/YYYY, or the "06 Aug 2026" text the Money tab uses. new Date() reads
   DD/MM as MM/DD and silently gives the wrong month, so parse explicitly and
   only fall back to the built-in parser. Verbatim copy of pm-money's
   parseSheetDate (index.html) — keep the two in sync. */
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function parseSheetDate(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (m) {
    const mo = MONTHS_SHORT.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mo >= 0) return new Date(+m[3], mo, +m[1]);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
export function toISO(date) {
  if (!date) return null;
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Matches the "06 Aug 2026" text format already in the Money tab's Date
// column. Verbatim copy of pm-money's fmtSheetDate.
export function fmtSheetDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month} ${d.getFullYear()}`;
}

// First blank row in column A — that's where the sheet's pre-formatted
// formulas in the other columns are waiting for data.
export function findFirstEmptyRow(columnValues) {
  for (let i = 1; i < columnValues.length; i++) {
    const cell = columnValues[i] && columnValues[i][0];
    if (!cell || !String(cell).trim()) return i + 1;
  }
  return columnValues.length + 1;
}

// Tab names are discovered at runtime, not hardcoded — the combined sheet
// prefixes every tab ("Money - Transactions"), and a rename shouldn't
// silently break this. Exact names win; a section+keyword fallback keeps it
// working against an un-merged/renamed sheet too. Mirrors pm-money's
// TAB_SPEC/resolveTabs (index.html), trimmed to what the CFO tab needs.
const TAB_SPEC = [
  { role: 'moneyTransactions', label: 'Money transactions', exact: ['Money - Transactions', 'Transactions'], section: 'money', keyword: 'transactions', required: true },
  { role: 'moneyBudget', label: 'Money budget plan', exact: ['Money - Budget Plan', 'Budget Plan', 'Budget'], section: 'money', keyword: 'budget' },
];
const normKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function resolveTabs(titles) {
  const found = {}, missing = [];
  const list = (titles || []).filter(Boolean);
  for (const spec of TAB_SPEC) {
    let hit = spec.exact.find(name => list.includes(name));
    if (!hit) {
      const wantSection = normKey(spec.section), wantKeyword = normKey(spec.keyword);
      hit = list.find(t => {
        const n = normKey(t);
        return n.indexOf(wantSection) !== -1 && n.indexOf(wantKeyword) !== -1;
      });
    }
    if (hit) found[spec.role] = hit;
    else if (spec.required) missing.push(spec.label);
  }
  return { tabs: found, missing };
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

let cachedSheets = null;
export function getSheetsApi() {
  if (!cachedSheets) cachedSheets = google.sheets({ version: 'v4', auth: getServiceAccountAuth() });
  return cachedSheets;
}

export async function getSpreadsheetTabTitles(spreadsheetId) {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
  return (res.data.sheets || []).map(s => s.properties.title);
}

export async function getValues(spreadsheetId, range) {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values || [];
}

export async function batchUpdateValues(spreadsheetId, data) {
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'USER_ENTERED', data },
  });
}

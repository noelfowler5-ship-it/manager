# Personal CFO

Type what happened with your money. Everything else is automatic.

A personal finance capture app: one text box in, a confirmation card,
budget/net-worth math out. Built as a single offline-first web app — no
account, no server, no build step. Full background and architecture in
[`docs/finance-system-master-prompt.md`](docs/finance-system-master-prompt.md).

This repo (`manager`) is now the primary home for this app — it was carried
over from `personal-cfo`, which is left as-is as a snapshot. Develop here
going forward.

## Status: Phase 1 (capture MVP) + a slice of Phase 2

- Type one or more transactions ("dinner rm10, telur rm12"), the app splits
  them, guesses amount + category, and shows an editable confirmation card
  before saving anything.
- Categories, groups, and monthly budget targets are copied verbatim from the
  real Google Sheet (Monthly Budget Plan) so this app's classification lines
  up with the spreadsheet exactly.
- **Learning loop**: correcting a category on the confirmation card teaches
  the parser that word for next time (stored in `localStorage`, per-word,
  never silently — you always see and can edit the guess first).
- **Duplicate warning**: a same-category, same-amount entry already logged
  today is flagged "possible duplicate" on the confirmation card instead of
  being silently saved twice or silently dropped.
- **Google Sheets sync (Sync tab)**: sign in with Google, point it at a
  spreadsheet ID, and "Sync now" pushes new entries into that sheet's
  `Transactions` tab. It only ever writes to columns A/B (Date/Category) and
  D/E (Amount/Notes) — it never touches column C (Type) or F (Month), which
  are the sheet's own pre-filled formulas. Verified against a dev-copy
  sandbox first; now defaults straight to the real Monthly Budget Plan
  spreadsheet (`1JR4CjH-KyZfyc5ZLTlWNE5SP6cl70P6rxnDzmDQzGa4`). Requires
  GitHub Pages to be enabled on this repo (Settings → Pages → Deploy from
  branch → main → /root) since Google's sign-in requires a stable HTTPS URL
  — once enabled, the app lives at
  https://noelfowler5-ship-it.github.io/manager/
- Data otherwise lives in the browser's `localStorage`. The Log tab's
  "Export CSV" button still works as a manual fallback if you'd rather paste
  rows in by hand.
- Dev-copy spreadsheets (safe to break, same formulas as the real ones) are
  linked below and from the master prompt doc — the real Sheets sync will
  target those first.

- **Telegram Mini App (`telegram.html`)**: a second input channel — type
  transactions from inside Telegram and they go straight to the real sheet
  via a Netlify function + Google service account (Telegram's in-app browser
  can't run the main app's Google sign-in popup). One-time setup is in
  [`TELEGRAM_SETUP.md`](TELEGRAM_SETUP.md). If the backend is unreachable,
  transactions queue in the phone's local storage and sync automatically
  once it's back online — nothing is silently lost.

### Spreadsheets

- Monthly Budget Plan (real, live): `1JR4CjH-KyZfyc5ZLTlWNE5SP6cl70P6rxnDzmDQzGa4`
- Debt-Free & Net Worth Tracker (real, live): `1C9-wZ-kEffI4MVMD3g4tQSpy5wqKuH7rpsL6P8W2N5k`

The dev-copy sandboxes and the combined IMPORTRANGE view used during
development have been deleted now that sync is verified against the real
sheet.

## Running it

No install needed:

1. Download/clone this repo.
2. Double-click `index.html`, or open it in a browser.

Everything works from a double-click except installing it to your phone's
home screen and background sync — those need it served over `http://` or
`https://` (e.g. via a static host like Netlify or GitHub Pages), not opened
as a local file.

## Development

`index.html` is the entire app (HTML + CSS + JS inline) — `manifest.json` and
`service-worker.js` make it installable and offline-capable. `telegram.html`
is a second, independent single-file entry point (the Telegram Mini App) —
see its own doc comment for why its parser/taxonomy are a deliberate copy of
index.html's rather than a shared import.

Before changing the parser or any render logic, run the test suites:

```sh
node test.js               # index.html — parser, render, sync logic
node test-telegram.js      # telegram.html — parser, render, offline queue
node test-telegram-verify.js  # netlify/functions — Telegram initData HMAC check
```

`test.js` and `test-telegram.js` run each app's own JavaScript inside Node
against a stubbed DOM (`harness.js`) and assert against both the parsing
logic and the rendered markup — no browser required. Keep them green. If you
change `index.html`'s `CATEGORIES`, `KEYWORD_MAP`, or parse functions, mirror
the change in `telegram.html` and in
`netlify/functions/telegram-save.mjs`'s category allowlist — see the comment
at the top of `telegram.html`'s script for details.

## Roadmap

See §14 of the master prompt for the full phase breakdown. Short version:

1. **Phase 1 (here):** local-only capture + budget dashboard.
2. **Phase 2:** real Google Sheets read/write (OAuth + Sheets API v4),
   categorization learning, duplicate detection.
3. **Phase 3:** transfers/investments/net-worth semantics, reading the
   existing Debt-Free & Net Worth Tracker's payoff engine into the dashboard,
   threshold alerts.
4. **Phase 4:** recurring bills, weekly summary. Telegram capture (this
   phase's other item) has landed early — see `telegram.html` above.

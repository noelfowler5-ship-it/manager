# Personal Finance Capture System — Master Build Prompt

This document is the finished output of the interview in the design conversation
that led to this repo. It records the interview answers, the defaults used for
the round of questions nobody answered live, and the full architecture this app
is being built toward across its phases.

---

## 0. Interview answers used to derive this spec

**Round 1**
1. Spreadsheet: Google Sheets
2. Source of truth: Google Sheets
3. Entry method: type into the app (no Telegram for v1)
4. Ask when info missing: Yes
5. Categories: user's real list (see §3)
6. Auto-create categories: Suggest first, user approves
7. Accounts/payment methods: not enumerated — treat payment method as free-text/optional, inferred with a small default set (Cash, Bank, E-wallet, Card) rather than a rigid list
8. Scope: full personal finance — income + expenses + transfers + investments + assets + debts + net worth
9. Investments connected to the same ledger: Yes
10. Automation level: C — fully automated (parse → sheet → budget → net worth → anomaly detection → reports)
11. AI provider: free-first (use free-tier APIs wherever possible)
12. Target cost: RM0/month if possible
13. Security: whatever is most secure/practical
14. Dashboard: current cash, monthly spending, budget remaining (kept prominent; net worth/investments/emergency fund tracked but not front-and-center)
15. North star: "I know where my money actually goes."

**Round 2 — defaulted to the recommended option on every question, since no
further reply was available and every prior recommendation had been accepted
as-is:**

1. Category structure split into Income / Expenses / Savings-Transfers / Transfers — adopted (superseded once the real sheet was read; see §3).
2. Transfers detected as account-to-account moves, not expenses.
3. Investment buys/sells/dividends update cash, portfolio, and net worth together.
4. Natural-language corrections teach the categorizer for next time.
5. When confidence is low, the system asks before saving rather than guessing.
6. Net worth, emergency-fund progress, investment value, and income-vs-spending are tracked and available, just not on the primary 3-widget dashboard.
7. Reporting cadence: daily micro-summary + monthly report as the core.
8. This becomes the user's main personal finance system; the daily interface stays a single text box.

**Round 3 — real data.** The user's actual Google Sheets were read directly
(two spreadsheets: a Monthly Budget Plan/Dashboard workbook, and a Debt-Free &
Net Worth Tracker). The real category/group taxonomy, real budget targets, and
a working Planned-vs-Actual dashboard already existed there — this app now
matches that schema exactly rather than the interview's earlier guess. See §3
and §4.

---

## 1. Master role instruction

> You are acting simultaneously as Product Architect, Senior Full-Stack
> Engineer, Financial Data Architect, Automation Engineer, UX Designer,
> Security Engineer, and QA Engineer for a personal finance capture system.
>
> The single design principle overriding every other decision:
> **the user's only recurring job is to report what happened with their
> money, in plain sentences. Everything else — parsing, classification,
> recording, reconciliation, budgeting, and analysis — is the system's job.**
> Do not add multi-field forms, dropdown pickers, or multi-step wizards to
> the daily flow. If a feature would require the user to answer more than
> one clarifying question per transaction in the common case, redesign it.

---

## 2. Core workflow

```
User types (one line per transaction, or several separated by commas):
  "dinner rm10, telur rm12, apple rm12.50"

Parser splits into N candidate transactions and extracts per transaction:
  amount, raw text, category (type/group auto-derived from category),
  note, confidence score

If confidence is high → auto-fill the category.
If confidence is low → the confirmation card itself is the one clarifying
  question: category ships pre-filled with the best guess but editable
  inline, exactly like the real sheet's "Type (auto)" column derives from
  the category the user picks.

On confirmation:
  → append row(s) to the Transaction Log (Google Sheets = source of truth)
  → recompute budget remaining, cash position, and monthly totals
  → (Phase 3+) check thresholds → fire warnings if something is unusual
```

Multiple items in one message are always separate transactions, never summed.

---

## 3. Category structure — verbatim from the user's real Google Sheet

Read directly from the "Reference Lists" and "Monthly Budget Plan" tabs of
the user's live spreadsheet (`1JR4CjH-KyZfyc5ZLTlWNE5SP6cl70P6rxnDzmDQzGa4`):

| Category | Type | Group | Monthly target (RM) |
|---|---|---|---|
| Full-time salary (net) | Income | Income | 1,942.95 |
| Part-time / gig income | Income | Income | 0 |
| Sewa rumah (own rent) | Expense | Fixed | 250 |
| Girlfriend's rent help | Expense | Fixed | 0 |
| Petrol | Expense | Fixed | 150 |
| Reload (Boost eWallet) | Expense | Fixed | 100 |
| Utility | Expense | Fixed | 20 |
| Food (daily) | Expense | Fixed | 300 |
| Car sinking fund | Expense | Savings | 120 |
| Emergency Fund Tier 1 | Expense | Savings | 150 |
| Emergency Fund Tier 2 (ASB) | Expense | Savings | 350 |
| Gold savings for Mom | Expense | Family | 0 |
| Sunday treat | Expense | Lifestyle | 100 |
| Dobi (laundry) | Expense | Lifestyle | 44 |
| Post-jog drinks | Expense | Lifestyle | 91 |
| PTPTN voluntary payment | Expense | Optional | 0 |
| Other food | Expense | Lifestyle | 0 |
| Other / Miscellaneous | Expense | Other | 0 |

Notes/gaps carried forward on purpose rather than silently patched:
- "Type" is not Income/Expense/Transfer/Investment as the interview assumed —
  it's just Income/Expense in the real sheet, and things like "Reload (Boost
  eWallet)" and the two Emergency Fund tiers are logged as **Expense**, not as
  transfers. The app matches this real behavior in Phase 1 rather than
  introducing transfer semantics the spreadsheet doesn't have yet.
- There is no generic "other income" category (a one-off gift or refund has
  nowhere obvious to go). The app flags these as low-confidence and asks
  rather than mis-filing them under an expense category.
- Savings/Family/Lifestyle/Optional/Other are the real Group taxonomy powering
  the existing Dashboard tab's "Spending by Group" table — keep using it.

New categories are never created silently. Any future auto-suggestion flow
proposes first and waits for approval, per the interview answer.

---

## 4. Google Sheets — two real spreadsheets, not a new schema

Unlike the original design assumption (one spreadsheet, invented from
scratch), the user already has two working spreadsheets with live formulas.
The app is being built to read/write **these**, not a new data model:

**Spreadsheet 1 — Monthly Budget Plan/Dashboard**
(prod: `1JR4CjH-KyZfyc5ZLTlWNE5SP6cl70P6rxnDzmDQzGa4`, dev copy:
`1ekeCCnMgfsF43ihrnTv8GENnS3FreQSKBaFxR5xlR8A`)
- `Transaction Log` — Date, Category (dropdown), Type (auto formula from
  Category), Amount (RM), Notes, Month (auto formula). ~300 pre-formatted
  rows.
- `Monthly Budget Plan` — Category, Group, Monthly Target (RM), Notes.
- `Dashboard` — month/year picker, Planned vs Actual vs Variance per
  category, Spending by Group, lifetime savings snapshot.
- `Reference Lists` — Category/Type/Group lookup that powers every dropdown
  elsewhere; also Month and Year lists.

**Spreadsheet 2 — Debt-Free & Net Worth Tracker**
(prod: `1C9-wZ-kEffI4MVMD3g4tQSpy5wqKuH7rpsL6P8W2N5k`, dev copy:
`16wwGvlMEntg7Nd_zqn-JsSrWYuQMTMY8b3Xqzbh2ogE`)
- `Dashboard` — net worth, total debt remaining, time to debt-free, projected
  debt-free date, total interest, strategy in use (Snowball/Avalanche).
- `Debts` — Debt Name, Type, Current Balance, APR/Ujrah Rate, Min. Payment,
  Priority, Months to Payoff, Est. Payoff Date. (Real data: PTPTN Study Loan,
  RM20,000, 1% ujrah, Avalanche.)
- `Payoff Schedule` — auto-generated month-by-month amortization engine.
- `Net Worth & EPF/KWSP` — EPF growth projection (balance, own + employer
  contribution, assumed dividend rate) and Other Assets (cash savings, ASB,
  Moomoo).
- `Monthly Check-in` — manual monthly log: Date, EPF Balance, Other Assets,
  Total Debts, Net Worth.

Both dev copies were made via Drive's copy operation, which preserves every
formula and automation — they are safe sandboxes to build and test the Sheets
integration against before it ever touches the real spreadsheets.

A third spreadsheet, **"Personal CFO — Combined View (live)"**
(`1CS4OgbHurSez6YMzG_OqbCcoS4vw97n-qf2i96z3FRw`), combines both dev copies
into one file: each of its tabs is a single `IMPORTRANGE` formula pulling the
matching tab from one of the two dev copies, so it stays live rather than
being a frozen snapshot. (A full binary merge — copying every sheet's cells,
styles, and formulas into one workbook — was attempted first but produced an
unwieldy multi-hundred-KB file not worth the overhead; `IMPORTRANGE` gives
the same "one place to look" result far more cheaply and stays in sync
automatically.) Opening it for the first time will prompt to "Allow access"
once per source spreadsheet — that's Google Sheets' normal `IMPORTRANGE`
authorization step, not an error.

---

## 5. AI expense parser — rules

- Input: one free-text message, possibly containing multiple transactions
  separated by commas/newlines.
- Split into candidate transactions first, then parse each independently.
- Extract: amount (required — RM-prefixed number preferred, else the first
  bare number), and a note (whatever text is left after removing the amount).
- Malay/English code-switching supported natively ("beli telur", "rm30
  church offering").
- Category guess via keyword lookup (Phase 1: static table; Phase 2+: learned
  per-merchant mapping, LLM fallback for anything unmatched). Type and Group
  are always derived from the matched category, exactly like the sheet's
  auto-formula — never guessed independently.
- Confidence scoring per transaction. Below-threshold guesses still populate
  the confirmation card (never silently save), with an explicit "check
  category" flag so the user's one required action is reviewing that field
  before hitting Save.
- Duplicate prevention (Phase 2+): hash of normalized amount + description +
  date-minute bucket before insert.

---

## 6. Categorization + learning loop (Phase 2+)

1. Parser proposes a category via the keyword table.
2. User corrections (via the confirmation card, or later via natural-language
   replies) get written to a corrections log and folded back into the
   keyword/merchant lookup table — not just a one-off override.
3. New categories always go through propose-then-approve, never silent
   creation, and get added to the real sheet's `Reference Lists` tab so every
   dropdown there picks them up too.

---

## 7. Budget, net worth, and alerting

- Budget remaining per category = `monthly_budget - sum(expenses this month
  in that category)` — same math as the existing Dashboard tab, recomputed
  client-side in Phase 1 and eventually mirrored back into the Sheet.
- Net worth = cash + investments/savings + EPF − debts, matching Spreadsheet
  2's existing engine (do not reimplement the amortization math — read it).
- Alerts (Phase 3+): category over budget, spend pace implies blowing the
  month's total, unusually large single transaction, overdue recurring bill.
- Reporting cadence: daily micro-summary + monthly report (weekly deferred,
  cheap to add later from the same aggregation code).

---

## 8. Automation architecture

- Phase 1 (current): fully client-side, localStorage as the working store,
  CSV export as the manual bridge into the real Transaction Log tab.
- Phase 2: wire real Google Sheets read/write via OAuth (Google Identity
  Services token client) + Sheets API v4, targeting the **dev copies** first.
  Every write recomputes budgets/balances client-side immediately, matching
  what the Sheet's own formulas would show.
- Phase 3: time-based triggers (daily/monthly digest, net-worth snapshot),
  either via Apps Script bound to the Sheet, or a small serverless function.

---

## 9. Error handling, audit trail, backup

- Transactions are append-only; corrections are new entries referencing the
  original, never in-place edits, so history is always reconstructable.
- Google Sheets' own version history remains the baseline backup once Sheets
  sync lands; add a scheduled export for extra safety.
- Never let a partially-parsed transaction get silently saved — the
  confirmation-card step in Phase 1 already enforces this by construction.

---

## 10. Security

- No financial data leaves the user's own Google account — the app is a thin
  client over their existing Sheets, not a separate database.
- When Sheets OAuth is added: narrowest scope needed (`spreadsheets`, ideally
  file-scoped rather than full Drive), no tokens committed to the repo, real
  spreadsheet IDs only ever touched after the dev-copy integration is proven.
- If a Telegram bot is added later, treat its token/chat ID as a secret with
  the same care.

---

## 11. Tech stack (free-first)

- Front end: single-file offline-first web app (this repo) — no build step,
  no npm, works installed to a phone home screen.
- Local storage: `localStorage` as the Phase 1 source of truth (records are
  small; well under the ~5MB budget). No IndexedDB needed at this data
  volume.
- Sheets sync (Phase 2): Google Identity Services + Sheets API v4 from the
  client — no backend server required for a single user.
- AI parsing (Phase 2+, only if the static keyword table stops being enough):
  Gemini free-tier API, behind a swappable interface.
- Hosting: any free static host (Netlify/Vercel/GitHub Pages).

---

## 12. UI/UX spec

- One primary screen (Capture): a text box, a Parse action, and a
  confirmation card per detected transaction with the amount/category/note
  editable inline — no separate multi-field form.
- Dashboard shows exactly current cash, monthly spending, budget remaining up
  top; a full Planned-vs-Actual-vs-Variance table (mirroring the real Sheet's
  Dashboard tab) below it.
- Budget tab lets the blue numbers (targets) be edited directly, matching the
  real sheet's own colour convention (blue = yours to edit).
- Log tab is the full transaction history plus CSV export.

---

## 13. Testing requirements

- Parser unit tests against the interview's real example inputs (`dinner
  rm10`, `beli telur 12, apple 12.50`, `Netflix 17.90`, `rent 500`,
  `received salary 1900`, `mom gave me RM100`, `reload boost RM150`, `RM30
  church offering`) — each asserting the correct category/amount/type split.
- Multi-transaction split tests (comma-separated input never collapses into
  one summed transaction).
- Render tests for every tab in both the empty state and after a save, with
  an `undefined`/`NaN` sweep over the rendered markup.
- Run via `node test.js` against `harness.js` (a headless DOM stub) before
  any change ships — see the repo README.

---

## 14. Phased implementation plan

**Phase 1 — Capture MVP (done, this repo's current state)**
Text input → parser → confirmation card → localStorage. Real category/group
taxonomy and real budget targets seeded from the live sheet. Dashboard shows
the three core numbers plus a full Planned-vs-Actual table. CSV export as the
manual bridge to the real Transaction Log tab.

**Phase 2 — Real Google Sheets sync**
Done: per-word categorization learning, same-day duplicate flagging, and
real Google Sheets read/write via a Sync tab (Google Identity Services
token client + Sheets API v4). Sync writes only to columns A/B/D/E
(Date/Category/Amount/Notes), leaving the sheet's own Type/Month formula
columns untouched. Verified end-to-end against a dev-copy sandbox, then
switched to default straight at the real Monthly Budget Plan spreadsheet;
the dev copies and the combined IMPORTRANGE view have since been deleted.
Requires GitHub Pages enabled on the repo (a stable HTTPS origin is a hard
requirement of Google's OAuth flow) — live at
https://noelfowler5-ship-it.github.io/personal-cfo/
Remaining: nothing blocking for MVP sync; categorization learning could
later move from words to full merchant-name matching if it proves too
coarse in practice.

**Phase 3 — Transfers, investments, net worth, alerts**
Proper transfer/investment semantics (once the underlying sheet grows a
Transfer/Investment type, or a parallel investments sheet is introduced);
read Spreadsheet 2's existing net-worth/debt-payoff engine into the
dashboard; threshold alerts; daily/monthly digest.

**Phase 4 — Polish**
Recurring-bill tracking, optional Telegram capture as a second input surface,
weekly summary.

---

## 15. Non-negotiable directive

Do not over-engineer the daily user experience. The user's job is simply to
report what happened with their money. The system's job is to understand,
classify, record, reconcile, and analyze it. Every design decision that adds
friction to "type a sentence, confirm, done" needs a very good reason.

# Personal Manager

A single Telegram Mini App for one user (Noel): five tabs — Dashboard, TikTok,
CFO, YouTube, Bible — client-side routed inside one `index.html`, opened
through Telegram's bot menu button. Not five separate Mini Apps: that shape
was considered and rejected (janky navigation, 5x the maintenance for no
benefit at solo-user scale).

## Status

**Built: TikTok Affiliate Hub, Personal CFO, Dashboard, Daily Bible.**
YouTube is intentionally skipped, not just unbuilt:

1. ✅ **TikTok Affiliate Hub** — see below.
2. ✅ **Personal CFO** — reads/writes the real `± money` combined sheet
   (`noelfowler5-ship-it/pm-money`) via a Netlify function + Google service
   account, since Telegram's in-app WebView blocks Google's own OAuth sign-in
   screen (the pattern `pm-money` itself uses in a real browser). One-time
   setup: [`CFO_SETUP.md`](CFO_SETUP.md).
3. ✅ **Dashboard** — home tab, is also the default landing tab now. Summary
   cards for TikTok (last-7-days views/engagements + compliance status) and
   CFO (this month's income/expenses/balance, fetched automatically at
   launch) pull real numbers; the Bible card shows today's verse. YouTube's
   card stays a plain "deferred" note.
4. 🚫 **YouTube Analyzer** — deliberately skipped: there's no YouTube channel
   to analyze yet. Revisit once there is one; the trade-off between an
   API-key-only build (views/subscribers/growth) and adding OAuth for
   Click-Through Rate/Watch Time (one-time consent in a real mobile browser,
   refresh token kept server-side) is still open.
5. ✅ **Daily Bible (Renungan)** — hand-written, not AI-generated: 12 fixed
   verse+reflection pairs selected deterministically by day-of-year (repeats
   on a cycle, not random), plus a Gospel-of-Matthew reading plan (one
   chapter per weekday, Sunday reserved for reflection) with a
   check-off-the-day checklist in `localStorage`. No server.

## TikTok Affiliate Hub

For `@ultramain`, TikTok Shop Creator (yellow-bag affiliate links, kitchen
gadgets + skincare, RM5–200). Text and numbers only — no video generation, no
auto-editing, no auto-posting (TikTok's Direct Post API was evaluated and
explicitly declined). CapCut and TikTok's native scheduler stay external.

- **Products** — a small catalog: name, price, problem (noun phrase), benefit
  (predicate phrase), and an optional limited-stock flag that gates urgency
  wording (no manufactured scarcity on a product that isn't actually limited
  — a real compliance risk for affiliates).
- **Generate** — per product, captions for 3 angles (question / POV /
  price-shock) × 3 languages (BM Santai / English / Mix), and a TOC
  (on-screen text) script from a clip duration: ~3.5s/scene, a fixed
  beat-sequence table per scene count (not computed on the fly, so output
  stays predictable), scene 1 always matches the caption's hook line, the
  last scene is always the CTA.
- **Plan week** — 7 manual slots (Mon–Sun), each a product + angle. Marking a
  slot a repost without also marking its opening 1–3 seconds changed raises a
  warning — TikTok suppresses an unmodified repost as a duplicate.
- **Performance** — CSV import from TikTok Creator Center's analytics export
  (fuzzy header matching, since export columns vary), plus manual entry.
  Re-importing updates existing rows by video ID instead of duplicating.
  Reads are treated as "settling" for the first 7 days (videos take about a
  week to reach ~90% of lifetime views) and "best hook per product" only
  shows once there are 3+ settled posts — one post is noise.
- **Compliance** — a real 14 Aug 2026 enforcement means claims must be
  feature-based ("safe", "comfortable", "easier"), never health-outcome based
  ("solves fatigue", "reduces pain", "in 2 weeks"). Every generated caption
  and script is scanned for that pattern and flagged — it won't silently
  ship the wording, but the pattern match isn't exhaustive, so read before
  posting regardless.

## Personal CFO

A thin view over `pm-money`'s Money section — does not reimplement its
parser, categorization, or sync logic, just calls the same taxonomy against
the same combined sheet. Read/write goes through a Netlify function using a
Google service account rather than the interactive Google sign-in the
`pm-money` web app uses, since Telegram's WebView blocks that sign-in screen.

- **Capture** — same flow as `pm-money`/`personal-cfo`: type one or more
  transactions, editable confirmation card per line (category pre-filled,
  correctable — a correction teaches the parser that word for next time),
  save. A same-category same-amount entry logged today is flagged as a
  possible duplicate before saving.
- **This month** — income, expenses, balance, computed server-side from the
  real `Money - Transactions` tab.
- **Spending by category** — actual vs. budget target, read from
  `Money - Budget Plan`.
- **Recent transactions** — last 10, newest first.
- Offline-safe the same way the TikTok Hub content is: a save that can't
  reach the backend queues in `localStorage` and retries automatically once
  back online — never silently lost, never silently duplicated on retry.

Setup (service account, env vars): [`CFO_SETUP.md`](CFO_SETUP.md).

## Dashboard

The default landing tab. Pulls real numbers from whichever tabs have data —
no separate mock numbers to keep in sync. CFO's summary is fetched once at
app launch (not only when the CFO tab is opened) so the card isn't blank on
the tab you actually land on; if that fetch hasn't resolved yet (or failed),
the card shows a "Load CFO summary" button instead of a misleading zero.

## Daily Bible (Renungan)

Static content, not generated at request time — both the daily
verse/reflection and the reading plan are selected deterministically from
the calendar date (day-of-year for the reflection, week-since-a-fixed-Monday
for the reading plan), so "today's" content is the same if you check it
five times and cycles forward tomorrow rather than repeating or randomizing.
The only interactivity is checking off a reading-plan day, stored in
`localStorage` — no AI calls, no server.

## Running it

No install needed — download/clone, open `index.html` in a browser. Outside
Telegram it falls back to a plain "Save"-style UI (no `window.Telegram`); the
generators, planner, and performance tracking all work the same either way,
since all of it is local storage right now.

## Development

Single-file app (`index.html`, HTML/CSS/JS inline) — no build step, no npm,
same shape as this account's other browser apps. `manifest.json` /
`service-worker.js` make it installable and offline-capable.

Before changing generator, planner, or parser logic, run the tests:

```sh
node test.js                  # TikTok Hub + CFO domain logic and render
node test-telegram-verify.js  # Telegram initData HMAC check (used by both Netlify functions)
```

`test.js` runs the app's own JavaScript inside Node against a stubbed DOM
(`harness.js`) — no browser required, `fetch` is stubbed to always reject so
the CFO tab's offline-queue path is exercised automatically. Keep it green,
and when you touch a generator, print a few real outputs and read them — the
test suite checks structure (right scene count, non-empty, capitalized,
flagged when it should be) but broken-but-structurally-valid grammar won't
fail a single assertion.

CFO's parser/taxonomy (`CFO_CATEGORIES`, `CFO_KEYWORD_MAP`, etc. in
`index.html`) is a duplicate of `pm-money`'s (same reasoning as the TikTok
Hub logic — no module boundary the harness can share), and
`netlify/functions/lib/cfo-categories.mjs` is a third copy for server-side
validation. If `pm-money`'s categories or keyword rules change, update all
three. `netlify/functions/lib/telegram-verify.mjs` (HMAC validation of
Telegram's signed `initData`) is generic and shared by both Netlify
functions unchanged.

## Design reference

Built to the style of the mockup at
`claude.ai/code/artifact/495f62a0-67f1-4d6d-8f1a-be40a9771785`: white
background, coral accent `#d97757`, `#999` secondary text, system-ui font
stack, 390×844 mobile-first frame. The mockup's TikTok screen content itself
(video upload, "Generate Video", AI learning progress) was an earlier,
different concept — deferred, needs a paid subscription — so only its visual
style carried over, not its layout.

## History

This repo was carried over from `personal-cfo` (a Phase 1/2 finance capture
app) and briefly held a capture-only Telegram Mini App pointed at that app's
Google Sheet. Both are now superseded: `pm-money` replaced `personal-cfo`
(and Signalvest) with one combined spreadsheet before that Telegram channel
was ever deployed against real data, so this repo's CFO tab will be built
against `pm-money`'s sheet instead. `personal-cfo` and `pm-money` remain live
on their own as their own apps.

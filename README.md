# Personal Manager

A single Telegram Mini App for one user (Noel): five tabs — Dashboard, TikTok,
CFO, YouTube, Bible — client-side routed inside one `index.html`, opened
through Telegram's bot menu button. Not five separate Mini Apps: that shape
was considered and rejected (janky navigation, 5x the maintenance for no
benefit at solo-user scale).

## Status

**Built: TikTok Affiliate Hub.** Everything else is a placeholder panel in
the tab bar, in build-priority order:

1. ✅ **TikTok Affiliate Hub** — this pass.
2. ⬜ **Personal CFO** — next. Reads/writes the real `± money` combined sheet
   (`noelfowler5-ship-it/pm-money`) via a Netlify function + Google service
   account, since Telegram's in-app WebView blocks Google's own OAuth sign-in
   screen (the pattern `pm-money` itself uses in a real browser).
3. ⬜ **Dashboard** — home tab, summary cards pulling from the other four.
4. ⬜ **YouTube Analyzer** — views/subscribers need only a free API key;
   Click-Through Rate/Watch Time need a one-time OAuth consent done in a real
   mobile browser (same WebView block as Sheets), with the refresh token kept
   server-side. Confirm that trade-off is worth it before building it.
5. ⬜ **Daily Bible (Renungan)** — static content + `localStorage` checkmarks,
   no server.

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

## Running it

No install needed — download/clone, open `index.html` in a browser. Outside
Telegram it falls back to a plain "Save"-style UI (no `window.Telegram`); the
generators, planner, and performance tracking all work the same either way,
since all of it is local storage right now.

## Development

Single-file app (`index.html`, HTML/CSS/JS inline) — no build step, no npm,
same shape as this account's other browser apps. `manifest.json` /
`service-worker.js` make it installable and offline-capable.

Before changing generator or planner logic, run the tests:

```sh
node test.js                  # TikTok Hub domain logic + render
node test-telegram-verify.js  # Telegram initData HMAC check (for the CFO tab, next)
```

`test.js` runs the app's own JavaScript inside Node against a stubbed DOM
(`harness.js`) — no browser required. Keep it green, and when you touch a
generator, print a few real outputs and read them — the test suite checks
structure (right scene count, non-empty, capitalized, flagged when it should
be) but broken-but-structurally-valid grammar won't fail a single assertion.

`netlify/functions/lib/telegram-verify.mjs` (HMAC validation of Telegram's
signed `initData`) is already in place from an earlier capture-only
prototype of this project and will be reused as-is for the CFO tab's Netlify
function — nothing to change there yet.

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

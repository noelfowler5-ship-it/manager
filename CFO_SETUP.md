# CFO tab setup

The CFO tab reads and writes your real `± money` spreadsheet
(`noelfowler5-ship-it/pm-money`'s combined sheet) through a Netlify function,
using a Google **service account** — a robot Google identity, not your own
sign-in. This is needed because Telegram's in-app browser blocks Google's own
"Sign in with Google" screen, which is what the `pm-money` web app itself
uses.

About 10 minutes, once.

## 1. Get your Telegram bot's token (if you don't already have it)

You're reusing your existing idle bot, not creating a new one.

1. Open Telegram, message **@BotFather**.
2. Send `/mybots`, pick your bot.
3. **API Token** shows the token (`123456789:AAH...`). Copy it — this is
   `TELEGRAM_BOT_TOKEN` below. Treat it like a password.
4. While you're there: **Bot Settings → Menu Button → Configure Menu
   Button** — paste this Mini App's Netlify URL (the one you already
   deployed, e.g. `https://lucent-toffee-23d139.netlify.app/`). No path
   suffix needed — the whole app is one page now.

## 2. Create a Google service account

1. Go to https://console.cloud.google.com/ and create a project (any name,
   or reuse one).
2. Search for **Google Sheets API**, click **Enable**.
3. **APIs & Services → Credentials → Create Credentials → Service account**.
   Any name (e.g. "personal-manager-cfo").
4. Open it → **Keys** tab → **Add key → Create new key → JSON**. This
   downloads a `.json` file. Don't commit it anywhere.
5. Copy the `client_email` value from that file (looks like
   `personal-manager-cfo@your-project.iam.gserviceaccount.com`).
6. Open the real **`± money`** Google Sheet, click **Share**, share it with
   that `client_email` as **Editor**.
7. Base64-encode the whole JSON file — this becomes
   `GOOGLE_SERVICE_ACCOUNT_KEY` below:
   - Mac/Linux: `base64 -i /path/to/the-key.json | tr -d '\n'`
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\the-key.json"))`

## 3. Set Netlify environment variables

**Site configuration → Environment variables → Add a variable**:

| Key | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | from step 1.3 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | the base64 string from step 2.7 |
| `TELEGRAM_ALLOWED_USER_ID` | optional but recommended — your numeric Telegram user ID (message **@userinfobot** to get it); the CFO tab only ever accepts writes from this account if set |
| `CFO_SHEET_ID` | optional — only if you want the CFO tab pointed at a different sheet than the app's default (`18gPV_WMHzWHH4zppVu8jGl8Y36rAxknjBv3pD3OivXY`, `pm-money`'s combined sheet) |

Trigger a redeploy after adding these (Netlify usually does this
automatically).

## 4. Test it

1. Open the bot in Telegram, tap the menu button, go to the **CFO** tab.
2. You should see this month's income/expenses/balance and category
   breakdown, read live from the sheet.
3. Type `dinner rm10` in the capture box, tap **Parse**, then **Save all**.
4. Check the `Money - Transactions` tab of the real sheet — a new row
   should appear within a few seconds. If it doesn't, check Netlify's
   function logs (**Functions → cfo-save**) for the error.

## How it behaves if something's wrong

- CFO tab can't reach the backend at all → shows a clear "couldn't reach the
  CFO backend" card instead of a blank screen, with a Retry button.
- Save fails specifically (bad env var, offline phone, cold start timeout) →
  the transaction is queued in the phone's local storage instead, and
  retried automatically next time the app is open and online. Nothing is
  silently lost.
- Only writes columns A/B (Date/Category) and D/E (Amount/Notes) of
  `Money - Transactions` — never C (Type) or F (Month), the sheet's own
  formulas.
- To revoke access: remove the service account's Editor access from the
  sheet's Share dialog, or revoke the bot token via BotFather.

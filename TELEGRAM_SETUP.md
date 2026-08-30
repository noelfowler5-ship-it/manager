# Telegram Mini App setup

This lets you type transactions to Personal CFO from inside Telegram, and
have them go straight into your real Google Sheet — the same sheet the main
app's Sync tab writes to. It's a second way in, not a replacement: the main
app (`index.html`) still works exactly the same as before.

You'll need about 15 minutes and access to your Google account. Do these
steps in order — nothing after step 1 works until the step before it is done.

## 1. Create the Telegram bot (5 min)

1. Open Telegram, search for **@BotFather**, and start a chat with it.
2. Send `/newbot`. Give it a name (shown to you, e.g. "Personal CFO") and a
   username ending in `bot` (e.g. `personal_cfo_bot` — must be unique).
3. BotFather replies with a **token** that looks like
   `123456789:AAH...`. Copy it somewhere safe — this is the
   `TELEGRAM_BOT_TOKEN` you'll paste into Netlify in step 4. Anyone with this
   token can control your bot, so treat it like a password.
4. Send BotFather `/mybots` → pick your bot → **Bot Settings** →
   **Menu Button** → **Configure Menu Button**. When it asks for a URL,
   you'll come back and paste your Netlify site's URL + `/telegram.html`
   once step 3 is done (e.g. `https://your-site.netlify.app/telegram.html`).
   It's fine to leave this step half-done for now and return to it later.

## 2. Create a Google service account (5 min)

The main app signs in as *you* (OAuth). The Telegram bot can't do that
reliably inside Telegram's in-app browser, so it uses a **service account**
instead — a robot Google identity that only has access to the one
spreadsheet you explicitly share with it.

1. Go to https://console.cloud.google.com/ and create a project (or reuse
   one you already have for this).
2. In the search bar, find **Google Sheets API** and click **Enable**.
3. Go to **APIs & Services → Credentials → Create Credentials → Service
   account**. Give it any name (e.g. "personal-cfo-telegram").
4. Open the service account you just created → **Keys** tab → **Add key →
   Create new key → JSON**. This downloads a `.json` file — keep it, don't
   commit it anywhere.
5. Open that JSON file and copy the `client_email` value (looks like
   `personal-cfo-telegram@your-project.iam.gserviceaccount.com`).
6. Open your real **Monthly Budget Plan** Google Sheet, click **Share**, and
   share it with that `client_email` address as **Editor**.
7. Base64-encode the whole JSON file's contents — you'll paste the result
   into Netlify in step 4:
   - Mac/Linux: `base64 -i /path/to/the-key.json | tr -d '\n'`
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\the-key.json"))`

## 3. Deploy to Netlify (3 min)

1. Go to https://app.netlify.com/, **Add new site → Import an existing
   project**, and connect this GitHub repo.
2. Build command: leave blank. Publish directory: `.` (repo root). Netlify
   will pick up `netlify.toml` automatically for the functions folder.
3. Deploy once (it'll fail to *use* Telegram until step 4's env vars are
   set, but the site itself will build fine — `index.html` doesn't need any
   of this).

## 4. Set environment variables (2 min)

In Netlify: **Site configuration → Environment variables → Add a variable**,
one at a time:

| Key | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | the token from step 1.3 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | the base64 string from step 2.7 |
| `FINANCE_SHEET_ID` | optional — only set this if you want the Telegram bot writing to a different sheet than the app's default (`1JR4CjH-KyZfyc5ZLTlWNE5SP6cl70P6rxnDzmDQzGa4`) |
| `TELEGRAM_ALLOWED_USER_ID` | optional but recommended — your own numeric Telegram user ID (message **@userinfobot** to get it), so the bot only ever accepts transactions from you |

Trigger a redeploy after adding these (Netlify usually does this
automatically, or use **Deploys → Trigger deploy**).

## 5. Point the bot at the deployed Mini App

Back in @BotFather: `/mybots` → your bot → **Bot Settings → Menu Button →
Configure Menu Button** → paste `https://your-site.netlify.app/telegram.html`
(your real Netlify URL + `/telegram.html`).

## 6. Test it

1. Open your bot in Telegram, tap the menu button (bottom-left, next to the
   text box) to open the Mini App.
2. Type `dinner rm10` and tap **Parse**, then **Save**.
3. Check your real Google Sheet's `Transactions` tab — a new row should
   appear within a few seconds. If it doesn't, check Netlify's function logs
   (**Functions → telegram-save**) for the error message.

## How it behaves if something's wrong

- If the backend call fails for any reason (bad env var, offline phone, cold
  start timeout), the transaction is saved to the phone's local storage
  instead and retried automatically next time the app is open and online —
  nothing is silently lost. The Mini App shows "N transaction(s) saved
  offline" until they sync.
- The bot only ever writes columns A/B/D/E of the `Transactions` tab (Date,
  Category, Amount, Notes) — same as the main app's sync, never touching the
  Type/Month formula columns.
- If you ever want to revoke the bot's access, either revoke the token via
  BotFather's `/revoke` (or `/deletebot`), or remove the service account's
  Editor access from the sheet's Share dialog — either one fully disables
  writes without touching your data.

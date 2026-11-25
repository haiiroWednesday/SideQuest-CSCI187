# Turning on Google Calendar and Google walking routes

Everything stays off until these steps are done. Keys and secrets go only into the server's protected environment (Render or a local `.env` that Git ignores), never into the browser, Git, screenshots or chat.

## 1. Google Cloud project

- [ ] Create one project for SideQuest at console.cloud.google.com (for example `sidequest-csci187`).
- [ ] Turn on **Google Calendar API** and **Routes API**. Turn on **Places API (New)** only if you want place hours and photos.
- [ ] Set up billing for the project, because the Maps APIs require it. Set a budget alert with a low cap.

## 2. OAuth consent screen (Calendar)

- [ ] User type **External**, publishing status **Testing**.
- [ ] App name SideQuest, support email, and the app home page.
- [ ] Scopes:
  - `.../auth/calendar.freebusy` (busy times only)
  - `.../auth/calendar.events` (only for "Add my plans to Google")
- [ ] Add each teammate's Google account, and anyone demoing, as a **test user**. The limit is 100.
- [ ] Testing mode facts:
  - Consent expires after 7 days, so a tester reconnects weekly.
  - Testers see a "Google hasn't verified this app" screen. That is expected while in Testing.

## 3. OAuth client

- [ ] Credentials → Create OAuth client ID → **Web application**.
- [ ] Authorized redirect URIs, exactly:
  - `https://YOUR-RENDER-HOST/api/google/calendar/callback`
  - `http://localhost:3000/api/google/calendar/callback` (local testing)
- [ ] Copy the client ID and client secret into the server environment (step 5).

## 4. Server key for routes

- [ ] Credentials → Create API key.
- [ ] Restrict it to **Routes API** (and Places API (New) if used). It is a server key, so add no browser referrer.
- [ ] If Render gives you fixed outbound IPs, restrict the key to those too.

## 5. Server environment variables

| Name | Value |
| --- | --- |
| `SIDEQUEST_GOOGLE_CALENDAR_ENABLED` | `true` to turn Calendar on |
| `GOOGLE_OAUTH_CLIENT_ID` | from step 3 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | from step 3 |
| `GOOGLE_OAUTH_REDIRECT_URI` | the exact redirect URI for this host |
| `SIDEQUEST_TOKEN_KEY` | 32 random bytes, base64: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `SIDEQUEST_GOOGLE_ROUTES_ENABLED` | `true` to turn walking routes on |
| `GOOGLE_MAPS_SERVER_KEY` | from step 4 |
| `SIDEQUEST_GOOGLE_PLACES_ENABLED` | `true` only if Places is enabled |

Calendar also needs the SideQuest sign-in to work, because it checks who is signed in through `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, on the server only.

## 6. Check it

- [ ] `GET /api/google/status` shows the right `enabled` values.
- [ ] Sign in to SideQuest → Connect Google → consent → you land on `/#google/connected`.
- [ ] Bring in this week: your busy times appear. Your calendar's event titles never do.
- [ ] Disconnect: in your Google Account → Security → Third-party connections, SideQuest is gone.
- [ ] `npm run build` ends with "Browser bundle contains no database, AI or Google credential configuration."

## Known limits

- Google tokens are kept in server memory, so a restart means reconnecting. The table that would keep them is in `supabase/proposals/20261125000000_google_connections_REVIEW_ONLY.sql` and needs Daven's review before anything is applied.
- Google says walking routes are in beta and can miss sidewalks. Every Google route is labelled "Google route, not checked on foot". On campus we use our own path graph.

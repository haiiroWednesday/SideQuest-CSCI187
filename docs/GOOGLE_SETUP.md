# Turning on Google Calendar and Google walking routes

Everything stays off until these steps are done. Keys and secrets go only into the server's protected environment (Render or a local `.env` that Git ignores), never into the browser, Git, screenshots or chat.

Personal account storage and Google token storage both have review-only SQL in `supabase/proposals/`. Use a disposable environment for these checks and obtain the team's schema decision before enabling the connected experience.

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
- [ ] Sign in to SideQuest → Connect Google → Continue to Google (new tab) → consent → return to your original SideQuest tab and choose Check Google connection. The callback tab is only a handoff; the authenticated status response determines whether Calendar is connected.
- [ ] Bring in this week: your busy times appear. Your calendar's event titles never do.
- [ ] Disconnect: in your Google Account → Security → Third-party connections, SideQuest is gone.
- [ ] `npm run build` ends with "Browser bundle contains no database, AI or Google credential configuration."

## Known limits

- Google tokens are kept in server memory, so a restart means reconnecting. The table that would keep them is in `supabase/proposals/20261125000000_google_connections_REVIEW_ONLY.sql` and needs Daven's review before anything is applied.
- Google says walking routes are in beta and can miss sidewalks. Every Google route is labelled "Google route, not checked on foot". On campus we use our own path graph.

## Session continuity acceptance

The separate-tab consent flow preserves SideQuest's existing memory-only access token, provided the original tab stays open and the session has not expired. Do not persist SideQuest or Google credentials to implement this flow. The same mechanism is used when requesting write permission. No opener or cross-tab token transfer is needed.

- [ ] In the original signed-in tab, record a non-sensitive visible account indicator. Open Google consent in a new tab; verify the original tab URL and UI remain unchanged.
- [ ] Complete consent, return to the original tab, and check the connection. Import becomes available only after the server confirms the signed-in account is connected.
- [ ] Decline consent, close the consent tab, or request write access but decline that scope. Check the original tab: do not report success unless the requested scope is actually enabled.
- [ ] Sign out or allow the SideQuest session to expire during consent. A strict status request must fail and the panel must not expose Calendar actions. Reauthenticate using the normal SideQuest sign-in.
- [ ] Verify the returned tab contains no credentials and does not create another authenticated app instance. Verify forged callback fragments do not establish a connection.
- [ ] Repeat on real desktop and mobile browsers. Keep the original tab open; a browser that discards it or a user who reloads it must sign in again.

The UI component and status-check fix are independent of Calendar's remaining main-app wiring. When mounting the panel, use the current verified account's token provider and key the panel by the account/session lifecycle so asynchronous results from a prior account cannot be reused. Busy-time refresh, plan synchronization, real provider credentials and approved staging remain separate acceptance gates. The status probe uses the existing short-lived server verification guard; Calendar mutations still use their authenticated endpoint checks.

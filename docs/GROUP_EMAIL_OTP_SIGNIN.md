# Optional email-code sign-in for SideQuest group plans

**Draft implementation, November 20, 2026. OFF by default.** This branch implements a passwordless email-code screen and server-side Auth exchange. Nothing has been connected to the team's live Supabase Auth service or run against real student accounts. No database migration was applied.

## What is implemented in code

1. `app/server/emailAuthApi.ts` exposes `GET /api/auth/status`, `POST /api/auth/request-code`, `POST /api/auth/verify-code`, and `POST /api/auth/sign-out`. Code requests have a generic response to avoid revealing membership; sign-in requires a same-origin POST with bounded JSON, valid email and 6–8-digit OTP. There are separate email/IP-based 15-minute request and verification attempt limits.
2. `app/server/supabaseEmailAuth.ts` uses a new Supabase client for every request, with the existing server-only publishable key. It sends email OTP through `signInWithOtp`, verifies using `verifyOtp({ email, token, type: 'email' })`, and confirms the returned access token through `auth.getUser(token)`. It never uses a service-role key.
3. `app/src/view/useGroupEmailAuth.ts` holds the access token in **tab memory only**, discards it at expiry, and provides a token-provider callback for the existing group HTTP client. It does not store the token, refresh token or user identity in browser storage or a URL. Reloading or closing the tab requires a new code. Closing/reloading a tab discards its credentials without notifying the provider. Explicit End session removes tab credentials immediately and requests current-session provider revocation. The UI reports whether revocation was confirmed. Other sessions are unaffected.
4. `app/src/view/GroupEmailLoginView.tsx` and `AuthenticatedApp.tsx` provide an email/code form, accessible errors, sign-in navigation, and a Groups tab only when a verified session exists. The M2 pages remain unchanged with all auth flags disabled.
5. HTTP and React tests verify disabled-state behavior, generic code-request messaging, same-origin requirements, rejection of client-supplied identities, OTP verification handoff and UI steps. These tests use fake Auth responses and do not send real emails.

## Required environment configuration

Keep the actual Supabase URL and publishable key on the Node server, not in the client bundle:

```dotenv
SUPABASE_URL=https://YOUR_TEAM_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY

# All default to false until backend owner and team agree.
SIDEQUEST_GROUPS_ENABLED=false
SIDEQUEST_AUTH_EMAIL_ENABLED=false
SIDEQUEST_AUTH_ALLOW_SIGNUP=false

# Build-time public Boolean only. Never use it as an authorization check.
SIDEQUEST_PUBLIC_GROUP_LOGIN=false
```

Only after Daven reviews and deploys the matching Auth schema, caller-scoped SQL RPCs, and genuine account permissions may the first, second and fifth variables be changed to `true`. `SIDEQUEST_AUTH_ALLOW_SIGNUP` controls whether an unknown verified email can create an account; it should remain false until the team approves registration and abuse protections.

The Supabase **Magic Link / OTP email template must contain `{{ .Token }}`**, not only `{{ .ConfirmationURL }}`. Otherwise users receive links instead of codes. The real email sender, deliverability and Auth provider's additional throttles must be configured and tested with consent. See [Supabase email OTP instructions](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [verifyOtp API](https://supabase.com/docs/reference/javascript/auth-verifyotp).

## Remaining release gates

- [ ] Team approval of account sign-up/eligibility, email templates and sender identity.
- [ ] Production-safe review/promotion of SQL proposal #56, including verified ownership/grants, actual Supabase Auth identities and row-level permission tests.
- [ ] Confirm that account IDs in group invitations are chosen through a safe, consent-based participant discovery or claim flow rather than typed manually.
- [ ] Complete a real end-to-end 2-account group proposal and an unauthorized third-account denial, with session expiry and revocation tests.
- [ ] Rehearse mobile keyboard focus, email errors, real login, group response updates and logout on all supported browsers.
- [ ] Decide whether durable session refresh is needed. This draft intentionally avoids storing any refresh token or cookie. Document and test that this tab-only sign-in expires on reload.
- [ ] Feature enablement by the backend owner after all gates pass, not solely by changing a UI Boolean.

**Privacy note:** Passwordless email code authentication verifies control of an email inbox, not enrollment at Santa Clara University. If the team needs SCU-only membership, that requires a verified eligibility policy, not assuming an arbitrary email belongs to a student.

## November 24 sign-out follow-up (#89)

`POST /api/auth/sign-out` requires same-origin JSON with an empty object and the current bearer token. The server requests Supabase Auth logout with scope=local using only the configured publishable key. No caller-supplied user ID, global scope, refresh token or privileged credential is accepted. The client invalidates all captured token-provider callbacks immediately; if revocation fails it warns that the old token may remain valid until expiry. This does not revoke on tab close. The disposable integration test now clicks End session in a real browser, checks the confirmation, and tests denial of the old JWT through the application and direct RPC, while other sessions remain signed in. Exact-head CI and approved hosted acceptance are required before enabling.

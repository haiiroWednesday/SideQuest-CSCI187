# Group UI handoff: verified session to working participant screens

**November 23, 2026. Disabled merged foundations (#82); proposal #84 adds explicit invitation consent. No live group deployment.**

The application now contains a responsive, testable React group-planning interface and a typed client adapter:

- `app/src/view/GroupPlanningView.tsx`: lists an authenticated person's accessible plans, creates a group proposal referencing a real catalog Event, opens plans, refreshes responses and shows safe error states.
- `app/src/view/GroupPlanPanel.tsx`: organizer offers/revokes invitations, reviews acceptance and attendance separately, confirms only when no active invitations remain and all accepted participants explicitly say Works, or cancels. A pending recipient sees only their invitation; they must accept to join. Decline or leave removes access; accepted members submit Works / If / Cannot with one tap. Once If is saved, they may optionally add, edit or clear a private note; no typing is required for an attendance answer. Only the author can see that private text.
- `app/src/controller/groupClient.ts`: requests an access token from a supplied verified session provider, calls same-origin group endpoints with no cookies or localStorage credential persistence, parses/sanitizes returned records, and turns expired sessions, stale edits and failures into explicit errors.
- `App.tsx` and `SideQuestHeader`: conditionally expose a Groups route when a `VerifiedGroupSession` prop is supplied by an actual login integration. **The normal app entry point supplies no group session, so unconfigured users do not see a misleading social feature.**

## Why real login remains disabled

The application has a gated email-code form, but no verified deployed student identity, email provider, session lifecycle or production group RPCs. The View deliberately contains no freeform bearer-token field. A developer or student cannot claim to become another participant by typing a user ID into the browser. The session must be supplied by a vetted authentication provider.

The organizer invitation form accepts a UUID voluntarily shared by its owner; no account existence is checked. That is a technical workflow for contract testing and must be replaced by a proper permission-aware participant picker or invite-claim system before public release. Never put someone else's private note or raw tokens into a shareable link.

## Acceptance criteria for further integration

- [x] Presenter/View unit tests cover pending status, role-specific actions, condition privacy, disabled controls after confirming, approved proposal creation and stale/error recovery.
- [x] Client tests cover session-required requests, typed responses, generic errors and no token persistence.
- [ ] Daven approves provider-specific login, real token expiry/revocation and the SQL RPC permissions in #56.
- [ ] Auth provider passes `VerifiedGroupSession` to `App`; no user-supplied account ID.
- [ ] Actual multi-user browser testing with two verified accounts and a third unauthorized browser.
- [ ] Verify accessibility, mobile navigation, empty/error states, and which account identifiers the UI can display.
- [ ] Replace UUID invitation input with approved member discovery/claim, respecting privacy.
- [ ] Coordinate merge of integration branches with #49–#57 to avoid duplicate overwrites.

These UI controls are a tested handoff contract, and **do not establish that group planning is operational for students** until the authentication and storage gates pass.

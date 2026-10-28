# SideQuest — instructions for coding assistants

**Read these before suggesting changes.** This project is a course assignment; a human teammate owns every PR and approves scope. This file provides common context for agents (including Cline); it does **not** launch agents.

## Source of truth

- **[MVP playbook (authoritative code contract and Mermaid diagrams (including the **classroom P5 sketch**, distinct from the M2 implementation model))](docs/MVP_TEAM_PLAYBOOK.md)** — agreed fields, catalog interface, backend, roles, unit tests, and P4/P5 Google Docs.
- **[Team setup + coding agents](TEAM_SETUP_GUIDE.md)** — Git, VS Code, Cline/Claude, optional agent teams, safe PR reviews.
- **[Product research and roadmap](docs/DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md)** — raw interviews, comparison research, validated extra-credit rubric, **future-only** features. Do not expand M2 automatically.

- [P4 architecture Google Doc](https://docs.google.com/document/d/11MKHb3f40Yl81Rx__Mna2lRFf5ooZZUD22QEUnmpiO4/edit): Event, EventCatalog, Schedule, MVC responsibilities.
- [README](README.md) and [TEAM_SETUP_GUIDE](TEAM_SETUP_GUIDE.md): how to run and test the actual app.

## Agreed MVP scope

- Anyone may post/browse events; **no account, login, or USER table**.
- Every public Event has `id,title,hostName,description,location,date,start,end`. `hostName` is unverified display text, **not** a user ID.
- Use M1-compatible `date` (YYYY-MM-DD) and `start,end` (HH:mm) on the **same day**, with `start < end`. No overnight events in this MVP.
- One **shared public EventCatalog**; hosted storage is **planned** with Supabase but is **not yet implemented**.
- **Schedule** stores planned Event IDs **on the current device**. Removing a plan does not delete the public Event.
- Free-time matching requires the **entire** event to fit, inclusive boundaries. No partial matching or travel feasibility.
- Out of scope: user profiles, cost, registration enforcement, saved availability, cross-device schedules, and extra tables for anonymous users.

## Boundaries and ownership

- **Cynthia:** shared design system, reusable React components, discovery UX.
- **Devonny:** event browsing/details, coordinating UI with Cynthia.
- **Daven:** event creation, catalog adapter, database schema.
- **Sembiyan:** full-fit matching, local Schedule.
- **All:** tests, documentation accuracy, peer review, integration.
- Model holds data/validation/fit; controllers coordinate actions; React components present views. Do not implement persistence inside UI components.
- A single teammate should integrate `App.tsx` changes at a time. Ask before changing shared `CampusEvent` fields or catalog APIs.

## Safe development protocol

1. Check `git status` and work on a feature branch from current `master`; never overwrite another teammate's uncommitted work.
2. **Plan first**, list touched files, risks, and tests; do not make unrequested architecture changes.
3. Implement one focused feature change, with real assertions and meaningful negative/edge tests.
4. Inside `app/`, run `npm test` and `npm run build`. Report actual output, not an assumed pass.
5. Review `git diff`; ask before commits, pushes, PR creation, database migrations, deployment, secret access, destructive commands, or merges.
6. Keep secrets off GitHub and out of browser bundles. Supabase publishable key is public only with correctly configured grants/RLS; never expose service-role or secret keys.
7. Use the smallest working change; preserve M1 behavior and tests unless the team intentionally replaces them.

**Default:** If a prompt conflicts with the agreed implementation contract or another teammate's file ownership, stop and explain the conflict. Do not invent features.

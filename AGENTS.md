# SideQuest — instructions for coding assistants

**Read these before suggesting changes.** This project is a course assignment; a human teammate owns every PR and approves scope. This file provides common context for agents (including Cline); it does **not** launch agents.

## Source of truth

- [MVP Implementation Contract](docs/MVP_IMPLEMENTATION_CONTRACT.md): same-day Event type and Supabase catalog proposal.
- [MVP Team Playbook](docs/MVP_TEAM_PLAYBOOK.md): roles, handoffs, tests, architecture and PR workflow.
- [AI Agent Setup Guide](docs/AI_AGENT_SETUP_GUIDE.md): onboarding and optional multi-agent workflows.
- [P4 architecture](https://drive.google.com/file/d/1xiZGXQeScuJx14yKNUcwj1XtWTfOb-l4/view): Event, EventCatalog, Schedule, MVC responsibilities.
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

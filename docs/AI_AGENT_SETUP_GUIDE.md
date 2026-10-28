# SideQuest — AI coding agents: setup and team workflow

**Beginner guide · 27 October 2026.** This is an optional coding-assistant workflow, not a requirement from Professor Kandel. Every teammate must still understand, test, review, and take responsibility for their own contribution. **Start with the P5 coursework deadline, then set this up when convenient.**

## 1. Understand the vocabulary first

| Term | What it means | SideQuest example |
| --- | --- | --- |
| **Model** | AI that processes prompts (Claude, GPT, Gemini) | Claude helps write a React event card |
| **Chat / Playground** | Interface for conversation and testing prompts; not automatically connected to files | Claude Console Playground explores validation rules |
| **Coding agent** | Model + tools + context + permissions; can inspect/edit files and run commands | Cline opens `app/src`, runs tests, proposes patches |
| **Agent role** | Instructions describing a specialist; not necessarily an independent running agent | “Test reviewer” may be a prompt used by the *same* Cline agent |
| **Multi-agent team** | Several actual agent sessions with coordination/delegation | A Cline CLI coordinator delegates to separate analysis/review agents |
| **Claude Console workspace** | API keys, members, billing, and rate/spend caps; no shared Git working tree | Team members use their own authorized keys |
| **GitHub repository** | Shared code and review history; commits/PRs are how work reaches teammates | `haiiroWednesday/SideQuest-CSCI187` |
| **VS Code workspace** | Local folder opened in the editor | One teammate's clone of the SideQuest repo |

**Crucial:** choosing GPT instead of Claude in Cline changes the **model behind an agent**. It does not create a second agent that automatically checks the first. Cline's **Plan** and **Act** modes are also modes, not two independent coworkers.

## 2. Our suggested team setup

Every teammate **must** have GitHub access, Git, VS Code or another editor, Node.js, and a runnable SideQuest checkout. **Cline is recommended but optional.** One person's setup doesn't automatically install an extension or copy model credentials to the other three computers.

**Minimal (recommended for MVP):** one Cline coding session on a private feature branch, a separate read-only review, automated tests, then a real teammate PR review.

**Advanced (optional for Cynthia):** Cline CLI Agent Teams or OpenCode subagents to delegate read-only exploration, review, and documentation. Avoid parallel *writers* on one branch or file. Don't let multi-agent setup consume the assignment week.

### Recommended specialist roles

| Role | Typical task | Permissions |
| --- | --- | --- |
| Planner / Architect | Inspect P4, MVP contract and source; propose a small plan | Read-only |
| Feature Builder | Implement one agreed change in a feature branch | Edit only approved project files; commands require approval |
| Unit-Test Reviewer | Check that tests call real behavior and fail on meaningful bugs | Read-only + allowed test commands |
| MVC / Integration Reviewer | Check boundaries and shared event contract | Read-only |
| UI / Accessibility Critic | Review focus, responsive layout, cards, empty/error states | Read-only / screenshots |
| Data / Security Reviewer | Inspect Supabase grants, RLS, public credentials and anonymous posting risks | Read-only |
| Documentation Checker | Compare README and implementation to what exists | Docs-only changes with approval |
| Coordinator | Collect specialist results, decide action order, and report decisions | No merge/deploy permission |

These can be **prompt roles** in a single agent, or actual separate subagents when configured. Eight names does **not** automatically mean eight active API sessions.

## 3. Everyone: set up the working code first

1. Follow [Team Setup and Troubleshooting](../TEAM_SETUP_GUIDE.md). Install [VS Code](https://code.visualstudio.com/), [Git](https://git-scm.com/downloads) and Node.js 24 (Node 22.12+ also supported by our app).
2. Clone the [private SideQuest repo](https://github.com/haiiroWednesday/SideQuest-CSCI187) **once**, or open the existing local clone in VS Code.
3. In the terminal at the repository root:

```bash
git status
git switch master
git pull --ff-only origin master
cd app
npm install       # only if packages are not installed or changed
npm test
npm run build
```

All tests/builds must work **without an AI agent**. If the latest `master` fails, tell the group before blaming your feature.

## 4. Optional: install Cline inside VS Code

1. In VS Code, open **Extensions** (Cmd/Ctrl+Shift+X), search **Cline**, and install the Cline extension from the official marketplace. Open the **Cline** panel. [Official installation guide](https://github.com/cline/cline/blob/main/docs/getting-started/installing-cline.mdx).
2. Click the **gear inside the Cline panel** (not the main VS Code preferences gear).
3. Choose an AI **API Provider**. To use our existing **Anthropic/Claude API credits**, choose **Anthropic** (BYOK), not an unrelated Cline-billed provider. Enter **your own authorized Anthropic API key**, not a teammate's key. Choose a Claude model available to our workspace. [Cline provider setup](https://github.com/cline/cline/blob/main/docs/getting-started/authorizing-with-cline.mdx).
4. Make a tiny read-only test request in **Plan** mode: “Read `app/src/model/events.ts` and explain the `fitsFully` rule. Don't edit or run commands.” Make sure Cline can access the correct folder and describe real code.
5. Turn **automatic approval of edits/commands off** during onboarding. Review every proposed command; never approve deletion, force-pushes, credential access, database reset, or merge simply because a model asked.
6. If the connection fails, check whether the key is valid, linked to the correct Anthropic workspace, and has API privileges. A workspace **User** with Playground-only access may be unable to issue keys; a workspace Limited Developer/Developer or administrator can manage them as allowed. [Claude API keys](https://platform.claude.com/docs/en/get-api-key).

**Budget:** your project previously discussed a shared **$100 Claude API credit allocation**. That allocation is separate from ChatGPT subscriptions and from other model providers. Check the live Anthropic balance rather than assuming the credit is still unused. Set a low workspace spend cap/alerts and review usage in the [Claude Console workspace settings](https://platform.claude.com/docs/en/manage-claude/workspaces) before experimenting with several simultaneous agents. **Do not put API keys in a repo, screenshot, chat, PR, README, or `.env` that might be committed.**

## 5. What Cline can do, step by step

Cline has two main modes. **Plan** explores code and proposes an approach without editing files or executing commands. **Act** is allowed to modify files and run commands, subject to permission prompts. Switching modes preserves the task context, and Cline can optionally use different models for Plan versus Act. [Official Plan/Act guide](https://github.com/cline/cline/blob/main/docs/core-workflows/plan-and-act.mdx).

### Before an agent writes

From the repository root, create a branch **just for your own task**:

```bash
git switch master
git pull --ff-only origin master
git switch -c feature/your-part-yourname
```

In Cline **Plan** mode, paste:

> Read `AGENTS.md`, `docs/MVP_IMPLEMENTATION_CONTRACT.md`, `docs/MVP_TEAM_PLAYBOOK.md`, and the existing code for [MY FEATURE]. Do **not** edit anything. Explain the feature's input/output contract, which files you would change, edge cases, and which tests would prove it works. Respect the chosen same-day Event type, shared EventCatalog, browser-local Schedule, and no account/cost/partial-matching scope.

Check the proposed file list against your area of ownership, then switch to **Act** and paste:

> Implement only the smallest agreed step of [MY FEATURE] on my current feature branch. Show me the proposed edits and commands for approval. Add meaningful tests that would fail if the behavior were wrong. Run `npm test` and `npm run build` inside `app/`; report actual results. **Do not commit, push, open/merge a PR, change database permissions, or deploy without explicit permission.**

After reviewing `git diff`, manually check the feature in the browser. Then have Cline or another tool **review**, not modify, the changes. Finally push and open a PR targeting **`master`** for a human teammate to review.

## 6. The four real development lanes

| Teammate | Primary task | Agent prompts to start with |
| --- | --- | --- |
| **Cynthia** | Visual design system, reusable React components, discovery UX | “Review UI information hierarchy and mobile/keyboard states, then plan a small EventCard component using current CampusEvent props.” |
| **Devonny** | Browse/details consuming shared catalog interface | “Find the current event listing, map how it will use the EventCatalogPort, and design normal/empty/error states. Plan first.” |
| **Daven** | Event form, Postgres catalog, Supabase adapter | “Read the migration proposal and P4 architecture. Audit anonymous SELECT/INSERT grants/RLS and map SQL fields to CampusEvent. Plan, no deployment.” |
| **Sembiyan** | Full-fit date/time logic and local Schedule | “Read fitsFully and the M1 tests. Propose a small local planned-event-ID API with duplicate handling and persistence tests.” |

**Boundaries:** everybody may build their own UI and tests, but Cynthia and Devonny coordinate shared components; Daven owns catalog internals, and Sembiyan owns Schedule logic. One person should integrate changes to `App.tsx` at a time.

## 7. Your bigger multi-agent idea: what's real today?

### A. Cline VS Code extension (start here)

One agent session can use different models and adopt several **review roles** in sequence. You can use one model for Plan and another for Act in Cline's settings. This is not automatic supervision by distinct agents.

### B. Cline CLI Agent Teams (optional advanced)

Official Cline documentation now supports **Agent Teams in CLI/SDK/Kanban, not in the VS Code extension**. A coordinator can spawn specialists and aggregate results. [Agent Teams documentation](https://github.com/cline/cline/blob/main/docs/cli/agent-teams.mdx).

Only if you want to experiment **after your first Cline session works**:

```bash
npm install -g cline
cline auth
cd /path/to/your/SideQuest-CSCI187
cline "/team Review the current feature branch for type mismatches and untested edge cases. Do not edit or push."
```

This can launch multiple real agent sessions and incur multiple API charges. Begin with **read-only review, max 2–3 specialists**. Don't authorize concurrent writes to `App.tsx` or `events.ts`. Use independent branches/worktrees and explicit human merges if you ever run simultaneous builders.

### C. OpenCode specialized agents (optional alternative)

[OpenCode agents](https://docs.opencode.ai/docs/agents/) supports named primary agents and subagents with model selection, prompts, and permissions. That can be useful if you want a configurable `@reviewer`, `@explore`, or `@security` helper, including different model providers. **It requires its own installation and provider setup.** You do not need both OpenCode and Cline for the course.

### The recommended flow

```text
Human teammate: picks one small feature and owns the PR
    |
    v
Planner (read-only): inspects repo + documents
    |
    v
Builder (one writer per branch): changes focused files
    |
    v
Tests + build + manual browser check
    |
    +--> Reviewer (read-only): checks code / MVC / regressions
    +--> UI critic or data/security reviewer (only if relevant)
    |
    v
Human teammate: reviews diff and opens PR
    |
    v
Another student reviews; GitHub CI passes; merge into master
```

**More agents are useful when their reviews are genuinely independent and focused.** Repeating the same prompt to six models may produce six versions of the same mistake. Do not treat agreement among models as proof of correctness.

## 8. GitHub coordination and safe defaults

- **Separate model credentials from project code.** The Claude Console workspace shares billing/permissions, not local chats or VS Code files. Never send the API key to classmates over group chat.
- **One branch per contributor/feature**, PR to `master`, and human review. Agents do not push/merge unless their operator explicitly approves.
- **Project-root `AGENTS.md`** supplies common instructions to compatible coding assistants. Rules are context, not an automated team of workers.
- Check **`git status`** before and after agent work. Never approve `git reset --hard`, force-push, raw `rm -rf`, or overwriting another teammate's local work without deliberate human review.
- Use Supabase credentials appropriately: a browser publishable key can be public when the database grants/RLS are correctly configured, but server secrets/service-role keys must never go into client code or Cline prompts. Anonymous public posting requires abuse protection before public launch.
- Teammates can use **Cline**, another coding assistant, or no coding assistant. The implementation contract, PR review, and CI rules are the same for everyone.

## 9. Troubleshooting

| Problem | Check |
| --- | --- |
| Cline doesn't see files | Open **the SideQuest repo folder**, not a random file or `app/` from another copy |
| “No API key” | Provider in the **Cline panel gear**; authorized key; matching Claude workspace access |
| Playground works but Cline doesn't | Playground-only workspace membership may lack key privileges; these are separate interfaces |
| Claude credits seem depleted quickly | Review usage/spend caps; try fewer parallel agents, shorter tasks, and affordable available models |
| Agent claims tests passed but CI fails | Inspect actual `npm test`, `npm run build`, GitHub Actions logs, and branch/commit |
| Changes don't appear for a teammate | Local edits are not shared until pushed and merged; ask for PR link, not a screenshot of the chat |
| Two agents changed the same file | Stop; compare branches and reconcile changes manually, do not accept blind overwrites |
| GPT selected but Claude credits aren't used | GPT/OpenAI has a **separate provider billing/auth path**; switching models does not share Anthropic credits |

## Official references

- [Cline install](https://github.com/cline/cline/blob/main/docs/getting-started/installing-cline.mdx)
- [Cline provider setup](https://github.com/cline/cline/blob/main/docs/getting-started/authorizing-with-cline.mdx)
- [Cline Plan and Act](https://github.com/cline/cline/blob/main/docs/core-workflows/plan-and-act.mdx)
- [Cline Agent Teams](https://github.com/cline/cline/blob/main/docs/cli/agent-teams.mdx)
- [Cline project rules](https://github.com/cline/cline/blob/main/docs/customization/cline-rules.mdx)
- [Claude Console workspace & limits](https://platform.claude.com/docs/en/manage-claude/workspaces)
- [OpenCode agent configuration](https://docs.opencode.ai/docs/agents/)

**Bottom line:** first make one Cline agent useful for each person. Let agents review independently, but keep human ownership of code. After the SideQuest features have clean branches and reliable tests, the multi-agent CLI experiments become much safer.

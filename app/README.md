# SideQuest — React starter (proposed M1 walking skeleton)

This is an **unofficial TypeScript + React alternative** to Professor Kandel's C++/Qt starter. The professor permits other languages, but the team must set up its own CI. This version is isolated inside `app/` until the group agrees on React.

## What this prototype does

A student selects when they are free. SideQuest returns fictional campus events that fit **entirely** inside that time period.

- **View**: `src/App.tsx` shows a web page with two time fields.
- **Controller**: `src/controller/findEvents.ts` validates the request and asks for matches.
- **Model**: `src/model/events.ts` contains mock events and the matching rule.
- **Tests**: `tests/*.test.ts` using Vitest.
- **CI**: the repository's `.github/workflows/react-ci.yml` runs tests and build after pushes.

Not included yet: live SCU event data, logins, partial attendance, walking time, saved events, or overnight times. This is the FIRST working slice, not the full product.

## Setup on Mac

1. Install VS Code, Git, and **Node.js 24 LTS** from https://nodejs.org/en/download.
2. Open the SideQuest repository in VS Code and go to **Terminal → New Terminal**.
3. Type one command at a time, while located in the repository root:

```bash
cd app
npm install
npm run dev
```

4. Open the **Local** URL shown in the terminal (often http://localhost:5173/). Change the times and watch the matching event cards update.
5. Press **Control+C** in the terminal to stop the site.

The first `npm install` creates `package-lock.json`; **commit it to GitHub** so installations are reproducible. Teammates should then use `npm ci` from `app/`.

## Run tests and check the build

From `app/`:

```bash
npm test
npm run build
```

GitHub → Actions → **SideQuest React CI** will repeat those checks whenever a change is pushed. If an old C++ workflow fails, review it separately; the original C++ files have deliberately been preserved.

## Before the Oct. 26 M1 deadline

- Team agrees on language, checks project architecture and documents user requirements.
- Every teammate authors a **different, meaningful unit test** with their name commented in the file.
- Confirm a full View → Controller → Model → View path works in the browser.
- From a SEPARATE CI proof branch, deliberately fail a test, push, confirm red X on GitHub Actions; correct it, push and confirm green.
- Update the TOP-LEVEL README with SideQuest requirements and project setup before final submission.
- If repo stays private, add Professor Kandel's GitHub account `jade-kandel` as a collaborator.
- Submit one team walking skeleton and every individual's reflection as assigned in Camino.

## Notes

This starter is intentionally added on `react-starter`, not merged into `master`. Avoid deleting original C++ files until the group confirms React. Never commit `node_modules`, API keys or `.env` secrets.

This starter's dependencies still need to be installed and tested on a connected machine. ChatGPT and Cline may help you understand the commands, but they are optional to use the application.

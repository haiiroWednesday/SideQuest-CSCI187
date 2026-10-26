# SideQuest — Team Setup and Troubleshooting

This is a practical guide for working on the [SideQuest React project](README.md), which now lives on the default **`master`** branch. The old C++/Qt starter files are not required to run the app.

## Install the tools

Install [VS Code](https://code.visualstudio.com/), [Git](https://git-scm.com/downloads), and [Node.js](https://nodejs.org/en/download) 24 (Node 22.12+ supported). Node includes `npm`.

In VS Code, open **Terminal → New Terminal** and check:

```bash
git --version
node --version
npm --version
```

If any command is missing, install that tool and restart VS Code.

## Clone and run

```bash
git clone https://github.com/haiiroWednesday/SideQuest-CSCI187.git
cd SideQuest-CSCI187/app
npm install
npm run dev
```

Open the **Local** URL printed by Vite (often `http://localhost:5173/`).

If cloning a private repository fails, confirm that your GitHub account has accepted the collaborator invitation. If `npm install` encounters an `edgesOut` dependency error, try `npm install --legacy-peer-deps`.

## Update an existing clone

**Do not clone again** if you already have a local copy. From the repository folder:

```bash
git status
git branch --show-current
```

If you have uncommitted changes, preserve them before switching branches or pulling. Once your work is safe:

```bash
git fetch origin
git switch master
git pull --ff-only origin master
```

If `master` does not exist locally, use `git switch --track origin/master` after fetching. Then run `npm run dev` from `app/` and refresh the browser. GitHub updates do not automatically reach your laptop.

## Quick app check

1. Create **Art Workshop** at **Arts Building** on a chosen date, from **14:30** to **15:30**.
2. Search the same date with free time **14:00–16:00**. The event should match.
3. Search **15:45–17:00** instead. It should no longer match.
4. Refresh in the same browser to verify the event persists, and then remove it.

Events are saved in this browser's `localStorage`; teammates do not see each other's local events.

## Automated verification

From `app/`:

```bash
npm test
npm run build
```

Our [React GitHub Actions workflow](.github/workflows/react-ci.yml) runs equivalent checks online. Student test examples and CI experiments are documented in [the internal test guide](docs/UNIT_TEST_STARTER_EXAMPLES.md).

## Troubleshooting

- **Missing `dev` script:** run commands from `app/`, not the repository root.
- **Uncommitted changes block a switch or pull:** don't force it; save or coordinate your work first.
- **Site looks outdated:** check the current branch, pull `master`, restart Vite, and refresh.
- **Legacy C++ files appear:** they remain in the repository but are unrelated to the React build.
- **Avoid committing:** `node_modules/`, `dist/`, passwords, or API keys.

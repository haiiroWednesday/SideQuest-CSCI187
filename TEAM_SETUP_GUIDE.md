# SideQuest: Team Setup Guide (TypeScript + React)

**For everyone on the CSCI 187 SideQuest team.** Follow this once on your own laptop. You do **not** need to install C++, Qt, CMake, Docker, Cline, or Claude to run the website.

This is our **React starter**, on the **`react-starter` branch**. Our original C++ teacher template is still on `master`, so the branch matters.

## Before you begin

1. **Accept your GitHub repository invitation.** This is a private repository. The owner has to invite you before you can clone it.
2. Install [Visual Studio Code](https://code.visualstudio.com/), [Git](https://git-scm.com/downloads) and a recent [Node.js LTS](https://nodejs.org/en/download) version (Node 24 LTS recommended; Node 22.12+ also satisfies the project’s Node requirement). Installing Node also installs `npm`.
3. Close and reopen VS Code after installing Node or Git.

### What are these tools?

- **VS Code:** the place where you look at and change the code.
- **Git:** tracks changes; **GitHub:** the shared online project folder.
- **Node.js:** runs the tools used to build and preview the React website.
- **npm:** downloads the project's required packages.
- **React + TypeScript:** our web app technology.
- **Cline/Claude:** optional AI assistance. Not required for setup or tests.

## Step 1: Check that Node, npm and Git are installed

Open **VS Code → Terminal → New Terminal**, then type these commands one at a time:

```bash
node --version
npm --version
git --version
```

You should see three version numbers. If any command says `command not found` or `not recognized`, finish installing that program and restart VS Code. On Mac, if the command for Git is missing, install the Xcode Command Line Tools when prompted.

## Step 2: Download SideQuest from GitHub

Pick a location on your computer to save the project. For example, open a terminal in your Documents folder. Type:

```bash
git clone -b react-starter https://github.com/haiiroWednesday/SideQuest-CSCI187.git
cd SideQuest-CSCI187/app
```

- `git clone` makes a copy of the shared project on your laptop.
- `-b react-starter` chooses our **React branch**, instead of the old C++ starter branch.
- `cd SideQuest-CSCI187/app` enters the React app folder.

**Already cloned the repository?** Don't clone it again. In VS Code, open your existing `SideQuest-CSCI187` folder, then run `git fetch`, `git switch react-starter` (or `git switch --track origin/react-starter` if needed), and `cd app`. If switching says you have uncommitted changes, stop and ask the team before proceeding.

If cloning says `Repository not found`, check your GitHub account and that you accepted the collaborator invitation. The repo is private.

## Step 3: Install the app's packages

Make sure the terminal prompt ends in **`app`**, then type:

```bash
npm install
```

Wait for it to finish. If you get an npm error like `Cannot read properties of null (reading 'edgesOut')`, our first successful workaround was:

```bash
npm install --legacy-peer-deps
```

Only use the second command if the normal install has a dependency-resolution problem. Don't delete the project or clone again because of an npm error.

## Step 4: Run SideQuest in your browser

Still inside `app`, type:

```bash
npm run dev
```

VS Code will show a **Local** address, often `http://localhost:5173/`. Open that link in your browser. You should see **Create an event** and **When are you free?** forms. There are **no preset sample events**.

1. Create an event with title **Art Workshop**, location **Arts Building**, today's date, and times **2:30 PM–3:30 PM**.
2. In **When are you free?**, use the same date and **2:00 PM–4:00 PM**. The newly created Art Workshop appears in matching events.
3. Change your free time to **3:45 PM–5:00 PM**. It should disappear from matching results.
4. Refresh the webpage. The event remains under **Your created events** on this browser. You can also remove it.

These events are saved only on your computer's browser (localStorage), **not synced across teammates' devices**. A future shared backend is required for that.

**Leave this terminal running while the website is open.** To stop it, select the terminal and press **Control+C** (including on Mac).

## Step 5: Run the automatic checks

Stop the running website with **Control+C**, then type inside `app`:

```bash
npm test
npm run build
```

- `npm test` runs our Vitest unit tests. It should report passing tests.
- `npm run build` checks TypeScript and builds the website for production.
- The [GitHub Actions page](https://github.com/haiiroWednesday/SideQuest-CSCI187/actions) runs similar checks online.

The first `npm install` may create `app/package-lock.json`. Coordinate with the team before committing it, so only one consistent lockfile is added to the shared branch. Never commit `node_modules/`, `dist/`, passwords or API keys.

## How we'll work together in class

1. Open the [React starter branch](https://github.com/haiiroWednesday/SideQuest-CSCI187/tree/react-starter).
2. Agree that our first feature is **create event → save locally → enter free time → show matching events**.
3. Look at how our **View** (`app/src/App.tsx`), **Controller** (`app/src/controller/findEvents.ts`), and **Model** (`app/src/model/events.ts`) work together.
4. Divide meaningful tasks. **Every teammate must write a distinct unit test and put their name in its comment.**
5. For M1, also demonstrate a deliberately failing CI run (**red X**) on a **separate branch**, fix it, and confirm a passing run (**green check**). Never merge broken tests.
6. The team submits the walking skeleton by **Monday, October 26, beginning of class**; everyone also completes their individual reflection as required by the assignment. The individual setup deadline was Monday, October 19, beginning of class.

**Before final submission:** update the top-level README with the project's real user requirements and setup steps. If the repo stays private, invite Professor Kandel (`jade-kandel`).

## Troubleshooting

- **`node` / `npm` not found:** Install Node LTS, then fully restart VS Code.
- **`git` not found:** Install Git, then restart VS Code.
- **`Repository not found`:** Check the repo invitation and which GitHub account you're using.
- **`npm install` fails:** Try the `--legacy-peer-deps` fallback above. Share the full error with the group.
- **The browser doesn't open:** Use the exact **Local** link shown by `npm run dev`; the port might not be 5173.
- **`Missing script: dev`:** You're probably not inside `app/`.
- **Old C++ files appear:** You may be looking at `master` rather than `react-starter`.
- **Git says you have local changes and can't switch branch:** Stop. Don't force the switch or delete your files; ask the team to help preserve your work.

**Optional AI:** Use ChatGPT/Claude/Cline for explanations or debugging, but Cline is not needed to run SideQuest and requires separate API configuration. Never share or commit API keys.

**Professor's assignment:** https://docs.google.com/document/d/1xOsK1cmhXyVy8LsV7oHP_h9tr32ogga79DbsjQwo6yo/edit

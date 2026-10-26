# SideQuest: Team Setup Guide (TypeScript + React)

**For everyone on the CSCI 187 SideQuest team.** Follow this once on your own laptop. You do **not** need to install C++, Qt, CMake, Docker, Cline, or Claude to run the website.

The official SideQuest React walking skeleton and team tests now live on **`master`**. The original C++ template remains in the repository as legacy files; the running React app is in `app/`.

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
- **Cline/Claude:** optional AI assistance, including generating test code when you choose the scenario and verify the assertions. Not needed to run tests.

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
git clone https://github.com/haiiroWednesday/SideQuest-CSCI187.git
cd SideQuest-CSCI187/app
```

- `git clone` makes a copy of the shared project on your laptop.
- Cloning without `-b` checks out our default **`master` branch**, which now contains the React app and tests.
- `cd SideQuest-CSCI187/app` enters the React app folder.

**Already cloned SideQuest, including the October 19 version?** You **do not need to clone again**. In VS Code run `git status` first. If you have uncommitted work, stop and save/coordinate it before switching branches. Check the current branch with `git branch --show-current`, then run `git switch master` and `git pull --ff-only origin master`. If `master` is not available locally, try `git fetch origin` followed by `git switch --track origin/master`. Enter `app/`, restart `npm run dev`, and refresh your browser. **Pulling is essential: GitHub updates do not automatically change files on classmates' laptops.**

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

VS Code will show a **Local** address, often `http://localhost:5173/`. Open that link in your browser. You should see **Create an event** and **When are you free?** forms. You should see the current maroon-and-gold SideQuest interface and the event-creation form.

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

## Eight example categories and individual unit tests

For eight categories, sample TypeScript code, precise scenario challenges, and red/green CI instructions, see the [SideQuest M1 Team Unit-Test Field Guide](docs/UNIT_TEST_STARTER_EXAMPLES.md). **Professor Kandel explicitly permits AI to write unit-test code** (lecture slide 10); each teammate must still decide which distinct behavior to test, verify the assertions and expected answers, explain the test, and add their name in a code comment.

## What remains after the October 19 in-class walkthrough

Running an earlier SideQuest version during class is **not** the same as having the newest code. Every teammate should update their existing clone, then check the current **Create an event → save → search** flow and run `npm test` before contributing.

1. Confirm everyone can access the private repository and has updated to **`master`**, which now contains the React walking skeleton and merged tests.
2. Review the updated [requirements](REQUIREMENTS.md) and [specifications](SPECIFICATIONS.md), which correspond to the team's revised Google Docs.
3. Each teammate chooses a different behavior, writes an individual unit test with their name in a comment, and demonstrates an intentional **red-X then green-check** React CI result on a separate branch. Use the [testing guide](docs/UNIT_TEST_STARTER_EXAMPLES.md).
4. Once everyone's changes are ready, review the tests together and confirm `npm test`, `npm run build`, and the [React GitHub Actions check](https://github.com/haiiroWednesday/SideQuest-CSCI187/actions) pass.
5. The React walking skeleton and reviewed tests have been merged into default `master`. Run all tests and the build again on the integrated code before submission. Keep isolated red-X demonstration branches unmerged.
6. **One group member** submits the repository in Camino by **Monday, October 26, beginning of class**, and adds all contributing group members. Make sure Professor Kandel (`jade-kandel`) can view the private repo.
7. **Every student** separately submits an individual reflection Google Doc link in Camino, with anyone-with-link viewing enabled.

The published [M1 assignment](https://docs.google.com/document/d/1xOsK1cmhXyVy8LsV7oHP_h9tr32ogga79DbsjQwo6yo/edit) and [walking skeleton slides](https://docs.google.com/presentation/d/1W_RSFcWNTL-NINOeRiGBVvvOtcZncaio5pE5-QtSRmw/edit) specify the submission deadline, but **do not schedule a separate live presentation**. The five-minute app walkthrough above is an internal self-check.

## Troubleshooting

- **`node` / `npm` not found:** Install Node LTS, then fully restart VS Code.
- **`git` not found:** Install Git, then restart VS Code.
- **`Repository not found`:** Check the repo invitation and which GitHub account you're using.
- **`npm install` fails:** Try the `--legacy-peer-deps` fallback above. Share the full error with the group.
- **The browser doesn't open:** Use the exact **Local** link shown by `npm run dev`; the port might not be 5173.
- **`Missing script: dev`:** You're probably not inside `app/`.
- **Old C++ files appear:** Legacy C++ template files are still in the repo; SideQuest's active React application is under `app/` on `master`.
- **Git says you have local changes and can't switch branch:** Stop. Don't force the switch or delete your files; ask the team to help preserve your work.

**Optional AI:** Use ChatGPT/Claude/Cline for explanations or debugging, but Cline is not needed to run SideQuest and requires separate API configuration. Never share or commit API keys.

**Professor's assignment:** https://docs.google.com/document/d/1xOsK1cmhXyVy8LsV7oHP_h9tr32ogga79DbsjQwo6yo/edit

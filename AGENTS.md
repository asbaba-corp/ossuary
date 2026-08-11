READ ~/Documents/projects/pessoal/agent/AGENTS.md BEFORE ANYTHING.

# Ossuary

Idle game for iOS. No prestige, with PVP and cross-device sync — the client is not trusted, validation is server-side.

Reference documents:
- `docs/design/core-design.md` — pillars, core loop, party, combat, economy, Ossuary, world map
- `plano-tecnico-idle-ios.md` — stack, architecture, sync, PVP, monetization
- `world_1_vestibule.md` — World 1 design

Design docs are written in Portuguese; that is intentional. Keep them in Portuguese.

## Stack

- TypeScript everywhere. `packages/core` (pure TS) is shared by iOS, web and server.
- iOS client: React Native + Expo. Web: React + Vite.
- Rendering: react-native-skia (2D sidescroller, same render code on iOS and web).
- Server: Node + TypeScript, Postgres (saves in `jsonb`).
- Content is **data**, not code.

## Rules

**Git — never commit, push, open a PR, or send anything to GitHub without the user's explicit authorization.** No exceptions.

**Never push directly to `main`.** The flow is always:

```
feature/<slug>  →  dev  →  PR  →  main
```

- `main` only receives code through a Pull Request opened from `dev`.
- No direct commits to `main`, no `push origin main`, not even for "just a quick fix".
- The `dev` → `main` PR is the version changelog (see section below).
- Day-to-day work branches off `dev` and merges back into `dev`.

`main` is protected on GitHub: PR required, force-push and deletion blocked, and the protection applies to admins too. A direct push is rejected by the server, not just by this file. Emergency bypass means temporarily removing the protection — ask the user first, never do it unprompted.

**Read the user's personal instruction files before acting.** The project root may hold per-user instruction docs — typically named `*instructions.md` and listed in `.gitignore`, since they are personal and never committed.

```bash
rtk ls *instructions.md 2>/dev/null
```

Read whatever is there and follow it. These files carry things the repo cannot: which GitHub account is allowed to push, local environment quirks, personal preferences. They override nothing about safety, but they do decide *how* to carry out a task.

Never commit them, never quote their contents in a commit message, PR, or issue.

**Don't reinvent the wheel.** Before writing anything new, look for an existing function/module in the repo. Balance rule, tick formula, save type — if it already exists, reuse it. Duplicating logic between client and server is a guaranteed bug: it lives in `packages/core`.

## Pre-commit check

Before **every** commit, review the staged diff hunting for leaked secrets. Never commit:

- API keys, tokens, secrets (Apple, App Store Connect, RevenueCat, Postgres, PaaS, analytics)
- `.env` and variants, `*.p8`, `*.p12`, `*.mobileprovision`, `*.keystore`, private keys
- Connection strings with credentials, sample JWTs carrying a real payload
- Player personal data, account IDs, logs containing PII

Run before committing:

```bash
rtk git diff --cached
rtk git diff --cached -U0 | grep -nEi 'api[_-]?key|secret|passwd|password|token|credential|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|postgres(ql)?://[^ ]*:[^ @]*@'
```

On a hit: stop, tell the user, do not commit. A secret as a placeholder (`process.env.X`, `<YOUR_KEY>`) is fine — a real value, never.

If a secret was already committed, **removing it in the next commit is not enough** — the value stays in history. Tell the user to rotate the key.

## Workflow

For every new prompt/feature:

1. Write the plan to `docs/todo/<slug>.md` before implementing.
2. Implement.
3. On delivery, move the file to `docs/done/<slug>.md`.

## PR = release = changelog

**One PR is one release.** Every `dev` → `main` PR ships a version, and its description is that version's changelog.

**There must always be an open `dev` → `main` PR.** It is the shared workspace for the release: as work lands on `dev`, the PR description grows with it. Devs collaborate on the release *inside* that PR. When a release merges, open the next `dev` → `main` PR right away, even if empty. There is never a moment without one.

### Before starting any work — check the open PR

**Always read the open `dev` → `main` PR before writing code.** Its body is the authoritative list of what the current release already contains.

```bash
rtk gh pr list --base main --head dev --state open
rtk gh pr view <N>            # read the body: is this change already here?
```

If the change is already described there, it is already done or in progress — do not redo it. If it is partially there, extend it instead of duplicating. This is the cheapest way to avoid rework across devs.

### After every commit — update the PR body

**Pushing commits without updating the PR description is incomplete work.** The changelog is written continuously, never reconstructed at merge time.

```bash
rtk gh pr edit <N> --body-file <file>
```

Add the change under the right heading (`Added` / `Changed` / `Fixed`) and bump the version in the title if scope grew. A reader of that PR must always see the current, complete state of the release.

### Versioning

Versioning starts at **0.01** and grows with scope:

- `0.0X` → normal increment (feature, fix, tweak)
- `0.X0` → major milestone (new system, new world, server live)
- `1.00` → App Store release

The PR description **is** the changelog. Format:

```
## 0.03

### Added
- ...

### Changed
- ...

### Fixed
- ...
```

Before opening a PR, check the last merged version and increment from it. While the PR stays open, keep editing its description as commits land — the changelog is written continuously, not at merge time.

## Commands

```bash
rtk pnpm test
rtk pnpm lint
rtk pnpm typecheck
```

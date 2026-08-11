READ ~/Documents/projects/pessoal/agent/AGENTS.md BEFORE ANYTHING.

# Ossuary

Idle game for iOS. No prestige, with PVP and cross-device sync — the client is not trusted, validation is server-side.

Reference documents:
- `docs/design/core-design.md` — pillars, core loop, party, combat, economy, Ossuary, world map
- `plano-tecnico-idle-ios.md` — stack, architecture, sync, PVP, monetization
- `world_1_vestibule.md` — World 0 (the Vestibule) design

Design docs are written in Portuguese; that is intentional. Keep them in Portuguese.

## Stack

- TypeScript everywhere. `packages/core` (pure TS) is shared by iOS, web and server.
- iOS/Android/Web client: React Native + Expo (single codebase for all three platforms).
- Rendering: react-native-skia (2D sidescroller, same render code on iOS and web).
- Server: Node + TypeScript, Postgres (saves in `jsonb`).
- Content is **data**, not code.

## UI architecture

**MVVM is mandatory for new screens and screen components in `apps/expo`.**

- `*ViewModel.ts` owns local UI state, derived display values and named user
  commands; it may call the shared core but must not render JSX.
- `*Screen.tsx` and presentational components are the View: they render the
  ViewModel and bind controls to its commands; they do not own business state
  or duplicate core rules.
- `packages/core` remains Functional Core: pure TypeScript, immutable state
  transitions and no React/MVVM dependency.
- Temporary test screens follow the same separation and must be clearly
  marked as test-only in the UI and documentation.

## Rules

**Git — never commit, push, open a PR, or send anything to GitHub without the user's explicit authorization.** No exceptions.

**`main` is the only permanent branch, and it is never committed to directly.** The flow is always:

```
main  →  <type>/<slug>  →  PR  →  main
```

1. Branch off the latest `main`.
2. Do the work there.
3. Open a PR from that branch into `main`.
4. Merge, then delete the branch.

- **No direct commits to `main`**, no `push origin main`, not even for "just a quick fix".
- One branch per task. Keep them **small and short-lived** — several people work off `main` at once, and a long-lived branch turns into a merge problem for everyone else.
- Update from `main` before opening the PR, so the diff shows your change and not someone else's.
- Branch naming: `feat/`, `fix/`, `docs/`, `refactor/`, `chore/` + short slug.

`main` is protected on GitHub: PR required, force-push and deletion blocked, and the protection applies to admins too. A direct push is rejected by the server, not just by this file. Emergency bypass means temporarily removing the protection — ask the user first, never do it unprompted.

**Read the user's personal instruction files before acting.** The project root may hold per-user instruction docs — typically named `*instructions.md` and listed in `.gitignore`, since they are personal and never committed.

```bash
rtk ls *instructions.md 2>/dev/null
```

Read whatever is there and follow it. These files carry things the repo cannot: which GitHub account is allowed to push, local environment quirks, personal preferences. They override nothing about safety, but they do decide *how* to carry out a task.

Never commit them, never quote their contents in a commit message, PR, or issue.

**Third-party art.** Sprite PNGs live in `sprites/` and **are committed** — the owner's call, made knowingly: free packs (CraftPix and similar) let you ship the art inside a game but their licence forbids redistributing the files, and a public repo is redistribution. Source files (`.psd`) stay out; they are editing material, not runtime assets. When adding a pack, record its name, origin and licence in the PR so provenance stays auditable. To wire a pack to a character, use the `sprite-import` skill, and keep the procedural fallback in any renderer that uses sprites — it is what keeps the prototype working when an asset fails to load.

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
3. **Review every doc and fold in what changed** (see below).
4. Move the plan to `docs/done/<slug>.md`.

### After any change, sweep the docs

**A change is not finished while a doc still describes the old behavior.** After every change — feature, fix, or tweak — walk the docs and update whatever the change touched. Docs drifting out of sync is worse than no docs: the next person trusts them and is wrong.

```bash
rtk ls docs/design/*.md docs/done/*.md *.md
```

What to check each time:

| Doc | Fold in |
|---|---|
| `docs/design/core-design.md` | New systems, decided open questions, changed rules and formulas |
| `world_*.md` | Anything affecting that world's bestiary, phases or drops |
| `plano-tecnico-idle-ios.md` | Stack, architecture, sync, PVP, monetization decisions |
| `docs/done/<slug>.md` | What was actually delivered, and how it differed from the plan |
| `AGENTS.md` | New commands, new conventions, new constraints |
| Open PR body | The change, under `Added` / `Changed` / `Fixed` |

Two rules that carry most of the value:

- **A resolved open question moves out of the open list** and into the resolved table, with the decision recorded. An open question that was silently answered in code is the most expensive kind of stale doc.
- **When implementation contradicts a doc, the doc is wrong until proven otherwise** — but say so explicitly instead of quietly editing it. The user decides whether the code or the doc was the mistake.

## Pull requests

**One PR is one task**, not a release. There is no version number and no running changelog to maintain — with several people merging into `main`, a shared release branch was more bookkeeping than it was worth.

### Before starting — check what is already in flight

Someone may already be doing it, or have done it this morning.

```bash
rtk gh pr list --state open                      # o que está em andamento
rtk gh pr list --state merged --limit 20         # o que entrou recentemente
rtk proxy git log --oneline -20 origin/main
```

If an open PR already covers the change, extend that branch instead of starting a parallel one.

### The PR description

Write it for the person reviewing, and for whoever runs `git log` in six months. Keep it short and concrete:

```
## O que muda

<one or two sentences: the change and why>

### Added / Changed / Fixed
- ...

### Verificação
- how it was tested, and what the result was
```

Use only the headings you need. Keep the description in sync as you push more commits to the branch — check the PR is still **open** before editing it; editing a merged PR writes history that never shipped in it.

### Merging

- If the PR sat long enough for `main` to move, update from `main` and re-check the diff before merging.

### A merged branch is deleted — always

**The merge is not finished while the branch still exists.** Delete it locally and on the remote, immediately after merging:

```bash
rtk proxy git checkout main && rtk proxy git pull --ff-only origin main
rtk proxy git branch -d <branch>            # -d refuses if not merged; that is the safety net
rtk proxy git push origin --delete <branch>
```

Leaving merged branches around is not harmless: `git branch -r` stops being a list of *what is in flight* and becomes a graveyard, and the next person cannot tell live work from finished work.

Sweep for leftovers whenever you pull:

```bash
rtk proxy git fetch origin --prune
rtk proxy git branch -r --merged origin/main | grep -v 'origin/main$'
```

Anything that lists there is merged and should be gone. Use `-d`, never `-D`: if git refuses, the branch has commits that never reached `main` and deleting it would lose them.

## Commands

```bash
rtk pnpm test
rtk pnpm lint
rtk pnpm typecheck
```

# MVVM e faixa de XP no laboratório

## Entregue

- Estado, valores derivados e comandos do laboratório movidos para
  `apps/expo/mechanics-lab/MechanicsLabViewModel.ts`.
- `MechanicsLabScreen.tsx` ficou como View, sem regras de negócio ou `useState`
  próprio.
- Adicionado slider de 0 a 500 XP para escolher recompensas de teste.
- `Derrotar Ignavo` continua representando o fluxo futuro de combate e concede
  15 XP pelo ViewModel.
- MVVM registrado como obrigatório no `AGENTS.md` e no plano técnico para novas
  telas Expo; o core continua usando Functional Core.

## Verificação

- `pnpm typecheck` ✅
- `pnpm build:web` ✅
- `git diff --check` ✅

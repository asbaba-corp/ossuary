# XP em módulo dedicado e padrão de estado imutável

## Entregue

- XP movido de `packages/core/src/index.ts` para
  `packages/core/src/progression/xp.ts`.
- `index.ts` mantém somente o contrato da plataforma e o re-export público.
- O módulo documenta e aplica o padrão Functional Core: funções puras,
  dependências explícitas e transições imutáveis.
- A documentação em `docs/done/xp-level-up.md` explica a curva, o cálculo de
  múltiplos level-ups e o XP excedente em português.
- PR preparada com descrição em português.

## Verificação

- `pnpm typecheck` ✅
- `pnpm build:core` ✅
- Smoke test do barrel público (`@ossuary/core`) ✅
- `git diff --check` ✅

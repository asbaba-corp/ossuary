# Compilação do core antes dos pipelines

## Entregue

O CI e o preview do Firebase agora compilam `packages/core` antes de qualquer
workspace que importe `@ossuary/core`.

## Causa

Em um runner limpo, `apps/expo` não conseguia resolver `@ossuary/core` porque o
`package.json` do core aponta para `dist/index.js` e `dist/index.d.ts`, que só
existem depois de `pnpm build:core`. Localmente isso ficou mascarado porque o
build já havia sido executado antes do typecheck e do preview.

## Verificação

- `pnpm typecheck` ✅
- `pnpm build:web` ✅
- Ordem revisada em `.github/workflows/ci.yml` e
  `.github/workflows/firebase-preview.yml` ✅

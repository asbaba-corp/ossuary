# Melhorar PR #4

## Entregue

- Corrigidos metadados visuais do Expo para o tema escuro do app.
- README, plano técnico e design atualizados para refletir o cliente único em
  `apps/expo`.
- Adicionado `pnpm build:web` como comando comum para exportar o cliente web.
- Adicionado CI em `.github/workflows/ci.yml` para typecheck, build do core e
  exportação web em PRs e pushes para `main`.
- Adicionado `firebase.json` com Hosting estático para `apps/expo/dist` e
  fallback SPA para `index.html`.
- Adicionado `.github/workflows/firebase-preview.yml`, com canal por número de
  PR, expiração de sete dias e comentário automático da URL pelo Firebase.

## Configuração necessária no GitHub

Criar o secret `FIREBASE_TOKEN`, gerado com `firebase login:ci`, para uma conta
com permissão de deploy no Firebase Hosting. O ID do projeto fica no
`.firebaserc`; nenhum valor secreto foi adicionado aos arquivos.

PRs de forks não recebem esses secrets do GitHub e, por isso, são ignorados
pelo workflow de preview.

## Verificação

- `pnpm typecheck` ✅
- `pnpm build:core` ✅
- `pnpm build:web` ✅
- JSON de `firebase.json` e `apps/expo/app.json` válido ✅
- `git diff --check` ✅
- `actionlint` não disponível neste ambiente; a sintaxe YAML foi revisada
  manualmente.

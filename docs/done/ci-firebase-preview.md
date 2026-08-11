# CI — Firebase Preview

## Entregue

- CI executa typecheck, build do core e exportação web em pull requests e
  pushes para `main`.
- Firebase Hosting publica `apps/expo/dist` em um canal `pr-<number>` com
  expiração de sete dias e comenta a URL na PR.
- O workflow usa `FIREBASE_TOKEN`; nenhum token foi adicionado ao repositório.
- PRs de forks são ignorados porque o GitHub não fornece secrets para eles.

## Configuração necessária

```bash
firebase login:ci
```

Salvar o token retornado como o secret `FIREBASE_TOKEN` do repositório. A conta
precisa de permissão de administração do Firebase Hosting no projeto definido
em `.firebaserc`.

## Verificação

- `pnpm typecheck` ✅
- `pnpm build:core` ✅
- `pnpm build:web` ✅
- Configuração JSON válida ✅
- `git diff --check` ✅

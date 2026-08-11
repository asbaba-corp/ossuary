# Scaffold: Expo multiplataforma (iOS/Android/Web) + phone frame

## Objetivo

Montar o **boilerplate** do app em React Native + Expo que alvo iOS, Android e
Web, com `packages/core` (TS puro) como pacote do workspace, e a **Web**
rodando uma **página em branco dentro de um phone frame**. Sem lógica de jogo
neste passo — só a estrutura e o frame.

## Decisão de stack (registrada)

O `core-design.md`/README/plano-tecnico diziam "**Web: React + Vite**" (cliente
web separado do RN). Decidido por **Expo também para Web** — um único codebase
RN → ios/android/web. Docs atualizados (README, plano-tecnico §2, AGENTS §Stack)
para Web = React Native (Expo / RN Web). Ver AGENTS.md: dizer explicitamente,
não editar em silêncio.

## Stack / decisões

- **Package manager:** pnpm (via corepack). Workspace monorepo.
- **Layout:**
  - `packages/core` — TS puro (sem React/Native). **Stub** neste passo: só
    exporta `GAME_NAME` / `Platform` / `SUPPORTED_PLATFORMS`. A simulação do
    jogo entra depois (core-design §4).
  - `apps/expo` — Expo SDK 57, alvo ios/android/web. `index.ts` como entry
    (válido para web também). `PhoneFrame` envolve a tela num bezel de celular
    **só no web** (`Platform.OS === 'web'`); nativo é full-screen.
- **Render futuro:** react-native-skia (igual iOS e web, core-design §stack).
  Ainda não adicionado — este passo é só estrutura.

## Arquivos

- `package.json` (root, private, workspaces, `packageManager: pnpm`)
- `pnpm-workspace.yaml`
- `.npmrc` (node-linker=hoisted + hoist de expo/react-native para o Expo web)
- `tsconfig.base.json`
- `packages/core/package.json`, `tsconfig.json`, `tsconfig.build.json`,
  `src/index.ts` (**stub**)
- `apps/expo/` — gerado por `create-expo-app -t blank-typescript`, depois:
  - `package.json` → name `@ossuary/app`, dep `@ossuary/core: workspace:*`,
    script `typecheck`
  - `app.json` → name/slug "Ossuary", `platforms: [ios, android, web]`
  - `App.tsx` → laboratório de mecânicas dentro de `PhoneFrame`
  - `MechanicsLabScreen.tsx` → tela isolada para testar XP, level-up e atributos
  - `PhoneFrame.tsx` → bezel web-only, responsivo (maxHeight 94%, aspect-ratio)

## Passos

1. Workspace root (pnpm) + `.npmrc` + `tsconfig.base.json`. ✅
2. `packages/core` stub (TS puro, sem lógica). ✅
3. `apps/expo` via `create-expo-app -t blank-typescript`; renomear, adicionar
   dep do workspace, plataformas, instalar `react-dom` + `react-native-web`
   (web). ✅
4. `PhoneFrame.tsx` + `App.tsx` (laboratório de mecânicas no frame). ✅
5. `pnpm install`; `build:core`; `typecheck` do app; `expo export --platform web`. ✅

## Verificação

- `pnpm install` ok (linka `@ossuary/core`) ✅
- `pnpm --filter @ossuary/core build` ok ✅
- `pnpm --filter @ossuary/app typecheck` ok ✅
- `expo export --platform web` compila sem erro (proxy de que ios/android
  config está válida também) ✅
- Página web preenche o viewport (verificado por computed style: page
  `height` = viewport, `background` #17171c) e o phone frame (bezel escuro,
  tela em branco) renderiza centralizado; nativo é full-screen ✅
- iOS/Android não verificáveis aqui sem simulador; config presente e build web
  passa

## Entregue

- Monorepo pnpm: root (`package.json`, `pnpm-workspace.yaml`, `.npmrc`,
  `tsconfig.base.json`).
- `packages/core`: pacote TS puro stub; `build` e `typecheck` ok.
- `apps/expo`: Expo SDK 57, alvo ios/android/web.
  - `PhoneFrame.tsx`: bezel de celular web-only, responsivo, full-screen no
    nativo.
  - `App.tsx`: laboratório de mecânicas dentro do frame.
  - `MechanicsLabScreen.tsx`: laboratório visual temporário de progressão.
- Docs atualizadas: README, plano-tecnico §2, AGENTS §Stack → Web = React
  Native (Expo).

## Melhorias incorporadas na PR #4

- Metadados Expo alinhados ao shell escuro do app e ao palette do Ossuary.
- Arquitetura documentada como um cliente único em `apps/expo` para iOS,
  Android e Web.
- CI em `.github/workflows/ci.yml` para instalar com lockfile, rodar
  typecheck, compilar o core e exportar a Web.
- Firebase Hosting configurado em `firebase.json`; o workflow
  `.github/workflows/firebase-preview.yml` publica um canal temporário por PR.
  Ele exige o secret `FIREBASE_TOKEN`, não inclui credenciais no repositório e
  ignora PRs de forks.

## Atualização posterior

O shell vazio foi substituído por um laboratório temporário de progressão. A
tela é deliberadamente compartimentada em personagem, controles de teste e
atributos, e deixa explícito que ainda não representa o jogo final. O estado
do laboratório fica em `MechanicsLabViewModel.ts`, conforme a convenção MVVM.

## Próximos passos (fora deste escopo)

- Implementar a simulação em `packages/core` (combate determinístico,
  atributos, economia — core-design §4).
- Render do jogo com react-native-skia dentro do `PhoneFrame`.
- Comprar o build nativo (iOS/Android) para validar de fato.

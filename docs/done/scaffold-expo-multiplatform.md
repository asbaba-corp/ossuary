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
  - `App.tsx` → página em branco dentro de `PhoneFrame`
  - `PhoneFrame.tsx` → bezel web-only, responsivo (maxHeight 94%, aspect-ratio)

## Passos

1. Workspace root (pnpm) + `.npmrc` + `tsconfig.base.json`. ✅
2. `packages/core` stub (TS puro, sem lógica). ✅
3. `apps/expo` via `create-expo-app -t blank-typescript`; renomear, adicionar
   dep do workspace, plataformas, instalar `react-dom` + `react-native-web`
   (web). ✅
4. `PhoneFrame.tsx` + `App.tsx` (página em branco no frame). ✅
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
  - `App.tsx`: página em branco (#0e0e12) dentro do frame.
- Docs atualizadas: README, plano-tecnico §2, AGENTS §Stack → Web = React
  Native (Expo).

## Não commitado

Por regra do repositório, nada foi commitado. Branch local:
`feat/scaffold-expo-multiplatform`.

## Próximos passos (fora deste escopo)

- Implementar a simulação em `packages/core` (combate determinístico,
  atributos, economia — core-design §4).
- Render do jogo com react-native-skia dentro do `PhoneFrame`.
- Comprar o build nativo (iOS/Android) para validar de fato.

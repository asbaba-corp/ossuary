# Ossuary

Jogo idle 2D sidescroller de dark fantasy sobre o Inferno de Dante. Sem prestige, com party de até 4, PVP assíncrono e sync entre dispositivos.

**Estado: pré-produção.** A aplicação Expo é a experiência principal em `/` e
usa o loop determinístico do core com save local. O laboratório técnico fica em
`/lab` para inspecionar domínios isoladamente.

## Rodar a aplicação

```bash
pnpm web
```

A home jogável fica em `http://localhost:8081/`. O laboratório fica em
`http://localhost:8081/lab`.

O conteúdo inicial usa o Vestíbulo em
`packages/core/src/vestibule-content.ts`.

O prototype está temporariamente mantido em `prototype/scene.html` para
comparação lado a lado durante a migração. Ele não é a home nem participa do
build Expo.

## Arte e conteúdo

Os PNGs ficam em `sprites/` e vêm no repositório; os `.psd` não, por serem
fonte de edição.

Para atribuir um pack a um personagem, use a skill `sprite-import`.

Não há spritesheet de mochila no repositório: o ícone de mochila do prototype
é um SVG inline da interface. A migração deve preservar esse ícone como
componente, não procurar um PNG inexistente.

## Stack

O app multiplataforma fica em `apps/expo`; a arquitetura de servidor e sync
continua descrita em `plano-tecnico-idle-ios.md`.

- **TypeScript** em tudo, com `packages/core` puro compartilhado por cliente e servidor
- **iOS/Android/Web:** React Native + Expo — um único codebase (RN Web para a web)
- **Render:** React Native Skia para a cena 2D e componentes React Native para
  HUD, party e painéis.
- **Servidor:** Node + TypeScript, Postgres
- **Monorepo (pnpm):** `packages/core` (TS puro, lógica do jogo) + `apps/expo` (cliente Expo ios/android/web).

### Verificações e preview

```bash
pnpm install
pnpm web
pnpm typecheck
pnpm build:core
pnpm build:web
```

`pnpm web` inicia a aplicação Expo em modo web local. Para limpar o cache do
Metro, use `pnpm web -- --clear`. O comando equivalente sem o atalho é
`pnpm --filter @ossuary/app web`.

O `build:web` exporta a aplicação em `apps/expo/dist`. A rota `/lab` continua
identificada por `TESTE` e pelas seções numeradas; seus controles são fixtures
de inspeção e não aparecem na home.

O workflow `CI` executa esses checks em cada PR e em pushes para `main`. O
workflow `Firebase preview` publica o `apps/expo/dist` em um canal temporário
por PR. Para habilitá-lo, configure no repositório os secrets
`FIREBASE_TOKEN` (gerado com `firebase login:ci`); a configuração do projeto
fica em `.firebaserc` e nenhuma credencial fica no código. PRs vindos de forks
são ignorados porque não recebem secrets do GitHub.

## Documentos

| Arquivo | Conteúdo |
|---|---|
| `docs/design/core-design.md` | Pilares, core loop, combate, economia, Ossuary, mapa de mundos |
| `plano-tecnico-idle-ios.md` | Stack, arquitetura, sync, PVP, monetização |
| `world_1_vestibule.md` | Mundo 0, o Vestíbulo — bestiário e fases |
| `AGENTS.md` | Fluxo de trabalho e convenções do repositório |

## Contribuir

`main` é a única branch permanente e não recebe commit direto:

```
main  →  <type>/<slug>  →  PR  →  main
```

Detalhes em `AGENTS.md`.

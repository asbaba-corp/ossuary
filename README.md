# Ossuary

Jogo idle 2D sidescroller de dark fantasy sobre o Inferno de Dante. Sem prestige, com party de até 4, PVP assíncrono e sync entre dispositivos.

**Estado: pré-produção.** O app tem um scaffold Expo multiplataforma e uma
página inicial vazia; a lógica do jogo ainda está apenas no protótipo e nos
documentos de design.

## Rodar o protótipo

Arquivo único, sem dependências e sem build:

```bash
open prototype/scene.html          # macOS
xdg-open prototype/scene.html      # Linux
```

**Requisito:** um navegador atual. Só isso.

### Parâmetros de URL (teste)

| Parâmetro | Efeito |
|---|---|
| `?t=SEGUNDOS` | Adianta a simulação antes do primeiro quadro |
| `?tab=inv\|stats` | Abre direto numa aba |
| `?pot=1` | Abre o painel de poções |
| `?auto=1` | Distribui os pontos de atributo sozinho |
| `?debug=1` | Imprime um resumo em JSON no fim da página |

Captura de tela sem interação — `--virtual-time-budget` não avança o `requestAnimationFrame`, daí o `?t=`:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --screenshot=out.png \
  "file://$PWD/prototype/scene.html?t=11"
```

## Stack planejada

O scaffold inicial está montado em `apps/expo`; a arquitetura completa ainda é
o alvo descrito em `plano-tecnico-idle-ios.md`.

- **TypeScript** em tudo, com `packages/core` puro compartilhado por cliente e servidor
- **iOS/Android/Web:** React Native + Expo — um único codebase (RN Web para a web)
- **Render:** react-native-skia
- **Servidor:** Node + TypeScript, Postgres
- **Monorepo (pnpm):** `packages/core` (TS puro, lógica do jogo) + `apps/expo` (cliente Expo ios/android/web). Rodar o app web: `pnpm --filter @ossuary/app web`.

### Verificações e preview

```bash
pnpm install
pnpm typecheck
pnpm build:core
pnpm build:web
```

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
| `world_1_vestibule.md` | Mundo 1 — bestiário e fases |
| `AGENTS.md` | Fluxo de trabalho e convenções do repositório |

## Contribuir

`main` é a única branch permanente e não recebe commit direto:

```
main  →  <type>/<slug>  →  PR  →  main
```

Detalhes em `AGENTS.md`.

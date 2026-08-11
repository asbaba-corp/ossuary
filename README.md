# Ossuary

Jogo idle 2D sidescroller de dark fantasy sobre o Inferno de Dante. Sem prestige, com party de até 4, PVP assíncrono e sync entre dispositivos.

**Estado: pré-produção.** Ainda não existe código de aplicação — só documentos de design e um protótipo jogável.

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

Nada disso está montado ainda; é o alvo descrito em `plano-tecnico-idle-ios.md`.

- **TypeScript** em tudo, com `packages/core` puro compartilhado por cliente e servidor
- **iOS/Android/Web:** React Native + Expo — um único codebase (RN Web para a web)
- **Render:** react-native-skia
- **Servidor:** Node + TypeScript, Postgres

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

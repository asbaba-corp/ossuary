READ ~/Documents/projects/pessoal/agent/AGENTS.md BEFORE ANYTHING.

# Ossuary

Jogo idle para iOS. Sem prestige, com PVP e sync entre dispositivos — o cliente não é confiável, validação é server-side.

Documentos de referência:
- `plano-tecnico-idle-ios.md` — stack, arquitetura, sync, PVP, monetização
- `world_1_vestibule.md` — design do Mundo 1

## Stack

- TypeScript em tudo. `packages/core` (TS puro) é compartilhado por iOS, web e servidor.
- Cliente iOS: React Native + Expo. Web: React + Vite.
- Servidor: Node + TypeScript, Postgres (saves em `jsonb`).
- Conteúdo é **dado**, não código.

## Regras

**Git — nunca commitar, push, abrir PR ou mandar qualquer coisa pro GitHub sem autorização explícita do usuário.** Sem exceção.

**Não reinvente a roda.** Antes de escrever qualquer coisa nova, procure função/módulo existente no repo. Regra de balanceamento, fórmula de tick, tipo de save — se já existe, reusa. Duplicar lógica entre cliente e servidor é bug garantido: mora em `packages/core`.

## Fluxo de trabalho

Cada prompt/feature nova:

1. Escrever plano em `docs/todo/<slug>.md` antes de implementar.
2. Implementar.
3. Ao entregar, mover o arquivo para `docs/done/<slug>.md`.

## PR = changelog

Cada PR é uma entrada de changelog. Versionamento começa em **0.01** e cresce com o escopo:

- `0.0X` → incremento normal (feature, fix, ajuste)
- `0.X0` → marco maior (sistema novo, mundo novo, servidor no ar)
- `1.00` → release na App Store

A descrição do PR **é** o changelog. Formato:

```
## 0.03

### Added
- ...

### Changed
- ...

### Fixed
- ...
```

Antes de abrir PR, checar a última versão mergeada e incrementar a partir dela.

## Comandos

```bash
rtk pnpm test
rtk pnpm lint
rtk pnpm typecheck
```

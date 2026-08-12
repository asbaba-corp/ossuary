# Corte vertical: GameState e persistência local

## Entregue

- Estado persistente imutável no core, com roster/party, inventário, economia,
  Ossuary, progresso de mundo e run de caminhada/combat/recompensa.
- Run determinística com checkpoints idempotentes, XP, ouro, equipamento,
  consumível e desbloqueio de fase; derrota/recuo preserva o progresso
  permanente e inicia um novo checkpoint de run.
- Save versionado com validação, `MemorySaveStore`, `GameSession` e porta de
  sincronização reservada para a etapa futura de contas.
- A fronteira de servidor e sync remoto permanece planejada, mas não é
  iniciada pelo ambiente dev do Lab.
- Cenário executável em `packages/core/src/vertical-scenario.ts`.
- A persistência de plataforma está detalhada em
  `persistent-save-integration.md`.

## Verificação

- `tsc -p packages/core/tsconfig.json --noEmit` ✅
- `pnpm typecheck` ✅ para core e Expo
- `pnpm --filter @ossuary/core scenario` — cenário determinístico ✅
- Nenhum framework de testes foi adicionado, conforme escopo.

# Fundação do domínio de economia

## Entregue

- Adicionado `EconomyState` puro com saldos de conta e acumuladores da run.
- Adicionados IDs de conveniência para ouro, poeira, material e preço de
  guardião, mantendo recursos genéricos por `resourceId`.
- Adicionadas transações de crédito e débito com motivo auditável.
- Débitos da conta exigem saldo suficiente.
- Despesas da run podem produzir saldo líquido negativo.
- Adicionados lotes atômicos de transações sem mutação parcial.
- Adicionados eventos com saldo após transação e saldo da run.
- Adicionada seção test-only no Lab com operações artificiais de conta e run.

## Limites preservados

- Nenhum loot, drop, venda, loja, poção ou custo do Ossuary foi implementado.
- O domínio não conhece inimigos, combate, loop idle ou conteúdo de mundo.
- Não há save, servidor ou sincronização.

## Verificação executada

- Smoke test de crédito, débito, saldo negativo da run, saldo insuficiente e
  atomicidade ✅
- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- `pnpm build:web` ✅

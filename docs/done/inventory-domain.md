# Inventory mínimo

## Entregue

- Criado o domínio puro `Inventory` como coleção imutável de `ItemStack`.
- Capacidade configurável com padrão de 128 slots.
- Consumíveis com o mesmo `item.id` são empilhados em um único slot.
- Equipamentos ocupam slots individuais, podem repetir o mesmo `item.id` e
  são limitados à quantidade 1 por slot.
- Implementados adicionar, remover, consultar quantidade e resumir slots.
- Inventário cheio rejeita a adição sem descartar ou vender o item.
- O laboratório Expo demonstra adição, empilhamento, remoção e capacidade de
  teste reduzida para tornar a lotação observável.
- Não foram adicionados loot, venda automática, descarte, merge, ownership
  persistente, servidor, combate ou economia.

## Verificação

- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- Smoke test público de empilhamento, capacidade, remoção e imutabilidade ✅

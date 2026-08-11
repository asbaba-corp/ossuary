# Correção de itens repetidos no inventário

## Entregue

- Equipamentos iguais agora entram em slots individuais, sem serem tratados
  como uma pilha duplicada inválida.
- Consumíveis continuam agrupando por `item.id`.
- `getItemQuantity` soma as ocorrências de equipamentos repetidos.
- Remover um equipamento remove apenas uma ocorrência.
- A adição e remoção do laboratório calculam a transição antes de chamar
  `setInventory`, evitando que exceções do core escapem de callbacks de estado.
- IDs repetidos entre tipos diferentes continuam sendo rejeitados para manter
  a identidade do item consistente.

## Verificação

- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- Smoke test de equipamentos repetidos, empilhamento e remoção ✅

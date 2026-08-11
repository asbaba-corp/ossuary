# Correção de itens repetidos no inventário

## Entregue

- Equipamentos iguais agora entram em slots individuais, sem serem tratados
  como uma pilha duplicada inválida.
- Equipamentos concretos agora são identificados por `instanceId`; duas peças
  com o mesmo `item.id` e instâncias diferentes entram, mas uma instância
  duplicada é rejeitada.
- Consumíveis continuam agrupando por `item.id`.
- `getItemQuantity` soma as ocorrências de equipamentos repetidos.
- Remover um equipamento recebe o `instanceId` e remove apenas aquela peça;
  consumíveis continuam sendo removidos por `item.id`.
- A adição e remoção do laboratório calculam a transição antes de chamar
  `setInventory`, evitando que exceções do core escapem de callbacks de estado.
- IDs repetidos entre tipos diferentes continuam sendo rejeitados para manter
  a identidade do item consistente.

## Verificação

- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- Smoke test de equipamentos repetidos, empilhamento e remoção ✅

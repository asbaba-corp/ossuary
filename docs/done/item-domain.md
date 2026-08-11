# Domínio de itens

## Entregue

- `Equipment` foi evoluído para uma união geral `Item`, com os tipos
  `equipment` e `consumable`.
- Itens agora carregam raridade (`common`, `rare`, `epic`, `legendary`) e
  efeitos tipados.
- Equipamentos mantêm os seis slots e a API de loadout existente.
- Adicionado `ItemStack` para quantidade de consumíveis sem criar inventário
  global.
- Adicionados uso de consumível, estado separado de efeitos ativos e remoção
  explícita por personagem.
- Efeitos de bônus de atributos alteram os atributos efetivos; efeitos futuros
  são armazenados sem depender de combate ou economia.
- O laboratório demonstra raridade, consumo, ativação, atributos efetivos e
  remoção do efeito.
- Não foram adicionados inventário, ownership, loot, duração temporal,
  combate, merge, reroll, servidor ou persistência.

## Verificação

- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- Smoke test público de equipamentos, consumíveis, efeitos e imutabilidade ✅

# Ciclo completo de equipamento + loot determinístico

## Entrega

- O core agora identifica equipamentos por `instanceId`, permite equipamentos
  repetidos do mesmo item-base e mantém consumíveis empilháveis.
- `equipEquipmentFromInventory` e `unequipEquipmentToInventory` fazem
  transições imutáveis entre inventário e loadout, incluindo substituição e
  validação atômica de capacidade/posse.
- Stats efetivos agregam atributos, dano/defesa base e percentuais definidos em
  `EquipmentStats`; o preview fornece atual, candidata e delta por stat.
- `createEquipmentFromDropTable` seleciona uma entrada ponderada e rola pools
  deterministicamente, sem `Math.random()` nem geração de IDs.
- O laboratório usa as transições do core, exibe stats/preview e gera drops de
  uma tabela fixture.

## Verificação

- `pnpm build:core` — passou
- `pnpm typecheck` — passou
- `git diff --check` — passou

Combate, merge, reroll, venda automática, servidor e tabelas oficiais de mundo
permanecem fora deste milestone.

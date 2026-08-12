# Integração do combate com party

## Entregue

- `Party` passou a persistir apenas IDs ordenados e `RosterState` passou a ser
  a fonte canônica de personagens e loadouts.
- `createCombatantFromCharacter` e `createCombatantsFromParty` compõem
  progressão, equipamento, efeitos de itens, fórmulas derivadas, Ossuary e
  spell loadout em snapshots de combate.
- O Lab passou a gerar um combatant por personagem ativo, sem remover os
  presets artificiais de vitória, derrota e efeitos.
- A tela exibe HP, mana e efeitos do snapshot utilizado.
- O log completo passou a ficar em uma área rolável, com cada evento marcado
  pelo tick correspondente.

## Fora deste milestone

Game loop, caminhada, waves, loot, recompensas, recuo, persistência de servidor
e conteúdo definitivo de inimigos.

## Verificação

- `pnpm build:core`
- `pnpm typecheck`
- `pnpm build:web`
- Smoke test do adaptador com personagem, fórmulas e loadout vazio.

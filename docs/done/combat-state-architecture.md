# Arquitetura de estado de combate

## Entregue

- `Party` agora persiste IDs ordenados e `RosterState` reúne personagens,
  loadouts de equipamento e loadouts de spells.
- Builds são resolvidos com validação de referências antes de entrarem no
  combate.
- `createCombatantsFromParty` gera um snapshot para cada membro ativo,
  preservando a ordem da party.
- `CombatContentContext` resolve spells por ID; definições não são duplicadas
  em snapshots ou runtime.
- O Mechanics Lab foi migrado para o roster canônico e permite inspecionar a
  party completa.
- Documentação de design e milestones anteriores foi sincronizada.

## Fora desta etapa

Game loop, GameState completo, servidor, sincronização, waves reais, loot,
conteúdo definitivo de inimigos e balanceamento final.

## Verificação

- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- `pnpm build:web` — executado como verificação final
- `git diff --check` — executado como verificação final

Não foram adicionados testes automatizados ou integração de testes ao CI,
conforme decisão do escopo.

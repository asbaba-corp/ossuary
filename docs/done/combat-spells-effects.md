# Spells e efeitos no combate

## Entregue

- Combatentes carregam loadout, mana inicial/máxima e dados de escala; as
  definições são resolvidas por `CombatContentContext`.
- Cada tick avança cooldowns, avalia autocast pela prioridade e registra
  tentativas, falhas por mana/cooldown e casts executados.
- Spells de dano afetam o alvo vivo estável e podem encerrar o combate.
- Proteção reduz dano recebido enquanto durar; controle reduz a cadência do
  alvo enquanto durar. A chance de controle usa o seed determinístico existente.
- O Lab exibe mana e efeitos ativos e inclui preset dedicado para validá-los.

## Fora deste milestone

Game loop, caminhada, waves, loot, recompensas, recuo, persistência, conteúdo
definitivo e balanceamento final.

## Verificação

- `pnpm build:core`
- `pnpm typecheck`
- `pnpm build:web`
- Smoke test de seed, mana, autocast, controle e eventos de spell.

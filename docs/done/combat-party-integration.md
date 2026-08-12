# Integração do combate com party

## Entregue

- `Character` foi extraído para `packages/core/src/character.ts`; `Party`
  continua sendo o agregado que ordena e contém personagens.
- O adaptador `createCombatantFromCharacter` compõe progressão, equipamento,
  efeitos de itens, fórmulas derivadas, Ossuary e spell loadout em um snapshot
  de combate.
- O Lab ganhou o modo `Party selecionada`, sem remover os presets artificiais
  de vitória, derrota e efeitos.
- A tela exibe HP, mana e efeitos do snapshot utilizado.
- O log completo passou a ficar em uma área rolável, com cada evento marcado
  pelo tick correspondente.

## Fora deste milestone

Game loop, caminhada, waves, loot, recompensas, recuo, persistência e conteúdo
definitivo de inimigos.

## Verificação

- `pnpm build:core`
- `pnpm typecheck`
- `pnpm build:web`
- Smoke test do adaptador com personagem, fórmulas e loadout vazio.

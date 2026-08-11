# Domínio de equipamento mínimo

## Entregue

- Criado um domínio puro de equipamentos separado da entidade `Character`.
- Adicionados seis slots: arma, escudo, elmo, peito, luvas e botas.
- Equipamentos possuem identidade, nome, slot e bônus planos de
  CONS/STR/DEX/INT.
- Implementados loadout vazio, equipar, substituir, desequipar e leitura de
  equipamento com transições imutáveis.
- Atributos efetivos combinam progressão base e bônus do loadout sem mutar o
  `CharacterProgress`.
- O laboratório Expo demonstra fixtures de espada, escudo e botas no
  personagem selecionado, com atributos base e efetivos.
- Não foram adicionados inventário, ownership, loot, raridade, tier, afixos,
  efeitos especiais, merge, reroll ou combate.

## Verificação

- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- Smoke test de loadout, substituição, atributos efetivos e imutabilidade ✅

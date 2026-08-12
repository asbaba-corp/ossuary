# Integração das mecânicas de progressão

## Entregue

- Adicionado cálculo puro e parametrizado de derivados do personagem.
- Atributos efetivos, dano-base do equipamento e bônus do Ossuary entram no
  mesmo snapshot.
- Bônus do Ossuary são aplicados como multiplicador separado sobre cada
  derivado declarado.
- O Lab deixou de usar valores-base fixos e passou a mostrar o snapshot do
  personagem selecionado.
- Level-up, distribuição de atributos, equipamento, consumível e upgrades do
  Ossuary agora alteram o preview por meio dos mesmos dados de progressão.

## Limites preservados

- As fórmulas usadas no Lab são fixtures provisórias, não balanceamento final.
- O snapshot passou a ser consumido pelo adaptador de combate; as fórmulas do
  Lab continuam provisórias.
- Não foram adicionados inimigos, loot, loop idle, save ou conteúdo concreto.

## Verificação executada

- Smoke test de atributos, dano-base, equipamento e bônus do Ossuary ✅
- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- `pnpm build:web` ✅

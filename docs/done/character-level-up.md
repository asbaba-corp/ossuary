# Level-up dos personagens

## Entregue

- `CharacterProgress` agora carrega CONS, STR, DEX e INT.
- Personagens novos começam com `CONS 5`, `STR 6`, `DEX 5` e `INT 4`.
- O level-up continua concedendo 3 pontos de atributo por nível.
- Adicionada `spendAttributePoint`, uma transição imutável para gastar um
  ponto em um atributo específico.
- Gasto sem pontos e atributo inválido são rejeitados.
- A documentação de XP foi atualizada para ensinar o fluxo completo em
  português: XP → level-up → pontos → escolha de atributo.

## Fora desta entrega

- Derivados de combate, respec, equipamento, party, UI, save e servidor.

## Verificação

- `pnpm typecheck` ✅
- `pnpm build:core` ✅
- Smoke test de atributos iniciais, level-up, distribuição e imutabilidade ✅

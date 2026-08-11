# XP e level-up

## Como funciona

O progresso de um personagem é um pequeno objeto de valor:

```ts
{
  level: 1,
  xp: 0,
  unspentAttributePoints: 0,
  attributes: { cons: 5, str: 6, dex: 5, int: 4 }
}
```

`xpToNextLevel(level)` calcula o custo do próximo avanço:

```text
round(55 × level^1,42)
```

Quando uma recompensa chega, `gainExperience(progress, amount)` soma o XP e
repete o avanço enquanto o saldo atingir o limiar atual. Cada avanço aumenta o
nível em 1 e adiciona 3 pontos de atributo. O que sobrar continua no nível
novo. Por exemplo, no nível 1, um ganho de `55 + 7` resulta em nível 2 com 7
XP e 3 pontos aguardando distribuição.

Os pontos não são atribuídos automaticamente. `spendAttributePoint(progress,
attribute)` consome um ponto e devolve o personagem com o atributo escolhido
incrementado em 1. Assim, o ciclo fica separado em duas decisões:

```text
ganhar XP → subir de nível → receber pontos → escolher o atributo
```

Um personagem novo começa com `CONS 5`, `STR 6`, `DEX 5` e `INT 4`, os mesmos
valores usados no protótipo. Distribuir um ponto em `str`, por exemplo, produz
`STR 7` e reduz `unspentAttributePoints` em 1.

## Padrão usado

O módulo dedicado [`packages/core/src/progression/xp.ts`](../../packages/core/src/progression/xp.ts)
usa o padrão **Functional Core**:

- recebe todo o estado necessário como argumento;
- não altera o objeto original;
- devolve uma nova transição de estado;
- não depende de UI, relógio, banco ou combate.

O [`packages/core/src/index.ts`](../../packages/core/src/index.ts) funciona só
como o ponto público de exportação. Cliente e servidor poderão importar a
mesma regra sem duplicá-la.

## Entregue

- Adicionado `CharacterProgress` ao `packages/core`.
- Adicionadas as funções puras `createCharacterProgress`, `xpToNextLevel` e
  `gainExperience` em `packages/core/src/progression/xp.ts`, além de
  `spendAttributePoint` para a distribuição explícita.
- A curva usa `round(55 × nível^1,42)` XP por avanço.
- Cada level-up concede 3 pontos de atributo.
- Um único ganho pode atravessar vários níveis; XP excedente permanece no
  nível seguinte.
- Entradas inválidas são rejeitadas com `RangeError`.
- Nenhuma UI, combate, persistência ou cálculo de atributos derivados foi
  incluído.

## Decisões incorporadas no design

Q15 foi resolvida: o XP é relativo ao nível atual, a curva é independente do
círculo e cada nível concede três pontos.

## Verificação

- `pnpm typecheck` ✅
- `pnpm build:core` ✅
- Smoke test das funções exportadas ✅ — confirmou nível inicial, um level-up,
  dois level-ups numa chamada, XP excedente e ganho zero.

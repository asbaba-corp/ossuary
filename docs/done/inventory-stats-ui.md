# Inventário, atributos, poções e ficha do personagem

## Objetivo

Dar ao protótipo as telas que o jogador realmente opera: inventário, atributos, configuração de poções e ficha com nível e experiência.

## Escopo

### Abas
Três abas ao lado do palco: **Personagem** · **Inventário** · **Atributos**.

### Inventário
- **128 slots em 3 páginas** (48 / 48 / 32 — 128 não divide por 3)
- Itens caem dos abates, com raridade common / rare / epic / legendary
- Inventário cheio **nunca para a caça** (core-design §5.4): vende automaticamente o de menor valor e avisa
- Ícone **Poções** abre o painel de configuração

### Poções
- Separadas em **vida** e **mana**, cada uma com liga/desliga próprio
- Catálogo com tiers; a básica custa **50 de ouro**
- **Só usa se tiver ouro.** Nunca negativa. Com 100 de ouro dá para 2 poções de 50
- Substitui o "piso de ouro" atual: a regra de acessibilidade já resolve o problema que o piso resolvia
- Painel mostra **poções disponíveis** = `ouro ÷ custo`, no lugar do acumulado negativo de hoje

### Atributos
- Primários CONS / STR / DEX / INT, distribuídos com pontos de nível
- Derivados calculados a partir deles (core-design §4.4)

### Personagem
- Nome, **nível** e **barra de experiência**
- Abate dá XP; subir de nível concede pontos de atributo
- Espaço para **4 personagens**, com 3 slots bloqueados mostrando o preço em ouro (party do §4.2 — compra fica TBD)

## Dependência que o escopo arrasta

Poção de mana só faz sentido se mana for consumida. O protótipo não tem spells.
Entra uma **spell de auto-cast** mínima (custo de mana, cooldown, dano por INT),
conforme as restrições do §4.6 — sem ela a poção de mana é decorativa.

## Fora de escopo

- Comprar slot de party de verdade
- Equipar itens (o inventário guarda e vende; equipar fica para depois)
- Merge e reroll

## Verificação

Smoke test headless confirmando: XP acumula e sobe de nível, poção só dispara
com ouro suficiente e nunca negativa o ouro, inventário enche e passa a
vender sozinho, mana é consumida pela spell. Screenshot de cada aba.

---

## Entregue

Tudo o que estava no escopo, mais três parâmetros de URL para teste:
`?tab=char|inv|stats`, `?pot=1` (abre o painel de poções) e `?auto=1`
(distribui os pontos sozinho). Com `?debug=1` a página imprime um resumo
em JSON legível por `--dump-dom`.

### Verificação executada

| Evidência | Resultado |
|---|---|
| `framesWithNegativeGold` em todas as runs | **0** — a poção nunca negativa o ouro |
| Inventário em run de 90 min | **128/128 cheio, 39 vendas automáticas** |
| Nível e pontos | sobe até 10, concede 3 pontos por nível |
| Mana | consumida pela spell, reposta por elixir |

### Dois defeitos que o teste pegou

**Economia no vermelho.** Com a poção a 50 e o loot a ~8 por abate, a run
fechava em −136 e o personagem quebrava. Ajustado: ouro por abate passou a
escalar com a profundidade (`14 + onda × 3`), dano dos mobs e escala de HP
suavizados. Agora fecha em **+220 na onda 27**.

**Oscilação na fronteira de lucro.** Após recuar, a party voltava a avançar
no mesmo instante e ficava presa num vaivém — 88 recuos em 90 min. Agora ela
**farma cinco ondas na profundidade atual** antes de voltar a avançar, que é
o comportamento de "fase de melhor saldo" do §5.3.

### Contraste que o protótipo demonstra

| | Onda alcançada | Saldo |
|---|---|---|
| Pontos parados | 10 | −103 |
| Pontos investidos | 27 | +220 |

Não é acidente e vale manter: é a lição de build do core design aparecendo
sozinha no comportamento do sistema.

### Decisão registrada

O "piso de ouro" foi **removido**. A regra de acessibilidade da poção
(só usa se o ouro cobrir o custo inteiro) resolve o mesmo problema de forma
mais simples e mais legível para o jogador. O painel agora mostra
**poções disponíveis** em vez do acumulado negativo, que era o que dava a
impressão de saldo furado.

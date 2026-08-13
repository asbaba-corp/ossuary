# Ossuary — Backlog de Diretrizes

**Status:** vivo, alimentado continuamente
**Escopo:** ideias, decisões e diretrizes de design/gameplay anotadas pelos devs
**Serve como base para:** correções em `docs/design/core-design.md`, `world_0_vestibule.md`,
`plano-tecnico-idle-ios.md` e para as tarefas em `docs/todo/`

---

## Como usar este arquivo

Este é o **documento de origem**. Quando um de nós tem uma ideia, uma diretriz ou
percebe um erro no design, anota aqui primeiro — mesmo que meia formada. Depois:

1. **Anota** o item na seção certa, com ID e status `📥 ideia`.
2. **Amadurece** o item na discussão; quando a diretriz estiver clara, vira `✅ diretriz`.
3. **Propaga** a diretriz para os documentos de design (é a diretriz que corrige o
   design doc, nunca o contrário) e marca `📖 documentado`.
4. **Executa**: vira uma tarefa em `docs/todo/`, e quando entregue, `docs/done/`.
   Marca o item aqui como `🏗️ em obra` e depois `🚢 entregue`.

Um item nunca é apagado — só muda de status. O histórico de por que decidimos algo
vale mais do que a lista limpa.

### Status

| Marca | Significado |
|---|---|
| 📥 ideia | anotado, ainda não decidido |
| 🔍 em discussão | estamos avaliando trade-offs |
| ✅ diretriz | decidido, é regra do jogo daqui pra frente |
| 📖 documentado | já refletido nos docs de design |
| 🏗️ em obra | tem tarefa em `docs/todo/` |
| 🚢 entregue | implementado, doc em `docs/done/` |
| ❄️ gelado | boa ideia, fora do escopo atual |
| ⛔ descartado | decidimos não fazer (mantém o porquê) |

### Formato de um item

```markdown
### [ID] Título curto e imperativo

**Status:** 📥 ideia
**Área:** progressão | combate | economia | ossuary | mundo | UI/UX | técnico | meta
**Origem:** quem levantou / de onde veio

Descrição do que é e do problema que resolve.

**Diretriz:** a regra decidida, em uma frase. (só quando o status for ✅ ou adiante)
**Impacto em docs:** quais documentos precisam ser corrigidos.
**Riscos / dúvidas em aberto:** o que ainda não sabemos.
```

IDs são sequenciais por área: `PRG-01`, `CMB-01`, `ECO-01`, `OSS-01`, `WLD-01`,
`UX-01`, `TEC-01`, `META-01`. Nunca reutilizar um ID.

---

## Progressão

### [PRG-01] Level-up automático com atributo escolhido

**Status:** 📥 ideia
**Área:** progressão
**Origem:** Thiago

Hoje o level-up concede 3 pontos de atributo por nível e o jogador precisa
distribuir manualmente (`spendAttributePoint`). Num idle, isso vira fricção: o
jogador fica horas offline e volta pra uma fila de pontos pendentes só pra clicar
sempre na mesma coisa.

A ideia é uma **mecânica opcional** de auto-distribuição: o jogador define uma
preferência (ex.: "sempre STR", ou uma proporção como 2 STR / 1 CONS) e, a cada
level-up, os pontos são gastos sozinhos seguindo essa regra.

**Pontos a decidir:**
- Atributo único ou proporção/prioridade entre atributos?
- Configuração é por personagem ou global da party?
- Fica desligado por padrão? (a hipótese é sim — o build manual é a decisão
  interessante, o auto é conveniência)
- Interage com respec? Se o jogador trocar a preferência, os pontos já gastos ficam.
- É por personagem da party ou também vale pro herói principal?

**Impacto em docs:** `docs/design/core-design.md` (seção de atributos e nível).
**Riscos:** conflita com o pilar "a decisão dele é *o que construir*" se virar
padrão ligado — a mecânica precisa ser opt-in explícito.

---

## Combate

_Sem itens ainda._

---

## Economia

_Sem itens ainda._

---

## Ossuary

_Sem itens ainda._

---

## Mundos e conteúdo

_Sem itens ainda._

---

## UI / UX

_Sem itens ainda._

---

## Técnico

_Sem itens ainda._

---

## Meta / processo

_Sem itens ainda._

---

## Descartados e gelados

_Sem itens ainda. Itens ⛔ e ❄️ são movidos pra cá com o motivo da decisão._

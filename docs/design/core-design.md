# Ossuary — Core Design

**Versão:** 0.1
**Status:** rascunho, pré-produção
**Escopo:** pilares, core loop, party, combate, atributos e nível, equipamento, spells, economia e saldo de run, Ossuary, mapa de mundos, ganchos de PVP
**Não cobre:** balanceamento numérico, arte, UI, som

Documentos irmãos:
- `plano-tecnico-idle-ios.md` — stack, sync, integridade, PVP, monetização
- `world_1_vestibule.md` — design completo do Mundo 0, o Vestíbulo

---

## 1. Pilares

**Um. Você nunca perde o que construiu.** Sem prestige, sem reset, sem soft-wipe. Toda hora investida permanece. Isso é a promessa central e a restrição mais cara — tudo neste documento existe para sustentá-la.

**Dois. A descida é o conteúdo.** O jogador desce o Inferno. Cada mundo é um bioma, um bestiário e uma lição mecânica. Progresso é geográfico e narrativo, não só numérico.

**Três. O que fica é osso.** A meta-progressão é física e visível: um ossuário que o jogador monta peça por peça. Não é uma tela de estatísticas — é um objeto que cresce.

**Quatro. Recurso existe para ser gasto.** Sem reset, sumidouro não é opcional. Todo sistema que gera precisa nascer junto com o que drena.

**Cinco. O jogo joga sozinho, bem.** Auto-battler puro. O jogador nunca toca no combate. A decisão dele é *o que construir*, não *como bater*.

---

## 2. Fantasia

Dark fantasy sobre a *Divina Comédia*. Não é adaptação fiel — é saque estrutural. Dante dá a geografia, a lógica moral e o bestiário; o tom é medieval sujo, opressivo, corporal.

O jogador não é Dante. É algo que desce sem guia e sem salvação prometida, catando osso pelo caminho. O Ossuary é o que ele constrói com o que sobrou dos outros.

**Regra de linguagem visual:** frio, úmido e infestado nos círculos altos; fogo, ferro e cidade nos baixos; gelo no fundo. O fogo é vocabulário reservado — usá-lo cedo demais queima o contraste que faz Dis funcionar.

---

## 3. Core loop

### 3.1 Sidescroller automático

A party caminha para a direita por um mundo em rolagem lateral. Inimigos aparecem à frente, ela engaja, resolve, segue. Não há input de combate.

```
[party 1-4] →→→ [Ignavos ×4] ⚔ →→→ [Gorja] ⚔ →→→ [FASE 9] →→→ [GUARDIÃO]
     ↑                                                             ↓
     └────────── farm na fase de melhor saldo ←─── parede ─────────┘
```

### 3.2 Ritmo de marcha e onda

O padrão familiar de *Tap Titans* / *Task Bar Hero*:

```
  ANDANDO          ONDA ENTRA        COMBATE         ONDA LIMPA        ANDANDO
  parallax    →    scroll para   →   herói e     →   inimigos     →    parallax
  correndo         e a onda          inimigos        somem,            volta a
  herói anda       ocupa a tela      trocam golpes   drops caem        correr
```

1. A party caminha para a direita. Fundo em parallax, ela é a única coisa em tela.
2. A onda entra por scroll. Quando ela ocupa a tela, **a party para de andar** e o cenário congela.
3. Auto-combate resolve. Sem input.
4. Onda limpa → drops caem → a party volta a andar e o cenário volta a rolar.

O tempo de caminhada entre ondas é curto e é respiro visual, não conteúdo. Ele existe para dar ritmo e para o parallax vender o bioma. **Não deve ser um gargalo de DPS** — se o jogador está forte, ele mata rápido e a caminhada vira a maior parte do tempo, o que faz a progressão *parecer* mais lenta do que é. Duas saídas, a decidir no balanceamento: encurtar a caminhada conforme o poder sobe, ou tratá-la como constante e calibrar a economia em cima do ciclo completo.

### 3.3 Estrutura de um mundo

**Dez fases por círculo.** Número fixo, decidido. Nove encontros e um guardião.

| Fase | Papel | Conteúdo |
|---|---|---|
| 1–2 | **Apresentação** | Bestiário local em densidade baixa. O jogador aprende a ler o círculo. |
| 3–4 | **Escalada** | Mix e densidade crescentes. Nada de novo, mais de tudo. |
| 5 | **Meio-caminho** | Miniboss. Confere se o primário do círculo está sendo construído. |
| 6–7 | **Pressão** | Composições que punem o build monolítico. |
| 8 | **O elite** | Spawn garantido do elite raro. É aqui que o preço do guardião é farmado. |
| 9 | **A parede** | O mob que exige o atributo novo, em condição desfavorável. |
| 10 | **Guardião** | Duas fases: a Recusa e o Preço (§4.8). |

Dez dá espaço para um arco interno — apresentação, escalada, verificação, pressão, parede, clímax — que seis comprimia demais. A fase 5 como miniboss é o ponto de checagem: se o jogador trava ali, ele descobre cedo que o perfil de equipamento está errado, em vez de descobrir só na fase 9 depois de farmar quatro fases à toa.

A unidade de farm continua sendo a **fase**, não o ciclo: o jogador escolhe qualquer fase já limpa e fica nela.

- Limpar uma fase libera a próxima e é permanente. Fase limpa nunca precisa ser limpa de novo.
- **Falhar não apaga progresso.** A party não morre com perda de nível, item ou osso; ela *recua* para a última fase limpa. O que se perde é **ouro queimado em poções** (§5.3) — recurso consumível, nunca construído. O Pilar Um continua intacto.
- O jogador escolhe livremente em que fase já limpa quer farmar. **A escolha não é trivial:** fases fundas dão loot melhor mas queimam mais poção, então a fase ótima é a de melhor *saldo*, não a mais funda que se aguenta (§5.3).

### 3.4 O ciclo do jogador

```
   farmar (automático, com o app fechado ou aberto)
        ↓
   acumular recurso
        ↓
   gastar: upgrades · ossos · rerolls
        ↓
   quebrar a parede → nova onda / novo mundo
        ↓
   novo bestiário exige um atributo que você não tem
        ↓
   volta ao topo
```

**A parede é o produto.** Cada mundo introduz um inimigo que não cede a "mais dano" — cede a um atributo específico. Isso converte crescimento numérico em decisão de build. O Encalhado (Mundo 0) é o protótipo: defesa altíssima, dano nulo, e a única saída é penetração de armadura.

### 3.5 Sessão

**O grind é pesado por design.** Cem fases com nível, equipamento por tier e marcos de abate pressupõem tempo de máquina, não tempo de dedo. Daí duas formas legítimas de progredir, e a diferença entre elas é deliberada:

| Modo | Duração | O que acontece | Rendimento |
|---|---|---|---|
| **Idle ativo** | ilimitado | App aberto, combate rodando na tela (padrão *Task Bar Hero*: deixa correndo enquanto faz outra coisa) | Cheio, sem teto |
| **Offline** | com teto | App fechado. Cálculo fechado `min(delta, teto) × taxa`, sem simulação | Reduzido e limitado |
| **Check-in** | 30–90 s | Coletar, distribuir pontos, trocar peça, ver se a parede caiu | — |
| **Sessão ativa** | 5–15 min | Reconfigurar build, ossuário, tentar guardião, arena | — |

**Idle ativo rende mais que offline, e isso não é punição** — é o que dá valor a deixar o app aberto sem exigir atenção. O teto offline vira o gancho de retorno (e o lugar natural do anúncio recompensado que dobra o acumulado, plano técnico §5.3).

O jogo precisa ser satisfatório no check-in de 40 segundos — é o modo mais frequente — e precisa ser assistível por vinte minutos sem input, que é o modo que consome o grind.

---

## 4. Combate

### 4.1 Modelo

Determinístico e tick-based, resolvido em `packages/core`. Mesma função no cliente (para animar) e no servidor (para validar e para o PVP).

```ts
resolveCombat(party: Party, wave: Wave, seed: number): CombatLog
```

O cliente **não decide** o resultado — ele reproduz um log. Isso é o que torna PVP assíncrono e anti-cheat viáveis pelo mesmo código (plano técnico §5.1, §7.1).

Toda aleatoriedade vem de PRNG semeado. Nenhum `Math.random()` no core, nunca.

`resolveCombat` recebe `Party`, não `GameState` — é o ponto onde a normalização de stats da arena entra depois sem reescrita (plano técnico §7.5). No PVP, a assinatura é `resolveCombat(party, enemyParty, seed)`: **a mesma função, com uma party do outro lado**.

**Implementação incremental atual:** o núcleo recebe snapshots derivados e
continua independente de `Wave` e do `GameState`. A `Party` persistente guarda
IDs ordenados; `RosterState` resolve cada personagem com seus loadouts e
`createCombatantsFromParty` gera um snapshot por membro ativo, preservando a
ordem. O motor já é tick-based, sem `Math.random()`, produz log determinístico
e expõe `victory` ou `defeat`. Derrota é apenas um resultado do combate neste
nível; a regra de recuo e qualquer consequência persistente pertencem ao loop
do jogo, ainda não implementado.

O snapshot carrega a configuração do loadout, mana e atributos de escala, mas
não carrega definições completas de spells. O tick recebe um
`CombatContentContext` imutável e resolve as definições por ID. Spells de dano,
proteção e controle produzem eventos e efeitos temporários; o loop futuro
apenas conectará esses ticks a caminhada, waves, loot, recompensas e recuo.

No Lab, o adaptador compõe todos os personagens ativos com equipamento, loadout
de spells, efeitos de itens, fórmulas de atributos e bônus do Ossuary antes de
iniciar o combate. O runtime de mana, cooldowns e efeitos continua pertencendo
exclusivamente à instância daquele combate.

### 4.2 A party

**Até quatro personagens. O jogador começa com um.** Slots e personagens são comprados com ouro — é isso que dá ao ouro um destino perene e estrutural, não só consumíveis.

```
   ┌────────┬────────┬────────┬────────┐
   │ Pers.1 │ Pers.2 │ Pers.3 │ Pers.4 │  →→→  [ ONDA ]
   └────────┴────────┴────────┴────────┘
     ativo    ouro     ouro     ouro
```

#### O que é por personagem e o que é da conta

Esta divisão é a decisão mais importante da party, porque define o custo de UI, o peso do grind e o que acontece quando um personagem novo entra tarde.

| Por personagem | Da conta inteira |
|---|---|
| Nível e pontos de atributo (§4.4) | **Ossuary** e marcos de abate (§6) |
| Equipamento, 6 slots (§4.5) | Ouro, poeira, materiais |
| Spells (§4.6) | Progresso de fases |
| Limiares e tier de poção | Regra de custo da poção (§5.3) |
| | Power-ups de party |

**O Ossuary é da conta, não do personagem.** Isso é obrigatório: se ossos fossem por personagem, comprar o quarto slot no Círculo VIII entregaria alguém sem nenhuma meta-progressão, e o Pilar Três desmontaria. Sendo da conta, o osso multiplica a party inteira — inclusive quem chegou agora.

#### O problema do recruta atrasado

Comprar o personagem 4 no Círculo VII entrega alguém nível 1 num conteúdo de nível 70. Se nada for feito, o slot novo é inútil por horas e a compra parece um golpe — o que envenena justamente o sumidouro de ouro que a party deveria criar.

Três saídas, em ordem de recomendação:

1. **XP compartilhado pela party.** Todo abate distribui XP a todos os slots ocupados. Um personagem comprado tarde ainda começa atrás, mas sobe rápido porque o XP do conteúdo tardio é grande. Simples, previsível, sem UI extra.
2. **Nasce no nível médio da party.** Resolve na hora, mas apaga a sensação de crescer o recruta.
3. **Nada.** Só se o personagem for barato o suficiente para ser comprado cedo — o que contradiz usá-lo como sumidouro de longo prazo.

Recomendo **XP compartilhado**, com o custo do slot escalando forte: o slot 2 deve ser alcançável no Vestíbulo (para o jogador conhecer o sistema cedo), e o slot 4 deve ser meta de médio prazo.

**Decisão implementada neste milestone:** o XP compartilhado é integral. Cada
recompensa é aplicada com o mesmo valor a todos os personagens ativos; não há
fracionamento por quantidade de slots. Nível, XP, pontos e atributos continuam
sendo estado independente de cada personagem. A API de `packages/core` mantém
as operações de party imutáveis e limita a party a quatro personagens. O
`partyPower` atual é apenas a soma dos níveis — um resumo transparente de
progressão, não um score de combate.

#### Papéis

Quatro slots e quatro atributos não é coincidência — e é uma armadilha se virar regra rígida. A party **não** deve exigir um personagem por atributo, porque isso elimina a decisão de composição e transforma a build numa checklist.

O que deve valer: cada personagem distribui os próprios pontos livremente, e as paredes dos círculos (§7) cobram *cobertura de party*, não cobertura individual. Uma party de quatro personagens de STR passa pelo Limbo e morre na Luxúria — a mesma lição de antes, agora no nível da composição.

Se personagens comprados tiverem identidade fixa (classe, sprite, afinidade de atributo), isso é conteúdo e monetização; se forem genéricos, é só um slot. Q24.

#### Consequências que a party arrasta

- **Poção escala com a party.** Quatro personagens queimam ~4× mais ouro. Isso é bom: liga o tamanho da party diretamente ao saldo da run (§5.3) e faz "comprar o slot 4" ser uma decisão econômica, não um upgrade óbvio. Party maior mata mais rápido e gasta mais — o saldo decide.
- **Inventário multiplica por quatro.** Seis slots × quatro personagens = 24 peças equipadas, mais o estoque. A Q17 (tamanho do inventário) fica bem mais cara.
- **Loot precisa saber para quem serve.** Com quatro personagens, "esta peça é melhor?" vira uma pergunta com quatro respostas. Sem indicação automática de para quem a peça serve, o check-in de 40 segundos morre. Q25.
- **O PVP vira party vs. party.** Isso é bom para o formato assíncrono — a defesa é um snapshot mais rico — mas dobra o trabalho de balanceamento competitivo.
- **Arte multiplica.** Quatro personagens visíveis em tela ao mesmo tempo, cada um com equipamento. Se o equipamento for visível no sprite, o custo de arte explode; se não for, o loot perde peso visual. Q26.

### 4.3 As quatro fontes de poder

O poder do personagem vem de quatro sistemas independentes. Nenhum substitui outro — e é essa independência que sustenta cem fases de grind sem um sistema canibalizar os demais.

| Fonte | Origem | Natureza | Papel |
|---|---|---|---|
| **Atributos** | Pontos por nível | Escolha permanente | *Que build você é* |
| **Equipamento** | Drop por círculo | Substituível | *Se você tem vazão para o andar* |
| **Spells** | A definir (§4.6) | Ativa/passiva | *Cobertura de situação* |
| **Ossos** | Guardiões e marcos | Acumulativo | *Multiplicador permanente* |

### 4.4 Atributos e nível

Abate dá XP. XP dá nível. **Cada nível concede pontos que o jogador distribui** entre quatro atributos:

O personagem começa no nível 1 com 0 XP. Para avançar do nível `L` para o
próximo, precisa de `round(55 × L^1,42)` XP; o XP excedente de um abate ou
recompensa fica acumulado no nível seguinte. Cada level-up concede **3 pontos
de atributo**. A curva é independente do círculo, para que o conteúdo não
precise redefinir ou comprimir o progresso do personagem.

O personagem começa com `CONS 5`, `STR 6`, `DEX 5` e `INT 4`. Os pontos de
level-up ficam aguardando distribuição; cada ponto aumenta exatamente um dos
quatro atributos, escolhido pelo jogador. A distribuição não é automática.

| Atributo | Nome | Fantasia |
|---|---|---|
| **CONS** | Constituição | Carne que aguenta |
| **STR** | Força | Peso do golpe |
| **DEX** | Destreza | Rapidez e precisão |
| **INT** | Inteligência | Domínio do que não é físico |

Os atributos alimentam seis **derivados** — o que o combate realmente consome. O jogador nunca edita derivados diretamente:

| Derivado | O que faz | Vem de | Ensinado por |
|---|---|---|---|
| **Vigor** | HP e mitigação | CONS | Moscardos (muitos ataques pequenos) |
| **Dano** | Golpe base | **arma + STR** | Ignavos (volume) |
| **Penetração** | Ignora fração da defesa alvo | STR | Encalhados (a parede) |
| **Cadência** | Ataques por segundo | DEX | Ignavos |
| **Crítico** | Chance de golpe amplificado | DEX | Encalhados (picos furam parede) |
| **Alcance** | Alvos atingidos por golpe | DEX + INT | Ignavos em bando |
| **Sustento** | Recuperação de HP por golpe | INT | Gorjas (dreno) |
| **Mana** | Reserva e regeneração para spells | INT | — (§4.6) |

```
  arma ─────────┐
  STR  ─────────┴────────────────► Dano
  STR  ──────────────────────────► Penetração
  CONS ──────────────────────────► Vigor
  DEX  ──────────┬───────────────► Cadência
                 ├───────────────► Crítico
                 ├──────┐
  INT  ──────────┤      └────────► Alcance
                 ├───────────────► Sustento
                 └───────────────► Mana
```

**Nenhum atributo é lixo e nenhum derivado tem dono único.** STR resolve a parede do Vestíbulo (Penetração) *e* o dano — sempre defensável, nunca suficiente. INT, que num auto-battler corpo-a-corpo correria risco de virar stat morto, é o primário de *sobrevivência* (Sustento) e *eficiência de limpeza* (Alcance) — e é o stat das spells (§4.6), o que o torna a aposta de longo prazo.

**Respec.** Com pontos permanentes e círculos que exigem perfis diferentes, o jogador vai errar a distribuição. Duas saídas: respec pago (sumidouro, coerente com o Pilar Quatro) ou nenhum respec (decisão pesa mais, mas pune quem não leu guia). **Recomendo respec pago** — em jogo sem prestige, build travada errada é o tipo de frustração que faz desinstalar. Fica como Q13.

**Regra de design:** nenhum atributo novo depois destes quatro. Expansão vem de equipamento, spells, ossos e inimigos — nunca de mais barras.

### 4.5 Equipamento

Sistema separado dos atributos, e o mais recompensador do jogo para quem se dedica a ele. Uma peça entrega **três coisas em camadas**:

O domínio de itens agora separa `Item` em equipamento e consumível. O loadout
continua cobrindo seis slots (arma, escudo, elmo, peito, luvas e botas) e
bônus planos de CONS/STR/DEX/INT. Itens carregam raridade, efeitos e um
`instanceId` fornecido pela camada chamadora; duas peças do mesmo item-base são
independentes. Efeitos de bônus de atributo podem ser ativados e removidos
explicitamente, enquanto efeitos futuros ficam registrados sem interpretação.

Ownership é representado pelo inventário. `equipEquipmentFromInventory` remove
uma instância possuída, devolve ao inventário a peça anterior do mesmo slot e
atualiza o loadout em uma transição imutável. `unequipEquipmentToInventory`
recusa atomicamente a operação quando não há capacidade. Consumíveis e
instâncias inexistentes não podem ser equipados. A ficha calcula os atributos,
dano/defesa base e os percentuais efetivos somando personagem, efeitos ativos e
loadout; o preview expõe valores e deltas sem declarar uma peça vencedora.

Loot concreto é gerado por `createEquipmentFromDropTable`, uma função pura que
recebe `instanceId`, seed e tabela do chamador. A tabela seleciona uma entrada
por peso e rola os pools planos de forma determinística, preservando os stats
explícitos da peça-base. Mesma tabela, seed e instância produzem o mesmo item;
IDs não são gerados pelo core. A raridade apenas identifica a entrada e os
pools de bônus da tabela nesta etapa.

```
┌─ BASE ─────────── definida pelo slot e pelo tier do círculo
│   Arma: dano base · Armadura: defesa
├─ ATRIBUTOS ────── bônus planos: +5 CONS, +3 STR…
└─ AFIXOS ───────── percentuais, quantidade definida pela raridade
```

**Camada 1 — base.** O que o slot entrega por definição.

| Slot | Base |
|---|---|
| **Arma** | Dano base — a maior parcela do Dano final |
| **Elmo** | Defesa |
| **Peito** | Defesa (a maior do conjunto) |
| **Luvas** | Defesa, Cadência |
| **Botas** | Defesa, velocidade de marcha |
| **Escudo** | Defesa e proteção — fórmula ainda não definida |

**Camada 2 — atributos planos.** Toda peça rola bônus direto em CONS/STR/DEX/INT, com viés pelo slot: peitoral e escudo tendem a CONS, luvas a DEX, elmo a INT, arma a STR ou DEX.

Isso é seguro justamente porque o equipamento é **bounded**: seis slots, substituíveis. É o oposto do osso, que acumula sem teto e por isso só pode mexer em derivado (§6.4). Um `+5 CONS` de peitoral é uma parcela finita e sempre comparável com a peça que vai substituí-la — que é exatamente a decisão que faz o loot valer a pena.

**Camada 3 — afixos por raridade.** Percentuais, e é aqui que mora a fantasia de loot:

| Raridade | Afixos | Sensação |
|---|---|---|
| **Common** | 0–1 | Preenchimento. Melhora a base, não muda a build. Insumo de merge e de venda. |
| **Rare** | 2 | O drop que faz parar e comparar. |
| **Epic** | 3 | Reorganiza um slot. Raro o bastante para ser lembrado. |
| **Legendary** | 4 + um efeito único | Reorganiza a build inteira em volta dele. |

Pool de afixos:

| Afixo | Mexe em |
|---|---|
| Physical damage % | Dano |
| Spell damage % | Potência de spell (§4.6) |
| Critical chance % | Crítico |
| Lifesteal % | Sustento |
| Mana steal % | Mana por golpe |
| Armor penetration % | Penetração |
| Attack speed % | Cadência |

**Regra:** afixo mexe em **derivado**, nunca em atributo. Atributo plano só vem da Camada 2, que é limitada por slot. Isso mantém a inflação percentual num pool só (afixos + ossos) e a inflação plana em outro (nível + bases), o que torna o balanceamento tratável.

**Demais regras:**

- **Tier por círculo.** Equipamento do Círculo VII não dropa no Vestíbulo. Ancora poder na profundidade e impede que sorte precoce quebre a curva.
- **Gate de vazão.** Cada círculo pressupõe o tier anterior. Sem ele, o dano não fura a defesa e o grind trava — é assim que o equipamento força ordem no conteúdo.
- **Drop.** Comuns dropam tier baixo e raridade baixa; elites e guardiões puxam a curva de raridade para cima.
- **Reroll.** Reconfigura afixos, custa material. Sumidouro repetível e sem teto.
- **Equipamento é substituível; osso não é** (§6.4). Uma camada respira, a outra só acumula.

#### A escada de merge

Fundir N peças da mesma raridade produz uma da raridade acima, no padrão *Task Bar Hero*. Isso resolve o lixo acumulado — **todo drop vira insumo, nada é descartado** — e é o que dá valor perene ao common.

```
   N × common  ──────────────────────────►  rare
   N × rare    ──────────────────────────►  epic
   N × epic    +  ~50 POEIRA  ────────────►  LEGENDARY
```

**Os três primeiros degraus custam material comum. O último custa poeira.** É essa assimetria que torna o legendary genuinamente raro: os degraus de baixo são questão de tempo de farm, o de cima é questão de ter caçado guardião e elite o suficiente.

**A poeira é o gate do legendary, e é só isso que ela faz.** Função única, deliberadamente. Uma moeda escassa com um só destino é legível — o jogador sabe exatamente por que está caçando elite, e cada poeira que cai tem significado imediato.

**A matemática de longo prazo, e o cuidado que ela exige.** Com 6 slots × 4 personagens, uma party inteiramente lendária custa **24 × 50 = 1.200 poeiras**. Esse número é o chase de endgame, e é bom que seja grande — mas ele precisa ser *o alvo explícito do balanceamento da taxa de drop*, não uma consequência acidental dela. Se a poeira cair rápido demais, o legendary deixa de ser evento; se cair devagar demais, o jogador nunca vê nenhum e o sistema inteiro vira decoração inalcançável.

Referência para calibrar: **o primeiro legendary deve ser alcançável dentro da Temporada 1**, e uma party completa deve ser projeto de vários meses.

**Isto valida o dreno de ouro→poeira** (§5.5). Comprar poeira a preço absurdo deixa de ser um sumidouro abstrato e vira a rota impaciente para o legendary — o jogador rico converte ouro para fechar os últimos 50. A trava continua valendo: preço escalando por compra, e sempre pior que caçar.

#### Reroll do efeito lendário

O efeito único do legendary é **rerollável**. Isso desarma o risco que a fusão criava: gastar 50 poeiras nunca resulta em item morto, porque o efeito é ajustável depois.

Dois caminhos, deliberadamente diferentes:

| Caminho | Custo | Comportamento |
|---|---|---|
| **Ouro** | Escalonado por reroll na mesma peça | Aleatório. É a rota padrão. |
| **Poeira** | 1 poeira, custo fixo | Aleatório, sem escalonamento. Válvula de escape. |

**Por que os dois custos se comportam diferente.** Se ambos fossem aleatórios ao mesmo preço relativo, o ouro dominaria sempre — ele é abundante — e a opção de poeira seria conteúdo morto. Com o **ouro escalando por tentativa na mesma peça**, o jogador começa rerolando com ouro, o custo sobe, e a poeira vira a saída barata para quem está numa maré de azar. Os dois ficam vivos, e cada um tem um momento.

O escalonamento do ouro pode decair com o tempo ou zerar ao trocar a peça — decisão de balanceamento, não de design.

**Consequência aceita:** com reroll barato, todo jogador dedicado acaba com o efeito que quer. O efeito único deixa de ser sorte e vira configuração. Isso é bom: **a raridade fica na aquisição do legendary (as 50 poeiras), não na loteria do efeito.** Punir duas vezes o mesmo recurso — uma para conseguir, outra para acertar — é o tipo de camada que faz jogador de idle desistir.

**Cuidado a monitorar:** ouro inflaciona sem prestige. Se o custo base do reroll for fixo, no fim de jogo o reroll fica gratuito na prática e o escalonamento perde efeito. O custo base precisa ser indexado a algo que cresce — tier da peça ou círculo alcançado — e não a um número absoluto.

### 4.6 Spells

Spells são conteúdo data-driven e resolvidas por auto-cast. O jogador não toca
no combate (Pilar Cinco): uma spell tenta disparar quando seu gatilho está
satisfeito, seu cooldown terminou e o personagem tem mana suficiente. A
definição não contém código específico por spell e não escolhe ainda quantas
spells um personagem pode manter equipadas.

#### Contrato de conteúdo

Cada definição imutável contém identidade, arquétipo, custo de mana,
cooldown, um único gatilho declarativo, efeito e coeficientes de escala. Uma
forma equivalente ao contrato (nomes ilustrativos, não uma implementação) é:

```ts
type SpellDefinition = {
  id: string
  name: string
  archetype: "damage" | "protection" | "control"
  manaCost: number
  cooldown: number
  trigger: SpellTrigger
  effect: SpellEffect
  scaling: { basePower: number; intCoefficient: number }
}
```

Os gatilhos possíveis são exclusivos: `cooldown` (tenta sempre que ficar
pronta), `hpBelow` (HP percentual abaixo ou igual ao limiar), `manaBelow`
(mana percentual abaixo ou igual ao limiar) e `enemyCount` (quantidade de
inimigos dentro do mínimo e/ou máximo declarados). O cooldown continua sendo
uma pré-condição para todos os gatilhos; o tipo `cooldown` apenas não adiciona
outra condição de combate.

Os três arquétipos iniciais têm payloads fechados, mas seus números ficam no
conteúdo:

| Arquétipo | Payload do efeito | Escala inicial |
|---|---|---|
| **Dano** | potência, tipo de dano e alvo(s) | `basePower + INT × intCoefficient`, multiplicada por `1 + spellDamagePercent` |
| **Proteção** | valor de escudo ou mitigação e duração | `basePower + INT × intCoefficient`, multiplicada por `1 + spellDamagePercent` |
| **Controle** | tipo de controle, duração e chance | potência/duração usam os coeficientes declarados; chance usa o PRNG determinístico |

O contrato de efeito pode evoluir com novos payloads, mas uma definição de
conteúdo sempre declara seu arquétipo e os campos necessários para ele. Não há
efeito visual implícito: dano, escudo, mitigação, controle e falha de chance
precisam aparecer como eventos resolvíveis pelo combate.

#### Camadas e ciclo de disparo

As quatro camadas são deliberadamente separadas:

1. **Definição da spell:** conteúdo imutável, compartilhável entre cliente,
   servidor e simulador, fornecido ao motor pelo `CombatContentContext`.
2. **Configuração do auto-cast:** escolha do jogador para uma spell disponível,
   com `enabled` e ordem/prioridade de tentativa. Ela não reescreve custo,
   escala ou efeito da definição. A quantidade de spells e os slots continuam
   em aberto.
3. **Estado runtime:** mana atual, cooldown restante, efeitos temporários
   ativos e contadores necessários para a simulação. É estado derivado da
   execução e não conteúdo persistente da spell.
4. **Resolução de combate:** `advanceCombatTick` e `resolveCombat` avaliam o
   contexto explícito, consomem recursos e aplicam o payload.

Em cada oportunidade de avaliação, a ordem é: configuração habilitada,
gatilho satisfeito, cooldown zerado e mana atual maior ou igual ao custo. Só
então a spell consome exatamente `manaCost`, reinicia o cooldown e produz um
evento de tentativa para a resolução. Se uma condição falhar, nada é
consumido e o cooldown não é reiniciado. Razões observáveis são:

| Razão | Condição |
|---|---|
| `disabled` | auto-cast desligado ou spell não está ativa |
| `trigger_not_met` | HP, mana ou quantidade de inimigos fora do gatilho |
| `cooldown_remaining` | cooldown ainda positivo |
| `insufficient_mana` | mana atual menor que o custo |
| `fired` | todas as pré-condições satisfeitas |

Se várias spells estiverem habilitadas e prontas no mesmo instante, a ordem
da configuração decide qual é tentada primeiro; o limite de spells equipadas
não é decidido aqui. Uma spell que falha por mana não reserva mana, não entra
em dívida e pode ser tentada novamente quando a condição mudar.

#### Mana, escala e determinismo

Mana é derivada de INT, e `manaStealPercent` é o afixo de equipamento que
recupera mana por dano efetivo (§4.5). A resolução usa a reserva atual e nunca
permite custo abaixo de zero. `spellDamagePercent` do equipamento multiplica a
potência da spell; INT é a fonte principal e o coeficiente é parte da
definição. A fórmula exata de derivados e os números de balanceamento vivem
no conteúdo, não em ramificações por ID.

Qualquer chance, inclusive a chance de controle, recebe o mesmo PRNG semeado
da resolução do combate. Seed, estado inicial, definições e contexto iguais
produzem os mesmos eventos e o mesmo estado final. A simulação ativa e o
cálculo fechado offline usam o mesmo contrato e a mesma sequência de eventos;
o offline não substitui spell por um bônus médio não reproduzível.

**Q14 fica parcialmente resolvida:** mecânica, arquétipos, gatilhos, escala,
recursos e determinismo estão fechados. Continuam abertas a fonte de aquisição
das spells, raridade/tier, escala por nível ou tier de conteúdo, slots e a
quantidade de spells que um personagem pode equipar. Esses pontos não devem
ser inferidos pela implementação da mecânica.

**Laboratório de spells.** O laboratório Expo possui uma seção de teste
isolado que exercita essas regras com fixtures de dano, proteção e controle.
Ela permite mudar HP, mana, quantidade de inimigos e cooldown, repetir uma
tentativa com seed fixa e inspecionar a razão do resultado. A seção é
explicitamente test-only: não implementa combate nem aplica efeitos a alvos.

#### Configuração do loadout

A configuração do auto-cast é um domínio separado da definição e da resolução
da spell. Cada personagem possui um `SpellLoadout` imutável com capacidade
explícita, entradas sem duplicata e ordem de prioridade. Cada entrada pode
estar habilitada ou desabilitada; equipar e remover uma spell não altera sua
definição, custo, escala ou efeito.

O domínio recebe a lista de IDs disponíveis do chamador e valida
disponibilidade, capacidade e duplicatas. A quantidade definitiva de slots e a
forma de aquisição continuam sendo decisões de conteúdo/progressão. No Lab,
duas vagas são usadas apenas para exercitar o limite com as três fixtures
existentes. O Lab também permite alterar a prioridade e isola o loadout de cada
personagem, inclusive quando a party completa entra no combate.

O motor de auto-cast avalia as entradas habilitadas na ordem do loadout. Em
cada oportunidade, registra as tentativas bloqueadas e para no primeiro
disparo; esse disparo consome mana e reinicia apenas o cooldown da spell
escolhida. O estado runtime mantém mana, mana máxima e cooldowns por ID, e a
resolução aplica o payload e retorna eventos reproduzíveis.

### 4.7 Fórmula

Golpe por tick, contra cada alvo em `Alcance`:

```
Dano         = (arma_base + f(STR) + atrib_equip) × (1 + Σ afixos%) × (1 + Σ ossos%)
crit         = golpe é crítico se rng(seed) < Crítico
dano_efetivo = Dano × (crit ? mult_crit : 1) × (1 − max(0, Defesa_alvo − Penetração) / K)
cura         = dano_efetivo × Sustento
mana         = mana + dano_efetivo × ManaSteal
```

A ordem importa: **planos somam, percentuais multiplicam, e os dois pools são separados** — afixos num parêntese, ossos em outro. Manter os pools apartados é o que permite balancear equipamento sem reabrir o Ossuary e vice-versa.

A arma entra como **parcela aditiva** ao lado de STR, não como multiplicador. Isso importa: se a arma multiplicasse, o tier de equipamento dominaria tudo e os pontos de atributo virariam decoração. Somando, os dois sistemas continuam pesando — e o gate de vazão do equipamento (§4.5) vem do *tier mínimo* exigido, não de escala multiplicativa.

`K` é constante de balanceamento e vive em `packages/content`, nunca no código. Defesa reduz por fração, nunca subtrai valor plano — subtração plana cria muros binários e quebra a curva sem prestige.

As funções `atributo → derivado` também vivem em `packages/content`. São a alavanca de balanceamento mais poderosa do jogo: mudar a curva de `STR → Dano` reequilibra tudo sem tocar em uma linha de conteúdo.

Todos os valores de economia e combate são `break_infinity.js`. Nenhum `number` nativo (plano técnico §5.5).

### 4.8 Guardiões

Cada mundo termina num guardião com estrutura de duas fases:

1. **A Recusa** — combate que exige tudo que o bestiário do mundo ensinou.
2. **O Preço** — vencer não basta. O guardião cobra um recurso farmado de um inimigo de elite específico daquele mundo.

Caronte é o protótipo: você o vence e ele estende a mão pedindo Óbolos (`world_1_vestibule.md`). Isso ensina o Pilar Quatro na primeira hora de jogo e cria o padrão reutilizável — **todo mundo termina num sumidouro com nome próprio.**

---

## 5. Economia

### 5.1 Camadas de recurso

| Camada | Exemplo | Fonte | Função |
|---|---|---|---|
| **Ouro** | Ouro | Venda de loot, abate | Moeda de fluxo. Paga consumíveis e upgrades. **Some a cada run** (§5.3). |
| **Poeira** | Poeira de Passo | Guardião e elite, % baixa. Mob comum, % muito baixa. | **Gate do legendary.** ~50 por fusão (§4.5). Destino único e legível. |
| **Materiais** | Quitina Fina, Bílis Coalhada | Espécie específica | Craft, reroll e merge. Cria razão para farmar mob X, não o mais rentável. |
| **Equipamento** | Peças common → legendary | Drop por círculo | Vazão e build. Insumo de merge e de venda. |
| **Gate** | Limo do Aqueronte | Espécie específica | Trava de acesso ao mundo seguinte. Impede pular conteúdo. |
| **Preço do guardião** | Óbolo | Elite raro | Sumidouro de fim de mundo. |
| **Osso** | ver §6 | Guardião + marcos | Meta-progressão permanente. Não gastável. |
| **Premium** | — | IAP | Aceleração e conveniência. Nunca poder direto. |

Camadas separadas existem para que "farmar" nunca seja uma única atividade ótima. Se um só recurso dominasse, o jogador farmaria um só lugar e o bestiário viraria decoração.

**Ouro e poeira são opostos deliberados,** e é essa oposição que dá tensão à economia:

| | Ouro | Poeira |
|---|---|---|
| Volume | Alto, constante | Baixo, esporádico |
| Fonte | Tudo | Guardiões e elites |
| Comportamento | Flui e some | Acumula |
| Sensação | Orçamento | Prêmio |

O ouro é o que você administra; a poeira é o que você espera. Um jogador nunca fica sem ouro por muito tempo, e nunca tem poeira sobrando.

### 5.2 Sumidouros

Obrigatórios, projetados junto com as fontes:

- **Poções** — dreno contínuo e automático de ouro, proporcional ao dano sofrido (§5.3). É o dreno mais importante do jogo, porque é o único que escala com a atividade em vez de com a compra.
- **Upgrades de custo crescente sem teto** — dreno primário de ouro acumulado
- **Preço do guardião** — dreno pontual e grande, um por mundo
- **Reroll e merge** — dreno de material e de peças, repetível, sem teto
- **Taxa de entrada na arena** — dreno recorrente ligado ao endgame
- **Cosméticos** — dreno opcional, ganha valor com PVP (perfil visível)

### 5.3 Poções, ouro e o saldo da run

**O modelo é o de Tibia:** você caça, dropa item, vende item, e gasta o ouro em poções e runas para poder caçar. A run tem um **saldo**, e ele pode ser negativo.

```
   SALDO DA RUN  =  valor do loot  −  ouro queimado em consumíveis
```

Isso é o coração da economia e a razão de o ouro ser punitivo: **caçar fundo demais dá prejuízo.** Você mata, dropa bem, mas apanha tanto que a poção come mais do que o loot paga.

**Isto conserta uma fraqueza do §3.3.** Antes, a fase ótima de farm era sempre "a mais funda que aguento" — uma escolha trivial, que só existia para a parede doer. Com saldo, a fase ótima é a de **melhor lucro líquido**, que não é a mais funda nem a mais rasa. Vira uma otimização real, recalculada a cada peça nova de equipamento, e é o que sustenta grind pesado sem tédio.

#### Consumo automático

Poção é consumida por regra, não por toque — coerente com o Pilar Cinco:

| Gatilho | Ação |
|---|---|
| HP abaixo de X% | Consome poção de vida |
| Mana abaixo de Y% | Consome poção de mana |

O jogador configura os limiares e o **tier** da poção. Tier maior cura mais e custa desproporcionalmente mais — a escolha de tier é decisão de eficiência, não upgrade óbvio.

#### A poção nunca negativa o ouro

**Regra:** a poção só é consumida se o ouro cobrir o custo inteiro. Custo cheio ou nada — não existe usar poção "no vermelho". Com 100 de ouro e poção de 50, o jogador tem exatamente dois usos.

Isso resolve sozinho o problema que o progresso offline cria: quem fecha o app com a caça no prejuízo não volta falido oito horas depois, porque o consumo trava assim que o ouro acaba, em vez de continuar cavando. É o tipo de perda que faz desinstalar, e a regra a torna impossível por construção.

Quando o ouro acaba e a vida também:

1. O consumo de poção para.
2. A party **recua para uma fase mais rasa**, onde sobrevive sem poção.
3. Ela **farma essa profundidade** antes de voltar a avançar — a "fase de melhor saldo" desta seção, na prática.

Regra derivada: **o cálculo offline usa a mesma checagem de custo**, e é validado no servidor junto com o resto do save.

> **Mudou depois do protótipo.** Uma versão anterior deste documento previa um *piso de ouro* configurável pelo jogador, com o mesmo objetivo. Ele foi descartado: a checagem de custo entrega a mesma proteção sem pedir configuração e sem um número a mais na UI. O piso continua sendo uma opção se algum dia o jogador quiser reservar ouro para outra coisa que não poção — mas aí é conveniência, não segurança.

#### Runas e consumíveis de spell

Mesmo modelo, para builds de INT: consumível de mana/spell comprado com ouro, consumido por gatilho. Mantém o build de spell dentro da mesma equação de saldo em vez de criar uma economia paralela. Escopo em Q19.

#### Consequências de balanceamento

- **Loot precisa ter valor de venda desenhado**, não improvisado. O preço de venda é metade da equação do saldo.
- **Poção é o dreno que impede o ouro de inflacionar** sem reset. É o sumidouro mais importante do jogo justamente porque é automático e proporcional à atividade.
- **Um build tanque (CONS) economiza poção**, então rende mais líquido mesmo matando mais devagar. Isso dá a CONS um papel econômico, não só defensivo — e é o tipo de trade-off que faz a distribuição de pontos importar.

### 5.4 Inventário e venda automática

O jogador **configura as regras**; o jogo executa sozinho. Inventário manual num jogo de grind pesado é imposto de tédio — e, pior, transforma o check-in de 40 segundos em faxina.

O primeiro milestone do domínio de inventário já está implementado no core:
uma coleção imutável de `ItemStack`, com capacidade configurável (padrão de
128 slots), empilhamento apenas de consumíveis pelo mesmo `item.id` e rejeição
segura quando não há espaço. Loot, venda automática e descarte continuam fora
desse milestone; adicionar esses comportamentos depois não deve alterar as
regras básicas de armazenamento.

Regras configuráveis, combináveis:

| Regra | Efeito |
|---|---|
| Vender tudo ao lotar | Nunca trava a caça; o jogador aceita perder o que não olhou |
| Vender por raridade | Ex.: vende common e rare, guarda epic e legendary |
| Vender abaixo de X de valor | Piso de valor, independente de raridade |
| Guardar para merge | Reserva N commons por slot como insumo (§4.5) |
| Nunca vender | Trava manual por peça |

**A regra padrão importa mais que as opções.** O jogador novo não vai configurar nada, e o comportamento inicial define a primeira impressão da economia. Recomendo o padrão **"vender common ao lotar, guardar o resto"**: nunca trava a caça e nunca descarta algo que o jogador lembraria de ter visto.

**Interação com merge:** como o merge (§4.5) consome commons, a regra de auto-venda de common e a de guardar-para-merge estão em conflito direto. O sistema precisa resolver isso sem exigir que o jogador entenda a interação — reservar a cota de merge *antes* de aplicar a regra de venda. Q21.

**Inventário cheio nunca pode parar a caça.** Se as regras do jogador levarem a inventário lotado sem venda, o comportamento é continuar caçando e descartar o excedente de menor valor, avisando. Parar a caça é o pior resultado possível num idle — o jogador fecha o app achando que está progredindo e volta para nada.

### 5.5 No que se gasta ouro

O ouro tem quatro destinos, e juntos eles cobrem os três horizontes de tempo do jogador — o minuto, a semana e o mês.

| Horizonte | Destino | Comportamento |
|---|---|---|
| **Minuto** | Consumíveis | Poções e runas. Dreno automático, proporcional ao dano sofrido (§5.3). |
| **Semana** | Manutenção de build | Reroll de afixos, taxa de merge, respec (§4.4). |
| **Mês** | **Party** | Slots e personagens (§4.2). O sumidouro grande e memorável. |
| **Sempre** | Power-ups de party e conversão | Buffs para o time todo; compra de poeira a preço absurdo. |

**A party é o que salva a economia do ouro.** Era esse o buraco da Q22: sem um destino grande, o jogador de longo prazo acumularia ouro sem uso e a moeda morreria. Slot de party é caro, memorável, e muda o jogo de verdade quando comprado — é o oposto de mais um upgrade incremental.

E o custo do slot deve escalar forte. O slot 2 precisa ser alcançável ainda no Vestíbulo, para o jogador aprender cedo que a party existe e querer os outros; o slot 4 é meta de médio prazo.

**Power-ups de party** (padrão *Task Bar Hero*): buffs que valem para o time inteiro, comprados com ouro. Preferir **permanentes de custo crescente** a temporários — buff temporário comprável tende a virar obrigação em vez de escolha, e num auto-battler o jogador não *sente* o buff, só vê número maior por um tempo. Se forem temporários, que sejam grandes e raros, não um imposto de manutenção.

**Comprar poeira a preço absurdo** é o dreno que nunca satura: converte a moeda abundante na escassa a uma taxa deliberadamente péssima. Duas travas obrigatórias — a taxa precisa ser ruim o bastante para farmar guardião continuar sendo muito melhor, e **o preço deve escalar por compra**, senão vira a rota ótima assim que o ouro inflacionar no fim de jogo.

**Regra que atravessa tudo:** ouro compra *acesso, manutenção e conveniência* — nunca poder direto. Poder vem de nível, equipamento e osso. Quebrar essa regra transforma o jogo em pay-to-win no momento em que ouro virar comprável com dinheiro real.

### 5.6 Domínio de recursos implementado

O core possui um `EconomyState` que separa saldos permanentes da conta dos
acumuladores de receita e despesa da run. Recursos são identificados por
`resourceId`; ouro, poeira, material e preço de guardião têm IDs de
conveniência, mas o domínio não conhece suas origens ou destinos.

Transações declaram escopo, recurso, direção, valor e motivo. Débito da conta
exige saldo suficiente; despesa da run pode deixar o saldo líquido negativo.
Lotes são validados de forma atômica e retornam eventos auditáveis sem manter
um log dentro do estado. O Lab possui operações artificiais de conta e run
para validar essas regras, sem loja, loot ou poções.

### 5.7 A curva sem prestige

Sem reset, os números crescem monotonicamente para sempre. A curva é projetada para **anos, não para um ciclo**.

O achatamento vem de **expansão horizontal**: cada atualização adiciona um sistema (mundo, atributo, tipo de osso), não um multiplicador maior. É mais caro de produzir que prestige — e é exatamente por isso que a engine/editor do plano técnico é decisão estratégica, não ambição.

---

## 6. O Ossuary

### 6.1 O que é

A meta-progressão. Um ossuário que o jogador monta peça por peça, visível como objeto, não como planilha.

**Origem narrativa:** o primeiro osso não vem de um monstro. Vem de Caronte, quando ele aceita o pagamento — um fragmento da barca, ou o primeiro Óbolo que você não gastou. Cada mundo contribui com uma peça.

### 6.2 Duas fontes

**Ossos de guardião.** Um por mundo, garantido, narrativo. Marca de progresso na descida. Dá um bônus grande e único — geralmente destrava ou amplia um atributo.

**Marcos de abate.** Contador permanente por espécie. Matar N Moscardos concede um bônus permanente pequeno; N×10, o próximo. Sem teto, com retorno decrescente.

Isso resolve a progressão de longo prazo sem prestige: há sempre um contador subindo, sempre um marco próximo, e nada disso jamais é perdido.

### 6.3 Por que Ignavos não dropam osso

Decisão deliberada, estabelecida no Mundo 0: os Ignavos são sombras, não deixam osso. O primeiro inimigo do jogo ensina que **osso é raro**. Estabelecer a escassez antes de mostrar a abundância é o que faz o jogador querer o que tem osso.

### 6.4 Ossos mexem em derivados, nunca em atributos

Osso concede **percentual sobre derivado** (`+8% Penetração`), nunca ponto de atributo (`+40 STR`).

O motivo: os pontos de atributo vêm de nível e são *a decisão escassa do jogador* (§4.4). Se osso desse STR, ele estaria imprimindo a mesma moeda que o level up — e como osso só acumula e nunca é gasto, a distribuição de pontos iria perdendo significado com o tempo. A escolha do jogador ficaria diluída por um sistema que ele não controla.

Com percentual sobre derivado, cada sistema fica com um trabalho próprio:

| Sistema | Responde por |
|---|---|
| **Atributos** | O perfil — que build você é |
| **Equipamento** | A vazão — se o andar cede |
| **Ossos** | O piso — multiplicador sobre o que você já construiu |

Osso amplifica em vez de substituir: 200% de Penetração acumulada ainda exige STR para ter o que multiplicar. E percentual **não caduca** — `+8%` vale o mesmo no dia 1 e no ano 3, enquanto `+40 STR` viraria ruído no ano 2.

### 6.5 Restrição

O Ossuary é **acumulativo e não gastável**. Não é loadout, não tem escolha excludente, não tem respec. É o único sistema do jogo sem sumidouro — e é assim que ele carrega o Pilar Um sozinho. Todo o resto pode ser gasto, drenado e reconfigurado; o ossuário só cresce.

### 6.6 Domínio implementado

O core possui um `OssuaryState` de conta com ossos, progresso de marcos por
chave e IDs de upgrades desbloqueados. Requisitos de upgrade podem exigir
ossos acumulados ou uma contagem mínima de marco; nenhum requisito consome
ossos e cada upgrade só pode ser desbloqueado uma vez. Os bônus são definidos
como percentuais sobre derivados (`vigor`, `damage`, `penetration`, `cadence`,
`critical`, `reach`, `sustain` e `mana`) e são somados por derivado.

O Laboratório possui fixtures artificiais para conceder osso, registrar o
marco `shadow-runner`, desbloquear upgrades e exibir um snapshot numérico no
personagem selecionado. O snapshot combina atributos efetivos, dano-base do
equipamento e bônus do Ossuary por meio de fórmulas fornecidas pelo chamador.
As fórmulas do Lab são provisórias; o snapshot é consumido pelo combate, mas os
números finais de balanceamento continuam fora desta etapa.

---

## 7. Mapa de mundos

**Vestíbulo + nove círculos. Dez fases cada. 100 fases na Temporada 1.** Decidido.

| # | Mundo | Círculo | Fases | Primários exigidos | Guardião |
|---|---|---|---|---|---|
| **0** | The Blank Banner | Vestíbulo (Antinferno) | 1–10 | STR, e o conceito de Penetração | **Caronte** — preço: Óbolos |
| 1 | — | I, Limbo | 11–20 | STR | — |
| 2 | — | II, Luxúria | 21–30 | DEX | Minos |
| 3 | — | III, Gula | 31–40 | CONS | Cérbero |
| 4 | — | IV, Avareza | 41–50 | STR + CONS | Plutão |
| 5 | — | V, Ira | 51–60 | DEX + CONS | Flégias |
| 6 | — | VI, Heresia | 61–70 | INT | Muros de Dis |
| 7 | — | VII, Violência | 71–80 | STR + INT | Minotauro / Gerião |
| 8 | — | VIII, Fraude | 81–90 | DEX + INT | Malebranche |
| 9 | — | IX, Traição | 91–100 | os quatro | **Lúcifer** — fase 100 |

**A coluna de primários é a espinha da curva.** Não é decoração: cada círculo é prova de que o jogador construiu um perfil específico, e a ordem sobe de um primário isolado (Limbo–Gula) para pares (Avareza–Fraude) e enfim para o build completo (Traição). Quem empilhou só STR passa liso pelo Limbo e trava na Luxúria — comportamento desejado, e o motivo de o equipamento existir.

**O Vestíbulo é o Mundo 0.** Ele é Antinferno em Dante — literalmente antes do primeiro círculo — então numerá-lo como zero mantém o Mundo *n* alinhado ao Círculo *n*, o que evita um off-by-one em todo conteúdo futuro. Ainda assim tem dez fases próprias e é um mundo completo, não tutorial: 10 + 9×10 = **100**. O número redondo tem valor real de produto — "cheguei na fase 100" é uma frase que o jogador diz sozinho, e Lúcifer na 100 é o clímax que a estrutura pedia.

Só o Mundo 0 está desenhado. A tabela fixa a espinha e reserva os guardiões — **não** é para ser preenchida agora. Conteúdo é dado, não código: cada mundo é um arquivo em `packages/content`.

**Padrão por mundo, derivado do Vestíbulo:** 3–4 mobs comuns (um deles a parede, na fase 9), 1 miniboss (fase 5), 1 elite raro que dropa o preço do guardião (garantido na fase 8), 1 guardião de duas fases (fase 10), 1 material de gate, 1 tier de equipamento, 1 osso.

### 7.1 Temporadas: como o conteúdo deixa de ser finito

Cem fases é muito, e ainda assim é finito. A resposta **não** é fazer o ciclo repetir com escala — isso é prestige disfarçado, e transforma conteúdo desenhado em papel de parede numérico.

A resposta é **temporada como expansão horizontal**, que é exatamente o substituto de prestige que o plano técnico §6 exige:

- A fase 100 é o endgame da Temporada 1, não o fim do jogo.
- Cada temporada nova adiciona conteúdo desenhado: um círculo a mais, uma vertente mitológica nova, um sistema novo.
- Dante é a Temporada 1. A estrutura não obriga o jogo a ficar preso nele — outros substratos mitológicos entram como temporadas seguintes, com bestiário, guardiões e ossos próprios.
- Ranking de arena zera por temporada; **progresso do jogador nunca** (Pilar Um).

Isso dá três coisas de uma vez: conteúdo perene, o ciclo de reengajamento que o passe de temporada monetiza (plano técnico §8.1), e a "sensação de recomeço" — sem tocar em nada que o jogador construiu.

**Consequência de produção:** o conteúdo precisa ser dado desde o primeiro commit. Um círculo novo tem que ser um arquivo em `packages/content`, não uma release de código. É por isso que a engine/editor deixa de ser ambição e vira infraestrutura de negócio.

---

## 8. Ganchos de PVP

A arena é o endgame infinito (plano técnico §7). O core design precisa respeitar quatro coisas desde o commit inicial:

1. **`resolveCombat` é o mesmo código** no PVE e no PVP. Se o combate PVE for tick-based e determinístico, o PVP sai quase de graça.
2. **`Combatant` é derivado, não é o `GameState`.** A função de conversão é o ponto de normalização futura.
3. **Só estado validado pelo servidor entra no snapshot** de defesa.
4. **O Ossuary é o perfil competitivo.** Ele é visível, permanente e não gastável — logo é a leitura mais honesta do investimento de um jogador, e o lugar natural para cosmético (a fonte de monetização que não toca em poder).

**Risco assumido:** sem prestige, a distância entre um jogador de 1 dia e um de 1 ano cresce sem teto. Ligas por poder efetivo contêm; não eliminam. A saída de emergência é normalização de stats dentro da arena — por isso o item 2 não é negociável.

---

## 9. Renderização

A aplicação Expo é a experiência principal em `/`. A cena usa React Native
Skia, enquanto HUD, party e painéis continuam como Views React Native; o loop
de simulação continua exclusivamente no `packages/core`, e a tela transforma
estado e eventos em apresentação. `/lab` é
uma rota técnica para validar domínios isolados e não representa o produto
jogável.

**react-native-skia**, decidido. Mesmo código de render em iOS, Android (v2) e web, preservando o monorepo TS unificado.

```
packages/core        lógica pura, zero render
  └ apps/expo        Skia via iOS, Android e RN Web
```

Sprites 2D, parallax de camadas, partículas — suficiente para um sidescroller idle e longe do teto do Skia.

**Isto corrige uma premissa do plano técnico**, que descreve o projeto como "90% UI". Com sidescroller, existe uma camada de render em tempo real que aquele documento não previu. Consequências a absorver:

- O loop de render é independente do tick de simulação. `core` não sabe que existe tela.
- Com o app em background, não há render — só o cálculo fechado de progresso offline.
- O plano técnico §2 precisa de uma revisão para registrar o Skia.

---

## 10. Questões em aberto

### Resolvidas

| # | Questão | Decisão |
|---|---|---|
| ~~Q1~~ | Sete círculos ou nove? | **Nove**, mais o Vestíbulo. 10 fases cada = **100 fases** (§7). |
| ~~Q3~~ | Equipamento como camada separada dos atributos? | **Sim, e são sistemas independentes.** Atributos vêm de pontos de nível; equipamento é gate de vazão por tier. Dano = arma + STR (§4.3–4.6). |
| ~~Q4~~ | O que acontece depois da última fase? | **Temporadas.** Fase 100 é o endgame da T1; conteúdo novo vem como círculo/mitologia nova, não como repetição escalada (§7.1). |
| ~~Q10~~ | Ossos afetam atributos ou derivados? | **Derivados**, em percentual. Atributos vêm de nível e são a decisão escassa; osso não pode diluí-la (§6.4). |
| ~~Q9~~ | Equipamento tem raridade além do tier? | **Sim:** common / rare / epic / legendary, definindo a quantidade de afixos. Tier vem do círculo, raridade vem da sorte (§4.5). |
| ~~Q18~~ | Ouro e poeira se sobrepõem? | **Não — são opostos.** Ouro é fluxo (abundante, some); poeira é escassez (guardião e elite, % baixa, acumula) (§5.1). |
| ~~Q20~~ | Venda de loot automática ou manual? | **Automática por regras configuráveis** pelo jogador; padrão vende common ao lotar (§5.4). |
| ~~Q2~~ | Herói único ou esquadra? | **Party de até 4**, começando com 1. Slots e personagens comprados com ouro (§4.2). |
| ~~Q22~~ | No que se gasta ouro? | **Consumíveis, manutenção de build, party (slots e personagens), power-ups de time e conversão em poeira** (§5.5). |
| ~~Q23~~ | O que a poeira compra? | **O legendary.** ~50 poeiras no último degrau da escada de merge. Destino único (§4.5). |
| ~~Q16~~ | Merge de itens | **Escada de raridade:** N×common→rare, N×rare→epic, N×epic + 50 poeira→legendary (§4.5). `N` fica para o balanceamento. |
| ~~Q28~~ | Efeito único do legendary é aleatório? | **Aleatório, mas rerollável.** Ouro com custo escalonado (rota padrão) ou 1 poeira fixa (válvula de escape) (§4.5). |
| ~~Q17~~ | Tamanho do inventário | **128 slots em 3 páginas** (48 / 48 / 32). Cheio, vende o de menor valor sozinho — a caça não para (§5.4). |
| ~~Q5b~~ | A poção pode deixar o jogador no vermelho? | **Não.** Custo cheio ou nada; o piso de ouro foi descartado por redundância (§5.3). |
| ~~Q15~~ | Quantos pontos por nível, e a curva de XP acompanha os 10 níveis-por-círculo ou é independente? | **Três pontos por nível.** O custo para avançar é `round(55 × nível^1,42)` e o XP excedente permanece no nível seguinte. A curva é independente do círculo e continua escalando (§4.4). |
| ~~Q27~~ | XP compartilhado pela party — confirmar, e definir se é integral ou fracionado por slot. | **Integral:** toda recompensa concede o mesmo XP a cada personagem ativo (§4.2). |

### Abertas

| # | Questão | Bloqueia |
|---|---|---|
| Q5 | Teto de progresso offline em horas | Ritmo de check-in, valor do anúncio recompensado |
| Q6 | Marcos de abate: bônus aditivo ou multiplicativo? | Curva de longo prazo — decisão de anos, não de patch |
| Q7 | O ossuário é uma tela ou o cenário de fundo do hub? | Escopo de arte, peso da fantasia |
| Q8 | Duração da caminhada entre ondas: constante ou encurta com o poder? (§3.2) | Ritmo percebido, calibragem da economia |
| Q11 | Quantos círculos entram no lançamento? 100 fases desenhadas é escopo grande para um dev solo. | Data de lançamento, tamanho da T1, pipeline de conteúdo |
| Q12 | Progressão de dificuldade *dentro* de um círculo: multiplicador plano por fase ou curva por fase? | Balanceamento, sensação das 10 fases |
| Q13 | Respec de atributos: pago, gratuito ou inexistente? (§4.4) | Frustração de build travada, sumidouro |
| Q14 (parcial) | Spells: fonte, raridade/tier, escala por tier ou nível, slots e quantas simultâneas? (§4.6) | Aquisição, progressão de conteúdo e regra definitiva de capacidade |
| Q16b | Valor de `N` na escada de merge, e se o merge exige mesma base/slot ou aceita qualquer peça (§4.5) | Ritmo do loot, pressão de inventário |
| Q19 | Runas: consumível de spell separado ou poção de mana basta? (§5.3) | Complexidade da loja, economia de INT |
| Q21 | Conflito entre auto-venda de common e reserva de insumo para merge (§5.4) | Comportamento padrão, clareza para o jogador |
| Q24 | Personagens compráveis têm identidade fixa (classe, sprite, afinidade) ou são slots genéricos? (§4.2) | Monetização, arte, profundidade de composição |
| Q25 | Como o jogo indica para qual dos 4 personagens uma peça serve? (§4.2) | Viabilidade do check-in de 40 s |
| Q26 | Equipamento é visível no sprite? Com 4 personagens, isso multiplica o custo de arte. | Escopo de arte, peso percebido do loot |
| Q29 | Taxa de drop da poeira, calibrada contra o alvo de 1.200 para uma party lendária (§4.5) | Ritmo do endgame inteiro |
| Q30 | Custo base do reroll em ouro: indexado a tier/círculo, e como escalona por tentativa (§4.5) | Se ficar fixo, inflaciona para grátis no endgame |

**Q29 é a mais urgente agora.** Ela é o pino que trava o resto da economia: a taxa de drop da poeira precisa ser calibrada contra o alvo explícito de 1.200 poeiras para uma party lendária, e não escolhida por intuição. Sem esse número, não dá para calibrar drop de elite, valor do guardião nem o preço da conversão ouro→poeira.

**Q25 é a mais subestimada.** Com quatro personagens, "esta peça é melhor?" passa a ter quatro respostas, e o check-in de 40 segundos depende inteiramente de o jogo responder isso sozinho.

**Q11 continua sendo o maior risco de projeto.** 100 fases desenhadas é muito conteúdo para um dev solo produzir antes do lançamento — e a resposta de temporadas (§7.1) só funciona se o pipeline de conteúdo existir. Risco de produção, não de design.

**Q10 vem logo atrás,** porque define se o Ossuary é sistema paralelo ao equipamento ou concorrente dele.

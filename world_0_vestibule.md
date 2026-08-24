# Mundo 0 — The Blank Banner

Vestíbulo, Antinferno. Nome interno: `world_00_vestibule`. **Fases 1–10** de 100 (Temporada 1). É o Antinferno, antes do primeiro círculo — daí o número zero, que mantém Mundo *n* alinhado ao Círculo *n*.

Estrutura de fases conforme `docs/design/core-design.md` §3.3. Implementado em
`packages/core/src/world-0.ts` — **37 ondas, 423 inimigos, 6 espécies**:

| Fase | Papel | Ondas | Composição | Inimigos |
|---|---|---|---|---|
| 1 | Apresentação | 3 | Ignavos, 3 → 5 | 12 |
| 2 | Apresentação | 4 | Ignavos, 4 → 7 | 22 |
| 3 | Escalada | 4 | + Moscardos · **drop garantido da Foice** | 40 |
| 4 | Escalada | 4 | Ignavos + Moscardos, densidade máxima | 60 |
| 5 | Miniboss | 3 | Marcado com escolta | 43 |
| 6 | Pressão | 4 | + Gorjas, uma por vez | 50 |
| 7 | Pressão | 4 | Gorjas em par · **drop garantido da Ceifa** | 68 |
| 8 | Elite | 4 | Marcados — farm de Óbolos | 50 |
| 9 | A parede | 4 | Encalhados — exige Penetração | 49 |
| 10 | Guardião | 3 | Caronte | 29 |

Primário exigido pelo círculo: **STR** (Dano e Penetração).

## Números por espécie

`f` é o número da fase. As curvas são suaves de propósito: o salto de
dificuldade vem da **composição da onda**, não de o mesmo bicho endurecer.

| Espécie | Vida | Dano | Defesa | Cadência | Dreno |
|---|---|---|---|---|---|
| Ignavo | 12 × 1,20^(f−1) | 1,0 + 0,15f | 0 | 0,6/s | — |
| Moscardo | 5 × 1,18^(f−1) | 0,5 + 0,08f | 0 | 2,2/s | — |
| Gorja | 55 × 1,19^(f−1) | 3,0 + 0,35f | 20 | 0,5/s | **30 %** |
| Encalhado | 30 × 1,10^(f−1) | 0,6 | **106** | 0,4/s | — |
| Marcado | 80 × 1,17^(f−1) | 7,0 + 0,6f | 12 | 1,1/s | — |
| Caronte | 700 | 9 | 40 | 1,0/s | — |

Três decisões explicam quase tudo:

- **Trash ameaça tempo, não vida.** O combate resolve um alvo por vez, e com N
  inimigos o dano recebido cresce com N(N+1)/2. Se o Ignavo doesse de verdade,
  nenhuma onda grande seria vencível. Quem ameaça vida é o que tem nome.
- **A defesa 106 do Encalhado é o que o torna parede.** A mitigação é linear
  sobre um `defenseConstant` de 100, então defesa só vira barreira nessa faixa.
  Abaixo dela, ele seria apenas um bicho lento.
- **O alcance abre a multidão.** Sem ele as ondas ficariam em 4–8 inimigos.

## A escada de armas

`reachBonus` é alvo adicional por golpe. É a resposta à multidão, e por isso
sobe com a raridade, não com o nível.

| Arma | Raridade | Dano | Alvos | Onde |
|---|---|---|---|---|
| Foice do Vestíbulo | rare | 8 | **2** | fase 3, garantida |
| Gadanho de osso | epic | 14 | 2 | fases finais |
| Ceifa de Caronte | legendary | 22 | **3** | fase 7, garantida |

**Não existe arma antes da fase 3, e isso é estrutural.** O auto-equipar só
preenche slot vazio — regra escolhida para o jogo nunca desfazer escolha do
jogador. Se uma arma comum caísse na fase 1, ela ocuparia o slot e a Foice
ficaria parada na mochila: o jogador entraria nas fases seguintes com alcance
1 contra um calibre que pressupõe 2. Verificado jogando — com uma lâmina na
fase 1, a run morre na fase 4.

## Calibre atual

Os números foram verificados **jogando as dez fases contra o motor real**, com
um personagem e o build de referência (2 STR + 1 CONS por nível). O herói sai
do nível 1 sem arma e derrota Caronte por volta do nível 10.

O motor ainda **não tem cura de nenhum tipo**. O modelo de balanceamento media
dificuldade em poções queimadas, como o §5.3 define, mas sem poção automática
todo dano acumulado vira morte. Quando ela entrar, as fases 6 a 10 devem ser
reapertadas — e aí sim contando com o segundo personagem, que corta a
dificuldade em cerca de 75 %.

Planície de lama batida sob céu de ferro, sem sol e sem horizonte. No centro, sempre visível e nunca alcançado, um estandarte em branco gira devagar. A multidão corre atrás. O chão é sangue e lágrimas coalhados, e o zumbido nunca para.

Paleta: ocre sujo, cinza-ferro, vermelho-escuro. Sem fogo — fogo é a linguagem visual dos círculos de baixo. Aqui é frio, úmido e infestado.

A borda leste desce para a margem do Aqueronte. É onde Caronte espera.

## Bestiário

O jogador lê este bestiário dentro da aplicação Expo, no painel Bestiário da
home, com figura, dano e drops.

**Os valores de dano são placeholder.** Não há balanceamento por espécie ainda —
a simulação aplica uma fórmula única a todos os mobs (`2 + rng*3 + onda*0.32`,
cadência 1,15 s). Os números registrados aqui derivam dos papéis descritos e
existem para o jogador ler, não para o combate consumir.

### 1. Ignavos — os Corredores

Vultos nus, sem traço de rosto, correndo em bando. Não te enxergam; te atropelam por acidente.

- **Papel:** trash mob, fraco, em quantidade crescente
- **Dano (placeholder):** 2–4 por golpe, cadência 1,15 s
- **Testa:** dano em área e volume de produção
- **Drop:** Ouro (baixo, constante). Poeira de Passo em chance muito baixa — ver `docs/design/core-design.md` §5.1
- **Osso:** nenhum. São sombras. Estabelecer isso cedo faz o jogador querer o que tem osso.

### 2. Moscardos — o Aguilhão

Enxame de vespas do tamanho de um punho, ferrão longo demais para o corpo.

- **Papel:** HP baixíssimo, muitos ataques por turno
- **Dano (placeholder):** 1–2 por golpe, cadência 0,4 s
- **Testa:** velocidade e defesa — quem investiu só em dano bruto apanha aqui
- **Drop:** Ferrão Partido, Quitina Fina

### 3. Gorjas — os Vermes

Corpos segmentados, pálidos, cegos. Lentos. Enterram-se e reaparecem. Comem o sangue que escorre dos pés dos Ignavos.

- **Papel:** tanque com dreno; cura o que causa de dano
- **Dano (placeholder):** 5–8 por golpe, cadência 2,0 s
- **Testa:** sustain e dano concentrado — não dá para vencer no atrito
- **Drop:** Bílis Coalhada — material de reroll, sumidouro puro

### 4. Encalhados — os que Esperam

Figuras encurvadas e imóveis na margem, cobertas de limo, endurecidas por séculos de espera. Só reagem se tocadas.

- **Papel:** defesa altíssima, dano quase nulo. Não te matam — te fazem perder tempo.
- **Dano (placeholder):** 0–1 por golpe, cadência 3,0 s
- **Testa:** penetração de armadura. Primeira parede real do jogo, e a solução é um atributo novo, não mais dano.
- **Drop:** Limo do Aqueronte — material de gate para o mundo 2

### 5. Marcados — elite raro

Um Ignavo com uma marca queimada nas costas, onde o remo de Caronte já bateu. Corre sozinho, contra a corrente, na sua direção. É o único ali que te vê.

- **Papel:** spawn raro, dano alto, recompensa alta
- **Dano (placeholder):** 12–18 por golpe, cadência 1,4 s
- **Testa:** nada. Existe para criar o hábito de abrir o app.
- **Drop:** Óbolo — a moeda de Caronte

## Boss — Caronte, o Barqueiro

Não desce da barca. Olhos como rodas de brasa, remo de madeira negra mais longo que um corpo.

**Dano (placeholder):** 20–30 por golpe, cadência 1,8 s.

**Fase 1, a Recusa:** ele te empurra da margem. Combate que exige tudo que os quatro mobs ensinaram — volume, velocidade, sustain, penetração.

**Fase 2, o Óbolo:** vencer não o mata. Ele estende a mão. Você paga a travessia em Óbolos, farmados dos Marcados.

Isso faz de Caronte o primeiro sumidouro do jogo, ensinando na abertura a regra que sustenta toda a economia sem prestige: recurso existe para ser gasto. E cria um padrão reutilizável — cada mundo termina num guardião com um preço próprio.

## Ouro por abate

Cada bicho larga ouro ao cair, em **faixa** e não em valor fixo: dois ignavos da
mesma noite não valem o mesmo, e é a variação que faz a caça parecer caça em vez
de planilha. O sorteio é determinístico pela seed da run — o mesmo save rende o
mesmo ouro.

A base é da noite 1 e escala **+35% por noite**; a faixa é ±30% em torno dela.

| Espécie | Base (noite 1) | Noite 1 | Noite 4 | Noite 10 |
|---|---|---|---|---|
| Moscardo | 2 | 1–3 | 3–5 | 6–11 |
| Ignavo | 3 | 2–4 | 4–8 | 9–16 |
| Gorja | 7 | 5–9 | 10–18 | 22–38 |
| Encalhado | 9 | 6–12 | 13–23 | 28–49 |
| Marcado (elite) | 24 | 17–31 | 34–61 | 74–130 |
| Caronte (guardião) | 90 | 63–117 | 126–229 | 261–486 |

Elite e guardião valem muito mais porque são o pico da noite, não mais um da
multidão.

**O ouro do abate é somado ao `goldReward` da onda**, que continua existindo como
recompensa por fechar a onda. Hoje o da onda pesa mais que o dos bichos — a onda
1 paga 34, um ignavo paga 2 a 4. Se a intenção for que a caça sustente a
economia, é o `ouroPorOnda` que deve baixar; isso é calibre, e calibre é do time.

Loot de equipamento continua vindo da tabela de drop da fase, na vitória da
onda. Não há drop por bicho ainda.

## O gancho do Ossuary

O primeiro osso do jogo não vem de um monstro. Vem de Caronte, quando ele aceita o pagamento: um fragmento da barca, ou o primeiro Óbolo que você não gastou.

Isso dá ao ossuário uma origem narrativa e ancora a meta-progressão: cada mundo contribui com uma peça, e o que você constrói cresce para sempre — que é literalmente a sua mecânica, já que não existe reset.

Contadores de abate por espécie com marcos de bônus permanente encaixam aqui direto, e resolvem a progressão de longo prazo sem precisar de prestige.

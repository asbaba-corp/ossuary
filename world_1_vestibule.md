# Mundo 0 — The Blank Banner

Vestíbulo, Antinferno. Nome interno: `world_01_vestibule`. **Fases 1–10** de 100 (Temporada 1). É o Antinferno, antes do primeiro círculo — daí o número zero, que mantém Mundo *n* alinhado ao Círculo *n*.

Estrutura de fases conforme `docs/design/core-design.md` §3.3:

| Fase | Papel | Conteúdo |
|---|---|---|
| 1–2 | Apresentação | Ignavos |
| 3–4 | Escalada | Ignavos + Moscardos |
| 5 | Miniboss | *a definir* |
| 6–7 | Pressão | Moscardos + Gorjas |
| 8 | Elite | Marcados (spawn garantido) — farm de Óbolos |
| 9 | A parede | Encalhados — exige Penetração |
| 10 | Guardião | Caronte, duas fases |

Primário exigido pelo círculo: **STR** (Dano e Penetração).

Planície de lama batida sob céu de ferro, sem sol e sem horizonte. No centro, sempre visível e nunca alcançado, um estandarte em branco gira devagar. A multidão corre atrás. O chão é sangue e lágrimas coalhados, e o zumbido nunca para.

Paleta: ocre sujo, cinza-ferro, vermelho-escuro. Sem fogo — fogo é a linguagem visual dos círculos de baixo. Aqui é frio, úmido e infestado.

A borda leste desce para a margem do Aqueronte. É onde Caronte espera.

## Bestiário

O jogador lê este bestiário dentro do jogo: o protótipo (`prototype/scene.html`)
expõe as entradas abaixo num pop-up próprio, com figura, dano e drops.

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

## O gancho do Ossuary

O primeiro osso do jogo não vem de um monstro. Vem de Caronte, quando ele aceita o pagamento: um fragmento da barca, ou o primeiro Óbolo que você não gastou.

Isso dá ao ossuário uma origem narrativa e ancora a meta-progressão: cada mundo contribui com uma peça, e o que você constrói cresce para sempre — que é literalmente a sua mecânica, já que não existe reset.

Contadores de abate por espécie com marcos de bônus permanente encaixam aqui direto, e resolvem a progressão de longo prazo sem precisar de prestige.

# Memory

Registro do que custou caro descobrir. **Não** é changelog — o changelog conta
o que mudou, este arquivo conta *por que* e *o que não repetir*. Se um defeito
levou mais de uma tentativa para ser fechado, ou se uma investigação chegou à
conclusão errada antes de acertar, o lugar é aqui.

Regra de escrita: uma entrada por descoberta, sempre com o **sintoma** (o que
se via), a **causa** (a linha ou o mecanismo) e a **lição** (o que fazer
diferente). Entradas novas vão no fim.

---

## Verificação

### Captura estática não prova nada sobre movimento
**Sintoma:** o porte da cena foi dado como pronto com base num screenshot; o
jogo estava quebrado — sem animação, com escala errada e barras transbordando.
**Causa:** um quadro parado não mostra animação, fluidez nem transbordo.
**Lição:** para qualquer coisa que se move, conferir em movimento — sonda de
rAF, capturas em instantes diferentes, ou os fixtures de save. Um screenshot
serve para conferir *layout*, não *comportamento*.

### Medir a coisa certa e concluir errado
**Sintoma:** três rodadas afirmando progresso sobre o clarão dos inimigos com
base em medições verdadeiras.
**Causa:** `hits` continha os ids, as idades davam 0,00–0,15s e o pico do
clarão dava 1,00 — tudo verdade. O valor era calculado e **depois descartado**
por um `morto ? 0 : ...` no ponto de uso, e a medição acontecia antes do
descarte.
**Lição:** medir o valor no ponto onde ele é **consumido**, não onde é
produzido. E quando dois casos parecidos divergem (o herói piscava, o mob não),
comparar os dois caminhos até o fim em vez de teorizar sobre o começo.

### Sonda que mede a página errada
**Sintoma:** 59fps relatados enquanto o jogo travava.
**Causa:** a sonda vivia numa página pai que carregava o app num iframe e media
o rAF *dela*. A página pai não desenha nada.
**Lição:** a sonda tem de rodar no mesmo contexto que desenha. Hoje ela vive em
`apps/expo/index.web.ts`, ligada por `?sonda=1`.

### `--virtual-time-budget` distorce o que se observa
**Sintoma:** contadores indicando que a cena renderizava 4 vezes por segundo;
capturas caindo sempre na fase de marcha.
**Causa:** o tempo virtual do Chrome não avança o `rAF` como tempo real, e com
marcha longa toda captura cai no trecho de caminhada.
**Lição:** para fluidez, tempo real. Para pegar um estado específico (combate),
semear o save — `public/combate.html`.

---

## Desempenho

### A parede parava o jogo, e `Picture` não resolveu
**Sintoma:** 20,7fps, quadro mediano de 50ms.
**Causa:** a parede como árvore de componentes eram >10 mil nós Skia
reconciliados por quadro. Gravá-la como `Picture` tirou a reconciliação mas o
Skia seguia **rasterizando as dez mil elipses todo quadro** — ganho zero,
medido.
**Lição:** conteúdo estático que só desliza deve ser rasterizado **uma vez para
uma imagem** (`Skia.Surface.Make`, CPU — `MakeOffscreen` devolvia imagem vazia
no web). Resultado: 59,3fps, mediana 16,7ms.

### `setInterval` brigando com o vsync
**Sintoma:** engasgos de até 868ms no meio de uma cena que corria a 60fps.
**Causa:** o relógio da cena era um `setInterval` de 50ms.
**Lição:** relógio de animação é `requestAnimationFrame`. A troca levou o pior
quadro de 868ms para 83ms — *apesar* de passar a re-renderizar 60×/s em vez de
20×/s.

### Gravar o save a cada tick
**Sintoma:** nenhum, mensurável. **Causa:** `pendingSync` fica ligado quase
sempre, então o save era escrito 4×/s — `serializeGameState` (que clona por
JSON) + `JSON.stringify` + `localStorage.setItem` síncrono, sobre um estado que
cresce a cada onda. **Lição:** corrigido por ser errado, não por ter sido
provado culpado; a rotina tem intervalo mínimo de 2s e o que é progresso grava
na hora. Registrado para ninguém "redescobrir" isto como causa de travamento.

---

## Domínio

### Mochila cheia travava a run para sempre
**Sintoma:** o jogo congelava sem nada na tela; no console, centenas de
`inventory has no available slots`.
**Causa:** `addItem` lança quando não há vaga, e o `setInterval` seguia
chamando um tick que só sabia lançar.
**Lição:** core-design §5.4 — mochila cheia nunca pode parar a caça. A peça sem
lugar vira ouro. Num idle, encher o inventário não é caso raro, é o destino de
quem deixa rodando.

### Farmar a mesma fase duas vezes derrubava o tick
**Causa:** o id da instância do drop era determinístico
(`fase:onda:hash(seed)`), então repetir a fase recriava a mesma instância e o
inventário recusava. **Lição:** num idle o loop inteiro é repetir a fase de
melhor saldo; qualquer id derivado só do conteúdo vai colidir.

### O app jogava o mundo errado
**Sintoma:** o HUD só sabia mostrar "WAVE 1" e nenhuma noite tinha as ondas do
desenho. **Causa:** `apps/expo` carregava `VESTIBULE_CONTENT`, andaime de teste
com dez fases de **uma** onda cada. **Lição:** o conteúdo jogado é
`WORLD_0_CONTENT`. E trocar de conteúdo exige descartar save divergente, senão
o save aponta para fases inexistentes e o primeiro tick morre.

### A noite não avançava
**Sintoma:** terminada a noite 1, ela recomeçava. **Causa:** o motor desbloqueia
`nextPhaseId` na última onda mas **não escolhe a fase de farm** — essa decisão é
do app, e o app não a tomava. **Lição:** separar "o motor permite" de "o app
decide"; o segundo precisa de código explícito.

### Balanceamento não é responsabilidade dos testes
**Sintoma:** mudar a *forma* do mundo (3/5 ondas) reprovava a suíte com o motor
perfeito. **Causa:** dois testes exigiam que as dez noites fossem vencíveis e
que o herói terminasse no nível ~10 — asserções de calibre presas à estrutura.
**Lição:** o teste garante que o motor atravessa as dez noites sem travar e
**relata** a fronteira do build de referência. Calibre é do time; teste que
força calibre convida a mexer nos números até o vermelho sumir.

---

## Cena

### Estado que só existe em combate some entre as ondas
**Sintoma:** vida e mana caíam para 0/0 ao vencer a onda; a horda "aparecia do
nada"; o último inimigo morto sumia antes de piscar ou tombar.
**Causa:** os três liam de `run.combat`, que é `null` fora do combate.
**Lição:** o que precisa sobreviver à onda tem de ser guardado fora dela — os
últimos vitais, a horda que está por vir, os corpos. Quando o último inimigo
cai, o motor fecha a onda **no mesmo tick**: nada que dependa de `combat` vai
estar lá para desenhar a morte.

### Posição vinda do motor anda em degraus
**Sintoma:** a horda caminhava quadro a quadro. **Causa:** a posição saía de
`distanceToWave`, que muda 4×/s. **Lição:** ancorar no motor a cada tick e
**interpolar** com o relógio da cena entre eles — não acumula desvio e desenha
liso.

### Câmera que zera corta a cena
**Sintoma:** corte brusco a cada virada de onda. **Causa:**
`camera = andando ? time * 34 : 0` — zerava no combate e saltava para o tempo
absoluto na marcha. **Lição:** câmera é distância acumulada; só cresce, e só
enquanto anda. Limitar o delta por quadro para a volta de aba oculta não
teleportar o fundo.

### Herói que se move no palco teleporta
**Sintoma:** o boneco saltava para trás a cada onda. **Causa:** ele tinha
avanço próprio que voltava a zero quando a marcha reiniciava. **Lição:** o
herói fica fixo e **quem se move é o mundo** — fundo correndo e horda entrando.
Câmera presa no herói, como no protótipo.

### Âncoras e índices lidos depois do fato
**Sintoma:** corpo do último inimigo aparecia colado no herói; quatro mobs
piscavam e sumiam na virada. **Causa:** o slot do corpo vinha de
`indexOf` numa lista já esvaziada pela vitória (−1 → slot 0), e a âncora da
marcha valia `progresso: 1` por um render depois da onda cair.
**Lição:** o que só existe *durante* um estado precisa ser anotado *enquanto*
ele existe. E transições devem zerar suas âncoras na hora, não no próximo tick.

### Camada de efeito dentro de transform espelhado
**Sintoma:** hipótese de que o `flip` matava o clarão. **Causa:** era falso — o
teste com `clarao={1}` mostrou os mobs totalmente brancos.
**Lição:** registrada como *hipótese descartada*, para ninguém refazer o
caminho. O `layer` externo ao espelhamento ficou porque é mais claro, não
porque consertou algo.

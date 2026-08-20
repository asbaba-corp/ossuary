# Changelog

Histórico de mudanças do Ossuary. **Cada PR é uma versão.**

Entradas em ordem decrescente: a mais recente primeiro. Regras de escrita e
numeração vivem no `AGENTS.md`, seção *Changelog*.

Formato de cada entrada:

```
## X.YY — Título curto do que mudou
PR #NN · AAAA-MM-DD · @autor

### Added / Changed / Fixed / Removed
- ...
```

## 0.22 — Tela de poções, com atalho no analyzer
PR #61 · 2026-08-20 · @juniozguedes

### Added
- **tela de poções**: duas colunas, vida e mana, com liga/desliga por tipo, o
  frasco escolhido e o limiar em que se bebe. Custo em vermelho quando o ouro
  não cobre — o §5.3 manda a poção só ser bebida se o ouro cobrir, nunca
  negativa. Catálogo e valores são os mesmos do protótipo; mana nasce
  desligada porque sem magia nada gasta mana.
- **atalho**: frasco clicável ao lado de POTIONS AVAILABLE, no Session
  Analyzer. O botão "◍ Poções" que já existia dentro do inventário estava
  inerte e agora abre a mesma tela.

### Changed
- POTIONS AVAILABLE deixa de dividir o ouro por um 50 fixo e passa a usar o
  custo da poção ESCOLHIDA. Trocar para a Maior muda o número; antes o painel
  mentia.

### Notas
A tela guarda a escolha, mas **o motor ainda não bebe**: as ondas do Mundo 0
têm `consumableRuleId` nulo, e o §5.3 manda o consumo seguir o dano recebido e
não a contagem de ondas. Isso está dito na própria tela, para ninguém achar que
está ligado. Ligar ao combate é trabalho do core.

## 0.21 — Noite 1 com peso, e fim dos documentos de plano
PR #60 · 2026-08-20 · @juniozguedes

### Changed
- a noite 1 deixa de ser passeio: as ondas vão de 3/4/5 ignavos para **8/10/12**.
  A onda 2 e a 3 subiram junto porque manter 4 depois de uma primeira onda de 8
  faria a noite DECRESCER em dificuldade.

### Added
- **tela de morte portada do protótipo**: queda, breu e retorno, com uma das
  vinte citações do Inferno. As PRs 0.06 e 0.08–0.11 do Thiago tocaram apenas
  `prototype/scene.html` e nunca chegaram ao app — verificado arquivo por
  arquivo nas PRs #44 a #50. O breu não é só estética: é o corte que esconde o
  reposicionamento quando o motor recua a party para uma fase mais rasa.
- `public/morte.html`, fixture que semeia um save fadado à morte.

### Removed
- `docs/todo/` e `docs/done/`, e a etapa do fluxo que mandava escrever um plano
  antes e movê-lo depois. Quarenta desses tinham se acumulado e ninguém os lia:
  o plano descreve a intenção ANTES do trabalho, enquanto o `changelogs.md`
  registra o que foi entregue e o `memory.md` o porquê e o que não repetir. Dois
  registros da mesma coisa significam que um está velho, e o velho era sempre o
  plano. O conteúdo continua no histórico do git.

### Changed
- a checagem de versão do `AGENTS.md` passa a ler o número direto da `main` e a
  ser refeita **imediatamente antes do push** — o intervalo entre escolher o
  número e abrir a PR é onde o merge alheio cai. A regra já existia; o que
  faltava era ancorá-la na origem e no momento certo. Esta própria PR nasceu
  0.17 e virou 0.21 por causa disso.

### Notas
A fronteira do build de referência continua na noite 4 — a noite 1 mais densa
não a moveu. Calibre segue sendo do time.

Numerada 0.21 e não 0.17: a `main` recebeu 0.18, 0.19 e 0.20 enquanto esta
branch estava aberta, que é exatamente o caso que o AGENTS.md manda checar
antes de fechar a versão.

## 0.20 — Corpo ganha desempate próprio, sem depender só do epoch travado
PR #59 · 2026-08-18 · @thipintop

### Fixed
- O id de cada corpo (`restos`) já levava o epoch da morte para não colidir
  com mortes antigas do mesmo slot de combatente. Mas antes do primeiro
  `requestAnimationFrame` o epoch fica travado em 0 (só anda no loop de
  rAF), enquanto o tick do motor roda num `setInterval` à parte e pode
  resolver várias ondas inteiras nessa janela — o mesmo slot morrendo de
  novo com o epoch ainda em 0 colidia na chave e o React acusava
  "Encountered two children with the same key" logo no início da run. Um
  contador crescente, no mesmo padrão já usado pelo número de dano
  (`feedbackSeqRef`, PR #58), resolve.

## 0.19 — Chão ganha profundidade; colunas plantadas no chão
PR #57 · 2026-08-18 · @thipintop

### Changed
- Parede e chão se tocavam numa linha reta só, como se a cena não tivesse
  ângulo nenhum. Agora o chão é uma superfície: `GROUND_BACK`, junto da
  parede, mais alta na tela porque é mais longe do jogador; `GROUND`
  continua a beirada da frente, onde herói e mobs pisam. Um degradê cobre
  a superfície inteira, sem costura visível entre onde os pés pisam e o
  fundo.
- Chão ganha um pouco de sujeira rústica por cima do degradê, sem virar
  textura pesada. Duas tentativas anteriores erraram para lados opostos:
  réguas horizontais lisas liam como tábua de madeira; uma grade regular
  de lajes (`PEDRAS`, num grid de slots fixos) ficou regular demais e leu
  como azulejo. A versão final é só umas poucas manchas de desgaste
  (`MANCHAS`) e rachaduras finas (`RACHADURAS`), espalhadas sem padrão e
  bem discretas — o chão continua limpo, com uns respingos de imperfeição
  em vez de uma textura desenhada por inteiro. Continua rolando com a
  câmera em velocidade cheia — é onde o herói pisa, não pano de fundo em
  parallax.
- Coluna vira adereço de fundo puro: a base para em `GROUND_BACK`, onde a
  parede encontra o chão — do tamanho do fundo, não do chão. Herói e mob
  caminham na faixa abaixo dela, mais perto do jogador. Uma primeira
  tentativa tinha plantado a base *dentro* do chão (abaixo de `GROUND`), o
  que colocava a coluna na mesma linha do personagem em vez de atrás dele.

### Notas
Nada na lógica de combate, posicionamento ou animação muda — `GROUND`
continua a referência de todo o resto do jogo. Só o desenho por trás dos
personagens ganhou profundidade.

---

## 0.18 — Número de dano ganha desempate próprio, sem depender do relógio da cena
PR #58 · 2026-08-18 · @thipintop

### Fixed
- Feedback de dano usava o relógio da cena (`sceneClockRef`) como parte da
  chave React. Esse relógio só anda dentro do loop de rAF, mas o tick do
  motor roda num `setInterval` à parte — no início de uma run, várias
  iterações desse setInterval processavam ataques contra o mesmo alvo antes
  do primeiro quadro de rAF, todas com o relógio travado em 0, gerando o
  mesmo id e disparando "Encountered two children with the same key" logo no
  começo de toda run nova. O id agora carrega um contador incremental por
  push que desempata quando o relógio ainda não andou.

---

## 0.17 — Corpos e números de dano deixam de acumular
PR #56 · 2026-08-18 · @thipintop

### Fixed
- Corpo de inimigo só saía de cena rolando com a câmera — sem marcha
  (combate, Loop numa mesma noite) ele nunca ia embora, e os corpos se
  empilhavam até pesar o quadro. Agora ele fica visível um instante e
  desvanece sozinho (~1,8s), por idade, do mesmo jeito que os números de dano
  já faziam.
- O id de combatente se repete entre ondas quando a mesma noite é refeita
  (Loop) — é o slot, não o bicho. Duas mortes do mesmo slot colidiam na chave
  da lista de corpos (`Encountered two children with the same key`). A chave
  agora carrega o instante da morte; o id do combatente continua guardado à
  parte para o clarão de acerto encontrar o corpo certo.
- A lista de corpos retinha cada um por 60s antes de podar, dez vezes mais
  que qualquer corpo chega a ficar visível. Cai para uma folga de 3s.

### Notas
Os números de dano flutuantes já expiravam sozinhos por idade — o relato de
"acumulados" era o mesmo travamento dos corpos deixando o fade parecer
congelado, não um vazamento à parte.

---

## 0.16 — Herói passa a usar o pack 2D SL Knight
PR #55 · 2026-08-15 · @juniozguedes

### Changed
- o cavaleiro do jogo vem agora de `sprites/2D_SL_Knight_v1.0`.
- `Quadro` aprende **grade**: aceita `qw`/`qh` e um `limite` de quadros. Antes
  contava por `largura / 128` e só sabia ler uma fileira de quadros quadrados.
  O pack novo vem em blocos de 128x64 em várias linhas — não era substituição
  direta.

### Notas
- `Attacks.png` guarda cinco golpes de oito quadros, um por linha; o jogo usa o
  primeiro (`limite = 8`). Trocar de golpe é escolher outra linha.
- A licença do pack permite uso comercial, edição e publicação; proíbe revenda
  e uso em marca. Diferente do pack anterior, não há conflito em versioná-lo.
- Escala em `HERO_SCALE = 1.85`, ajustada por captura.
- Amostragem **nearest** nos sprites: o filtro padrão interpola, e ampliar um
  quadro de 64px de altura a mais que o dobro deixava o cavaleiro embaçado. Com
  nearest o pixel continua quadrado — é o que a arte pede.

## 0.15 — A horda deixa de ser desfile
PR #54 · 2026-08-15 · @juniozguedes

### Changed
- cada ignavo anda no seu passo. O ritmo sai de um hash do id, então é sempre
  o mesmo bicho no mesmo passo; o mais rápido mantém a velocidade que todos
  tinham antes, e os outros ficam para trás no caminho e chegam junto no fim.
- a horda ocupa **fileiras**, não fila: quatro brigam lado a lado e o resto se
  empilha atrás, cada fileira mais recuada e mais funda, com ordem de desenho
  pela profundidade. Dezoito bichos deixam de atravessar a tela.
- os inimigos param mais perto do herói (334 contra 372), dentro do alcance do
  golpe em vez de a meio salão.
- o herói **freia** ao chegar: no último quarto da marcha a velocidade do mundo
  cai a zero, então quando a horda encosta ele já está quase parado. Antes o
  cenário corria a plena velocidade e travava seco no primeiro quadro de luta.
- barra de vida só em inimigo já ferido. Com a horda amontoada, vinte barras
  cheias viravam um emaranhado vermelho que escondia os bichos e não
  distinguia nada.

### Notas
Nada disso toca o motor: posição, ritmo e profundidade são de apresentação. O
combate continua resolvido pelo core, que decide quando a luta começa — por
isso os lentos chegam junto no fim em vez de atrasar a onda.

## 0.14 — Cada noite tem a sua fase da lua
PR #53 · 2026-08-14 · @juniozguedes

### Changed
- as dez luas da trilha de noites deixam de ser dez crescentes iguais e passam
  a percorrer o **ciclo lunar inteiro**: foice fina na noite 1, cheia no meio
  do mundo, foice de volta na noite 10. Agora a cor diz o ESTADO (vencida,
  atual, aberta, trancada) e a forma diz QUAL noite é — duas informações em
  canais separados.
- sai o ícone de lua fixo ao lado do rótulo NIGHT: com a fileira de fases ali,
  um crescente genérico só repetia informação.

### Notas
O terminador é uma elipse feita de círculo com `scaleX`, e não de
`borderRadius` em porcentagem: porcentagem em raio só existe na web, e o
desenho precisa valer no iOS e no Android também.

## 0.13 — Trilhas de noite e de onda no HUD, com seleção e loop
PR #52 · 2026-08-14 · @juniozguedes

### Added
- a seção NIGHT vira uma fileira de dez luas, uma por noite do mundo, e cada
  uma é **clicável**: dá para voltar a uma noite já vencida para farmar. Noite
  trancada não responde ao toque. Cor por estado: vencida em cinza avermelhado,
  a de agora acesa com borda, a aberta ainda não vencida em osso, a trancada
  apagada.
- a seção WAVE deixa de ser "2 / 3" e passa a mostrar uma casa por onda da
  noite — três nas noites 1 a 4, cinco nas noites 5 a 10, seguindo o conteúdo.
  Onda vencida em cinza avermelhado, a que está em jogo acesa com borda, a que
  falta em cinza apagado. O estado da noite se lê de relance.
- botão **Loop** no HUD: ligado, a party repete a mesma noite em vez de
  avançar para a próxima ao terminar. Serve a quem quer farmar uma noite
  específica.
- `public/noites.html`, fixture que semeia um save com as noites 1 a 3 vencidas
  e a 4 em curso — é o que permite conferir os quatro estados da trilha de uma
  vez, coisa que um save novo não mostra.

### Fixed
- clicar na lua de uma noite já vencida não fazia nada: a troca chamava
  `start_run` com uma run em andamento, o motor recusa isso, e o erro morria
  num `catch` que só escrevia no console. Nova ação `abandon_run` no core
  encerra a run em curso sem punição — trocar de alvo não é fracassar, e por
  isso não passa pelo `retreat`, que volta uma fase e conta derrota.
- o avanço automático de noite podia disparar duas vezes: as ações são
  assíncronas e o tick continua correndo a cada 250ms, então dois avanços
  concorriam e o segundo batia na mesma guarda. Trava de reentrância.
- falha ao trocar de noite agora aparece na tela em vez de só no console.

### Notas
As dez noites já existiam em conteúdo, com inimigos escalando por noite (ignavo
hp 12 na noite 1, 62 na noite 10). O que fazia parecer existir só a noite 1 era
a progressão quebrada, corrigida na 0.12. Nada de conteúdo novo foi preciso
aqui — só acesso.

## 0.12 — O protótipo vira jogo: Mundo 0 no app, cena fluida e progressão real
PR #51 · 2026-08-14 · @juniozguedes

Fecha o desacoplamento do `prototype/scene.html`: o jogo roda como aplicação
Expo, com o Mundo 0 de verdade, cena em Skia e progressão de noites.

### Added
- sonda de fluidez embutida (`?sonda=1`) e fixtures de save (`/seed.html`,
  `/combate.html`) para conferir o jogo em movimento, não em captura estática
- corpos dos inimigos permanecem no chão e ficam para trás conforme a party
  caminha, dando o cenário sem fim entre as ondas
- ícones de NIGHT / WAVE / GOLD e a fileira SESSION ANALYZER no HUD
- `memory.md`, e a regra no AGENTS.md de alimentá-lo antes de cada PR

### Changed
- o app passa a jogar `WORLD_0_CONTENT` — dez noites, 3 ondas nas noites 1 a 4
  e 5 nas noites 5 a 10 — no lugar do andaime `VESTIBULE_CONTENT`, que tinha
  dez fases de uma onda cada
- relógio da cena em `requestAnimationFrame`; a parede do ossuário é
  rasterizada uma vez para uma imagem. Medido: 20,7 → 59,3 fps, pior quadro de
  868ms para 83ms
- gravação de save deixa de ser por tick; rotina tem intervalo mínimo de 2s e o
  que é progresso grava na hora
- os testes de balanceamento viram testes de funcionamento e relatam a
  fronteira do build de referência; calibre é do time

### Fixed
- mochila cheia travava a run para sempre (`inventory has no available slots`)
- farmar a mesma fase duas vezes derrubava o tick, por id de drop determinístico
- terminada a noite 1, ela recomeçava: o app não escolhia a próxima fase
- vida e mana caíam para 0/0 ao vencer a onda; barra de XP mostrava `431/55`
- o golpe que MATA era o único que não fazia o inimigo piscar
- herói e horda teleportavam na virada da onda; a horda andava em degraus
- números de dano empilhados, desalinhados e ilegíveis atrás da marca de morte

### Notas
Os commits desta branch estão numerados de 0.11 a 0.25 porque tratei cada
commit como uma versão. A regra é uma versão por PR, e a 0.11 já pertence à PR
#50. A versão correta desta entrega é a 0.12; não reescrevi os 20 commits já
publicados por serem branch compartilhada.

O exemplo usa `X.YY` de propósito: um número plausível aqui seria lido como
versão já usada por quem varre o arquivo procurando o próximo livre.

Escreva para quem vai ler daqui a seis meses sem contexto: diga o efeito, não
o arquivo mexido. "Ataques agora acertam no quadro do golpe" vale mais que
"altera `resolveCombat`".

---

## 0.11 — Traduz e dobra as citações do Inferno na tela de morte
PR #50 · 2026-08-13 · @thipintop

### Changed
- As dez citações do Inferno na tela de morte (#49) estavam no italiano
  original. Viram tradução livre para português — mesma citação, mesmo
  personagem, mesma referência, só em PT-BR.

### Added
- Mais dez citações, de dez para vinte no total — inclui Ugolino como novo
  personagem, e uma linha sobre quem "viveu sem honra e sem louvor", a
  descrição de Dante para os habitantes do vestíbulo do Inferno (mesmo nome
  da zona inicial do jogo).

---

## 0.10 — Citações do Inferno na tela de morte
PR #49 · 2026-08-13 · @thipintop

### Changed
- As dez frases da tela de morte (#45) eram genéricas demais. Viram dez
  citações do Inferno de Dante Alighieri, no original em italiano, entre
  aspas e assinadas pelo personagem que as diz no poema — a inscrição do
  portão, Virgílio, Caronte, Francesca da Rimini, Ulisses e o próprio
  Dante. Texto de domínio público desde muito antes de qualquer lei de
  direito autoral existir.

---

## 0.09 — Mais tempo de leitura na morte do herói
PR #48 · 2026-08-13 · @thipintop

### Changed
- O "a carne cede" que sobe ao morrer, e a frase temática no breu (#45),
  não davam tempo de leitura — o breu cobria o primeiro antes de terminar
  de aparecer, e o segundo sumia rápido demais. A queda ganhou 0,3s antes
  do breu cobrir totalmente a cena, e o breu em si ganhou mais 0,3s de
  exibição. O ciclo completo passa de ~2s para ~2,6s — ainda rápido para o
  ritmo idle, agora com peso suficiente para ler as duas frases.

---

## 0.08 — Remove a ilustração da tela de morte
PR #47 · 2026-08-13 · @thipintop

### Added
- **tela de morte portada do protótipo**: queda, breu e retorno, com uma das
  vinte citações do Inferno. As PRs 0.06 e 0.08–0.11 do Thiago tocaram apenas
  `prototype/scene.html` e nunca chegaram ao app — verificado arquivo por
  arquivo nas PRs #44 a #50. O breu não é só estética: é o corte que esconde o
  reposicionamento quando o motor recua a party para uma fase mais rasa.
- `public/morte.html`, fixture que semeia um save fadado à morte.

### Removed
- A ilustração da tela de morte (#45) saiu, junto do crânio procedural que
  servia de fallback dela. Detalhada demais para o tamanho da tela, ficava
  ilegível no render, e a janela da tela de morte é curta demais para uma
  imagem carregada pedir leitura. Fica só a mensagem temática — as dez
  frases continuam girando a cada morte — até haver uma solução de arte que
  caiba no tempo e no espaço disponíveis.

---

## 0.07 — Dev Mode no protótipo
PR #46 · 2026-08-13 · @thipintop

### Added
- Botão "Dev Mode" na barra de controles do protótipo, ao lado de
  "Reiniciar". Abre um painel com comandos para simular situações em tempo
  real sem depender de sorte na simulação: forçar a morte do herói (útil
  para testar o ciclo de queda/breu/retorno sem esperar HP zerar sozinho),
  curar totalmente e pular direto para a próxima fase.
- O painel expande e recolhe com transição suave, e fica inerte (fora do
  foco/tab) quando fechado.

---

## 0.06 — Morte do herói: queda, breu e retorno
PR #45 · 2026-08-13 · @thipintop

### Changed
- Ao esgotar HP sem poção, o herói deixa de andar de costas pela tela. Agora
  ele cai — sprite `Dead.png` do Knight, sem repetir — enquanto os inimigos
  param de atacar e ficam parados olhando (eles só golpeiam durante o
  combate; ao sair dele, simplesmente congelam no lugar).
- A cena esmaece para o breu total junto do colapso. É por baixo do preto que
  o recuo é aplicado — posição, vida, onda — então a câmera pode saltar sem
  ninguém ver o salto.
- No breu, uma ilustração (dança da morte, arte original do dono do jogo) e
  uma mensagem centralizada, uma das dez que giram em ordem a cada morte —
  "A carne cede. O osso permanece." é a primeira. Sem a imagem, um crânio
  procedural com olhos em brasa assume — mesma regra de sempre: nunca perder
  o fallback.
- A cena e o herói reaparecem juntos, o herói entrando gradualmente em
  transparência até visibilidade total, e o jogo retoma o andar sozinho — sem
  qualquer clique do jogador.
- Sequência automática, do início ao fim: ~1,9s, rápida o bastante para não
  travar o ritmo idle, longa o bastante para ter peso.

A regra por trás continua a mesma de sempre (core-design §3.3): a party não
morre de verdade, recua para a última fase limpa. Só a apresentação mudou.

---

## 0.05 — Loot: itens caem, entram na mochila e se equipam
PR #44 · 2026-08-13 · @thipintop

### Added
- Cada onda limpa solta uma peça. A tabela é por fase, e nas fases 3 e 7 o
  drop é **garantido**: a Foice e a Ceifa são o que dá alcance, e as fases
  seguintes contam com elas.
- Peça que cai em slot vazio é **vestida na hora**. Slot ocupado nunca é
  substituído — num jogo idle, esperar o jogador abrir a mochila é apostar
  contra a proposta, mas desfazer escolha dele é pior.
- A mochila mostra o que guardou, com a inicial na cor da raridade, e uma
  faixa de equipados diz de onde vem cada ganho.
- O drop aparece em cena: nome do item na cor da raridade, e "equipado"
  quando entra direto.

### Changed
- Dano e vigor passam a somar o que está vestido.
- **Alcance vem só de arma.** Antes saía de DEX e INT, e subia sozinho; agora
  é a Foice da fase 3 que o dobra, o que faz dela um marco em vez de um
  número que muda sem motivo visível.

---

## 0.04 — Gasto de poção sai de cima do herói
PR #43 · 2026-08-13 · @juniozguedes

### Changed
- O gasto com poção não sobe mais como número vermelho sobre o herói. Um
  `−50` vermelho no meio do combate lia como dano recebido.
- Passa a aparecer **embaixo do ouro**, em âmbar apagado, ao lado do saldo que
  acabou de cair. Gastos seguidos somam num só indicador em vez de piscar.
- O ouro já caía em tempo real; agora o indicador nomeia o quanto saiu.

### Fixed
- O exemplo de formato deste arquivo usava `0.07`, um número plausível que
  seria lido como versão ocupada por quem varre o arquivo procurando a
  próxima livre. Virou `X.YY`.

---

## 0.04 — Ondas compostas por espécie
PR #39 · 2026-08-13 · @thipintop

### Changed
- As ondas deixam de ser cinco inimigos iguais e passam a ter composição por
  fase, a mesma do Mundo 0. Moscardos entram na fase 3, Marcados na 5, Gorjas
  na 6, Encalhados na 9 e Caronte na 10.
- Cada espécie briga do seu jeito: o Moscardo telegrafa quase três vezes mais
  rápido por metade do dano, a Gorja se cura com 30% do que causa, e o
  Encalhado corta 72% do golpe recebido — ele custa tempo, não vida.
- Os inimigos de uma onda entram misturados. Em blocos, o herói limpava uma
  espécie inteira antes de encostar na outra, e a onda não lia como bando.
- Ondas grandes cabem no quadro: o espaçamento aperta conforme a fila cresce.

### Fixed
- O indicador de fase deixa de mentir. Ele anunciava "Fase 3" enquanto a cena
  mandava os mesmos Ignavos da fase 1.
- O pisca branco de dano funciona para qualquer espécie, e não só para a
  paleta do Ignavo.

---

## 0.03 — Política de changelog
PR #42 · 2026-08-13 · @juniozguedes

### Added
- Este arquivo. Cada PR passa a ser uma versão, numerada e registrada aqui.
- Regra correspondente no `AGENTS.md`: a versão vem da última PR mergeada,
  o changelog é escrito no corpo da PR, e todo commit começa pelo número.

---

## Antes da numeração — PRs #3 a #41

As PRs **#1 (0.01)** e **#2 (0.02)** foram numeradas sob um esquema anterior,
em que uma versão correspondia a uma release inteira acumulada na branch
`dev`. Esse modelo foi abandonado quando o fluxo virou uma branch por tarefa,
e com ele a numeração parou.

Entre a #3 e a #41, **36 PRs entraram sem versão**. Não vale reconstruir esses
números depois do fato: seria adivinhação com cara de registro. O histórico
desse período está no git, e é a fonte confiável para ele:

```bash
git log --oneline --merges origin/main
gh pr list --state merged --limit 60
```

O que entrou nesse intervalo, em blocos: scaffold do monorepo Expo e CI,
domínios de item, equipamento, party, inventário, XP, spells, economia,
ossuário e combate no `packages/core`, o laboratório de mecânicas, e no
protótipo o cenário do ossuário, sprites de cavaleiro e Ignavo, inventário
e atributos em pop-up, feedback de acerto e turnos de auto attack.

---

## 0.02 — Inventário, poções, atributos e progressão
PR #2 · 2026-08-11 · @juniozguedes

Esquema antigo, uma versão por release.

## 0.01 — Fundação: core design, Mundo 0 e processo
PR #1 · 2026-08-11 · @juniozguedes

Esquema antigo, uma versão por release.

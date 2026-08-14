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

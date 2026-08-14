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

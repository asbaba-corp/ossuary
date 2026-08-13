# Changelog

Histórico de mudanças do Ossuary. **Cada PR é uma versão.**

Entradas em ordem decrescente: a mais recente primeiro. Regras de escrita e
numeração vivem no `AGENTS.md`, seção *Changelog*.

Formato de cada entrada:

```
## 0.07 — Título curto do que mudou
PR #52 · 2026-08-14 · @autor

### Added / Changed / Fixed / Removed
- ...
```

Escreva para quem vai ler daqui a seis meses sem contexto: diga o efeito, não
o arquivo mexido. "Ataques agora acertam no quadro do golpe" vale mais que
"altera `resolveCombat`".

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

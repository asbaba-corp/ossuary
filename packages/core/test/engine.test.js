/**
 * Fixa o comportamento observável do motor de combate ANTES de alterar o laço
 * de ataque para suportar alcance. O que importa aqui não é a matemática — essa
 * está em damage.test.ts — e sim o CONTRATO: quantos eventos saem por tick,
 * em que ordem, e quando a batalha resolve.
 *
 * `session.ts`, `game-state.ts` e o laboratório leem esse fluxo de eventos. Se
 * ele mudar de forma, eles quebram em silêncio.
 *
 * JavaScript importando o `dist/` pelo mesmo motivo de damage.test.js: rodar
 * em qualquer versão de Node, inclusive a 22 fixada no CI.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createCombatState,
  advanceCombatTick,
  resolveCombat,
} from "../dist/combat/engine.js";
import { createCombatContentContext } from "../dist/combat/content.js";

const REGRAS = { tickSeconds: 0.25, defenseConstant: 100 };
const SEM_MAGIA = createCombatContentContext([]);

const stats = (parcial = {}) => ({
  maxHp: 100,
  damage: 10,
  defense: 0,
  penetration: 0,
  attacksPerSecond: 1,
  criticalChancePercent: 0,
  criticalMultiplier: 2,
  sustainPercent: 0,
  ...parcial,
});

const heroi = (parcial = {}) =>
  ({ id: "p1", name: "Herói", side: "party", stats: stats(parcial) });

const inimigo = (id, parcial = {}) =>
  ({ id, name: id, side: "enemy", stats: stats(parcial) });

test("estado inicial começa zerado e em andamento", () => {
  const estado = createCombatState([heroi(), inimigo("e1")], "seed");
  assert.equal(estado.tick, 0);
  assert.equal(estado.elapsedSeconds, 0);
  assert.equal(estado.outcome, "in_progress");
  assert.equal(estado.combatants.length, 2);
  assert.equal(estado.combatants[0].hp, 100);
});

/* CONTRATO CENTRAL: hoje o atacante mira UM alvo por tick. É exatamente isto
   que a implementação de alcance vai mudar — quando mudar, este teste tem de
   ser reescrito de propósito, não quebrar por acidente. */
test("cada atacante gera no máximo um evento de ataque por tick", () => {
  const estado = createCombatState([heroi(), inimigo("e1"), inimigo("e2"), inimigo("e3")], "seed");
  const { events } = advanceCombatTick(estado, REGRAS, SEM_MAGIA);
  const doHeroi = events.filter((e) => e.type === "attack" && e.attackerId === "p1");
  assert.equal(doHeroi.length, 1);
});

test("o alvo do herói é um só, mesmo com vários inimigos vivos", () => {
  const estado = createCombatState([heroi(), inimigo("e1"), inimigo("e2")], "seed");
  const { state } = advanceCombatTick(estado, REGRAS, SEM_MAGIA);
  const feridos = state.combatants.filter((c) => c.snapshot.side === "enemy" && c.hp < 100);
  assert.equal(feridos.length, 1);
});

test("ataque só sai quando o cooldown zera", () => {
  // 1 ataque/s com tick de 0,25s: o golpe sai, e nos 3 ticks seguintes não sai
  let estado = createCombatState([heroi(), inimigo("e1", { attacksPerSecond: 0 })], "seed");
  const primeiro = advanceCombatTick(estado, REGRAS, SEM_MAGIA);
  assert.equal(primeiro.events.filter((e) => e.type === "attack").length, 1);
  estado = primeiro.state;
  for (let i = 0; i < 3; i += 1) {
    const passo = advanceCombatTick(estado, REGRAS, SEM_MAGIA);
    assert.equal(passo.events.filter((e) => e.type === "attack").length, 0);
    estado = passo.state;
  }
});

test("quem tem cadência zero nunca ataca", () => {
  const estado = createCombatState([heroi({ attacksPerSecond: 0 }), inimigo("e1", { attacksPerSecond: 0 })], "seed");
  const { events } = advanceCombatTick(estado, REGRAS, SEM_MAGIA);
  assert.equal(events.filter((e) => e.type === "attack").length, 0);
});

test("morte emite combatant_defeated com o id certo", () => {
  const estado = createCombatState(
    [heroi({ damage: 500 }), inimigo("e1", { maxHp: 10, attacksPerSecond: 0 })],
    "seed",
  );
  const { events } = advanceCombatTick(estado, REGRAS, SEM_MAGIA);
  const mortes = events.filter((e) => e.type === "combatant_defeated");
  assert.equal(mortes.length, 1);
  assert.equal(mortes[0].combatantId, "e1");
});

test("vitória quando o último inimigo cai, e o evento de outcome fecha o tick", () => {
  const estado = createCombatState(
    [heroi({ damage: 500 }), inimigo("e1", { maxHp: 10, attacksPerSecond: 0 })],
    "seed",
  );
  const { state, events } = advanceCombatTick(estado, REGRAS, SEM_MAGIA);
  assert.equal(state.outcome, "victory");
  const ultimo = events[events.length - 1];
  assert.equal(ultimo.type, "outcome");
  assert.equal(ultimo.outcome, "victory");
});

test("derrota quando a party cai", () => {
  const estado = createCombatState(
    [heroi({ maxHp: 5, attacksPerSecond: 0 }), inimigo("e1", { damage: 500 })],
    "seed",
  );
  const { state } = advanceCombatTick(estado, REGRAS, SEM_MAGIA);
  assert.equal(state.outcome, "defeat");
});

test("estado resolvido não avança mais", () => {
  const estado = createCombatState(
    [heroi({ damage: 500 }), inimigo("e1", { maxHp: 10, attacksPerSecond: 0 })],
    "seed",
  );
  const vencido = advanceCombatTick(estado, REGRAS, SEM_MAGIA).state;
  const depois = advanceCombatTick(vencido, REGRAS, SEM_MAGIA);
  assert.equal(depois.events.length, 0);
  assert.equal(depois.state.tick, vencido.tick);
});

test("resolveCombat respeita o teto de ticks e sinaliza quando não completou", () => {
  // alvo com vida alta demais para cair dentro do teto — e não imortal:
  // desde o piso de mitigação, nenhuma defesa zera o dano
  const estado = createCombatState(
    [heroi(), inimigo("e1", { maxHp: 100000, attacksPerSecond: 0 })],
    "seed",
  );
  const r = resolveCombat(estado, REGRAS, 20, SEM_MAGIA);
  assert.equal(r.completed, false);
  assert.equal(r.state.outcome, "in_progress");
  assert.equal(r.state.tick, 20);
});

/* O motivo de o piso existir: antes dele, defesa alta travava a batalha para
   sempre. Este caso prova que agora ela resolve, ainda que devagar. */
test("defesa altíssima atrasa mas não impede a vitória", () => {
  const estado = createCombatState(
    [heroi({ damage: 100 }), inimigo("e1", { maxHp: 20, defense: 500, attacksPerSecond: 0 })],
    "seed",
  );
  const r = resolveCombat(estado, REGRAS, 2000, SEM_MAGIA);
  assert.equal(r.completed, true);
  assert.equal(r.state.outcome, "victory");
});

test("resolveCombat termina sozinho quando há vencedor", () => {
  const estado = createCombatState(
    [heroi({ damage: 30 }), inimigo("e1", { maxHp: 60, attacksPerSecond: 0 })],
    "seed",
  );
  const r = resolveCombat(estado, REGRAS, 500, SEM_MAGIA);
  assert.equal(r.completed, true);
  assert.equal(r.state.outcome, "victory");
});

test("a mesma seed produz a mesma batalha", () => {
  const montar = () => createCombatState(
    [heroi({ criticalChancePercent: 50 }), inimigo("e1", { maxHp: 200 })],
    "seed-fixa",
  );
  const a = resolveCombat(montar(), REGRAS, 100, SEM_MAGIA);
  const b = resolveCombat(montar(), REGRAS, 100, SEM_MAGIA);
  assert.equal(a.events.length, b.events.length);
  assert.deepEqual(a.state.combatants.map((c) => c.hp), b.state.combatants.map((c) => c.hp));
});

test("o tempo decorrido acompanha o tick", () => {
  let estado = createCombatState([heroi({ maxHp: 9999 }), inimigo("e1", { maxHp: 9999 })], "seed");
  for (let i = 0; i < 4; i += 1) estado = advanceCombatTick(estado, REGRAS, SEM_MAGIA).state;
  assert.equal(estado.tick, 4);
  assert.equal(estado.elapsedSeconds, 1);
});

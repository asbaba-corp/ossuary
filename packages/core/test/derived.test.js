/**
 * Cobre o papel de cada atributo, fechado com o dono do jogo:
 *   STR  dano e penetração    CONS vida
 *   DEX  cadência e crítico   INT  mana e dano mágico
 *
 * Dois casos são deliberadamente negativos: nenhum atributo concede `sustain`
 * e nenhum concede `reach`. Eles existem para que uma mudança de fórmula que
 * volte a ligar esses derivados a um atributo apareça na revisão.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculateCharacterDerivedStats } from "../dist/progression/derived.js";
import { OSSUARY_DERIVED_STATS } from "../dist/ossuary.js";
import { VERTICAL_FIXTURE_CONTENT } from "../dist/vertical-fixture.js";

const FORMULAS = VERTICAL_FIXTURE_CONTENT.derivedStatFormulas;
const SEM_OSSUARIO = Object.fromEntries(OSSUARY_DERIVED_STATS.map((id) => [id, 0]));

const derivar = (attrs, weaponBaseDamage = 0) =>
  calculateCharacterDerivedStats({
    attributes: { cons: 5, str: 6, dex: 5, int: 4, ...attrs },
    weaponBaseDamage,
    formulas: FORMULAS,
    ossuaryBonuses: SEM_OSSUARIO,
  }).effective;

test("CONS vira vida na proporção de 10 por ponto", () => {
  assert.equal(derivar({ cons: 5 }).vigor, 50);
  assert.equal(derivar({ cons: 12 }).vigor, 120);
});

test("STR vira dano e penetração", () => {
  const d = derivar({ str: 10 });
  assert.equal(d.damage, 20);
  assert.equal(d.penetration, 10);
});

test("DEX vira cadência", () => {
  assert.equal(derivar({ dex: 5 }).cadence, 1.5);
  assert.equal(derivar({ dex: 20 }).cadence, 3);
});

test("DEX vira chance de crítico, um por cento por ponto", () => {
  assert.equal(derivar({ dex: 5 }).critical, 5);
  assert.equal(derivar({ dex: 23 }).critical, 23);
});

test("INT vira mana", () => {
  assert.equal(derivar({ int: 4 }).mana, 38);
  assert.equal(derivar({ int: 20 }).mana, 70);
});

test("INT vira dano mágico, três por cento por ponto", () => {
  assert.equal(derivar({ int: 4 }).spellDamage, 12);
  assert.equal(derivar({ int: 20 }).spellDamage, 60);
});

/* Decisão do dono: roubo de vida não é build do jogador. O stat continua
   existindo para o inimigo — é o dreno que define a Gorja. */
test("nenhum atributo concede sustain", () => {
  for (const attr of ["cons", "str", "dex", "int"]) {
    assert.equal(derivar({ [attr]: 50 }).sustain, 0, `${attr} não deve dar sustain`);
  }
});

/* Alcance vem de arma, não de ponto de atributo. */
test("nenhum atributo concede alcance, e a base é 1", () => {
  assert.equal(derivar({}).reach, 1);
  for (const attr of ["cons", "str", "dex", "int"]) {
    assert.equal(derivar({ [attr]: 50 }).reach, 1, `${attr} não deve dar alcance`);
  }
});

test("o dano base da arma soma ao dano derivado", () => {
  assert.equal(derivar({ str: 10 }, 0).damage, 20);
  assert.equal(derivar({ str: 10 }, 7).damage, 27);
});

test("o ossuário aplica bônus percentual sobre o derivado", () => {
  const comBonus = calculateCharacterDerivedStats({
    attributes: { cons: 10, str: 6, dex: 5, int: 4 },
    weaponBaseDamage: 0,
    formulas: FORMULAS,
    ossuaryBonuses: { ...SEM_OSSUARIO, vigor: 50 },
  });
  assert.equal(comBonus.base.vigor, 100);
  assert.equal(comBonus.effective.vigor, 150);
});

test("todo derivado declarado tem fórmula", () => {
  for (const stat of OSSUARY_DERIVED_STATS) {
    assert.ok(FORMULAS[stat], `falta fórmula para ${stat}`);
  }
});

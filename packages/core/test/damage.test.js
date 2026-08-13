/**
 * Primeira suíte do projeto. Roda no `node --test` nativo — sem runner, sem
 * dependência, sem mexer no lockfile.
 *
 * Os testes são JavaScript e importam o `dist/`, não o fonte: a remoção de
 * tipos do Node só é padrão a partir do 22.18, e o CI fixa `node-version: 22`.
 * Em JS eles rodam em qualquer versão, e de quebra exercitam exatamente o que
 * é publicado.
 *
 * O alvo aqui é a conta de dano, onde mora a regra mais sensível do
 * balanceamento: mitigação por defesa e penetração. A parede do Mundo 0 vive
 * ou morre nesta função.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculateCombatDamage } from "../dist/combat/damage.js";

const REGRAS = { tickSeconds: 0.25, defenseConstant: 100 };

const stats = (parcial = {}) => ({
  maxHp: 100,
  damage: 20,
  defense: 0,
  penetration: 0,
  attacksPerSecond: 1,
  criticalChancePercent: 0,
  criticalMultiplier: 2,
  sustainPercent: 0,
  ...parcial,
});

const combatente = (id, parcial = {}) => ({
  id,
  name: id,
  side: id.startsWith("p") ? "party" : "enemy",
  stats: stats(parcial),
});

test("sem defesa, o dano sai inteiro", () => {
  const r = calculateCombatDamage(combatente("p1"), combatente("e1"), REGRAS, "seed");
  assert.equal(r.damage, 20);
  assert.equal(r.critical, false);
});

test("defesa reduz proporcionalmente ao defenseConstant", () => {
  // defesa 50 contra constante 100 => metade do dano
  const r = calculateCombatDamage(combatente("p1"), combatente("e1", { defense: 50 }), REGRAS, "seed");
  assert.equal(r.damage, 10);
});

test("penetração desconta da defesa antes da mitigação", () => {
  const r = calculateCombatDamage(
    combatente("p1", { penetration: 30 }),
    combatente("e1", { defense: 50 }),
    REGRAS,
    "seed",
  );
  // 50 - 30 = 20 de defesa efetiva => 80% do dano
  assert.equal(r.damage, 16);
});

test("penetração acima da defesa não gera bônus", () => {
  const r = calculateCombatDamage(
    combatente("p1", { penetration: 90 }),
    combatente("e1", { defense: 50 }),
    REGRAS,
    "seed",
  );
  assert.equal(r.damage, 20);
});

/* Antes do piso, defesa >= defenseConstant + penetração zerava o dano: alvo
   imortal e combate sem saída. O Encalhado do Mundo 0 tem defesa 106 contra
   penetração inicial 6, exatamente esse caso. */
test("defesa igual ao defenseConstant não zera mais o dano", () => {
  const r = calculateCombatDamage(
    combatente("p1"),
    combatente("e1", { defense: 100 }),
    REGRAS,
    "seed",
  );
  assert.equal(r.damage, 1);   // piso de 5% sobre 20 de dano
});

test("defesa absurda ainda deixa passar o piso", () => {
  const r = calculateCombatDamage(
    combatente("p1"),
    combatente("e1", { defense: 100000 }),
    REGRAS,
    "seed",
  );
  assert.equal(r.damage, 1);
});

test("o piso é configurável pelas regras", () => {
  const r = calculateCombatDamage(
    combatente("p1"),
    combatente("e1", { defense: 100 }),
    { ...REGRAS, minimumMitigation: 0.5 },
    "seed",
  );
  assert.equal(r.damage, 10);
});

test("piso zero reproduz o comportamento antigo", () => {
  const r = calculateCombatDamage(
    combatente("p1"),
    combatente("e1", { defense: 100 }),
    { ...REGRAS, minimumMitigation: 0 },
    "seed",
  );
  assert.equal(r.damage, 0);
});

test("piso inválido é rejeitado", () => {
  assert.throws(
    () => calculateCombatDamage(
      combatente("p1"),
      combatente("e1"),
      { ...REGRAS, minimumMitigation: 1.5 },
      "seed",
    ),
    RangeError,
  );
});

test("sustain devolve uma fração do dano causado", () => {
  const r = calculateCombatDamage(
    combatente("p1", { sustainPercent: 25 }),
    combatente("e1"),
    REGRAS,
    "seed",
  );
  assert.equal(r.damage, 20);
  assert.equal(r.healing, 5);
});

test("sem sustain não há cura", () => {
  const r = calculateCombatDamage(combatente("p1"), combatente("e1"), REGRAS, "seed");
  assert.equal(r.healing, 0);
});

test("crítico de 100% aplica o multiplicador", () => {
  const r = calculateCombatDamage(
    combatente("p1", { criticalChancePercent: 100, criticalMultiplier: 3 }),
    combatente("e1"),
    REGRAS,
    "seed",
  );
  assert.equal(r.critical, true);
  assert.equal(r.damage, 60);
});

test("a mesma seed devolve sempre o mesmo resultado", () => {
  const atacante = combatente("p1", { criticalChancePercent: 50 });
  const alvo = combatente("e1");
  const a = calculateCombatDamage(atacante, alvo, REGRAS, "seed-fixa");
  const b = calculateCombatDamage(atacante, alvo, REGRAS, "seed-fixa");
  assert.deepEqual(a, b);
});

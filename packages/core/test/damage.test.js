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

/* Este é o caso que motivou o piso: com defesa >= 100 + penetração a mitigação
   zera, o alvo fica imortal e o combate não resolve. O Encalhado do Mundo 0
   tem defesa 106 e a penetração inicial do herói é 6. */
test("defesa igual ao defenseConstant zera o dano — motivo do piso", () => {
  const r = calculateCombatDamage(
    combatente("p1"),
    combatente("e1", { defense: 100 }),
    REGRAS,
    "seed",
  );
  assert.equal(r.damage, 0);
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

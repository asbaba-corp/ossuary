/**
 * Prova o caminho completo do alcance: arma no loadout -> stats efetivos ->
 * snapshot de combate -> laço de ataque do motor.
 *
 * O derivado dá a base 1 e a arma soma alvos por cima. Nenhum atributo
 * concede alcance, então sem arma o personagem sempre bate em um alvo só.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../dist/character.js";
import {
  createEquipment,
  createCharacterLoadout,
  equipEquipment,
} from "../dist/equipment/legacy.js";
import { createCombatantFromCharacter } from "../dist/combat/character-adapter.js";
import { createCombatState, advanceCombatTick } from "../dist/combat/engine.js";
import { createCombatContentContext } from "../dist/combat/content.js";
import { createSpellLoadout } from "../dist/spell-loadout.js";
import { OSSUARY_DERIVED_STATS } from "../dist/ossuary.js";
import { VERTICAL_FIXTURE_CONTENT } from "../dist/vertical-fixture.js";

const FORMULAS = VERTICAL_FIXTURE_CONTENT.derivedStatFormulas;
const SEM_OSSUARIO = Object.fromEntries(OSSUARY_DERIVED_STATS.map((id) => [id, 0]));
const REGRAS = { tickSeconds: 0.25, defenseConstant: 100 };
const SEM_MAGIA = createCombatContentContext([]);

const arma = (id, reachBonus) =>
  createEquipment(id, id, "weapon", {}, { instanceId: id, stats: { baseDamage: 5, reachBonus } });

function snapshotCom(equipamento) {
  const personagem = createCharacter("p1", "Herói");
  let loadout = createCharacterLoadout("p1");
  if (equipamento) loadout = equipEquipment(loadout, equipamento);
  return createCombatantFromCharacter({
    character: personagem,
    equipment: loadout,
    spells: createSpellLoadout(3),
    itemEffects: { activeEffects: [] },
    formulas: FORMULAS,
    ossuaryBonuses: SEM_OSSUARIO,
    side: "party",
  });
}

test("sem arma, o alcance é 1", () => {
  assert.equal(snapshotCom(null).stats.reach, 1);
});

test("arma sem bônus mantém alcance 1", () => {
  assert.equal(snapshotCom(arma("lamina", 0)).stats.reach, 1);
});

test("a foice soma um alvo — alcance 2", () => {
  assert.equal(snapshotCom(arma("foice", 1)).stats.reach, 2);
});

test("a ceifa soma dois alvos — alcance 3", () => {
  assert.equal(snapshotCom(arma("ceifa", 2)).stats.reach, 3);
});

/* O que importa de verdade: o alcance da arma chega ao laço de ataque. */
test("a arma faz o golpe varrer no combate", () => {
  const heroi = snapshotCom(arma("foice", 2));
  const alvo = (id) => ({
    id,
    name: id,
    side: "enemy",
    stats: {
      maxHp: 100, damage: 1, defense: 0, penetration: 0,
      attacksPerSecond: 0, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0,
    },
  });
  const estado = createCombatState([heroi, alvo("e1"), alvo("e2"), alvo("e3"), alvo("e4")], "seed");
  const { state, events } = advanceCombatTick(estado, REGRAS, SEM_MAGIA);
  assert.equal(events.filter((e) => e.type === "attack" && e.attackerId === "p1").length, 3);
  const feridos = state.combatants.filter((c) => c.snapshot.side === "enemy" && c.hp < 100);
  assert.equal(feridos.length, 3);
});

test("trocar a arma muda o alcance sem tocar no personagem", () => {
  assert.equal(snapshotCom(arma("lamina", 0)).stats.reach, 1);
  assert.equal(snapshotCom(arma("ceifa", 2)).stats.reach, 3);
});

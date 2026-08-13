import { createConsumable, createEquipment, createItemStack, type EquipmentDropEntry } from "./equipment.js";
import type { DerivedStatFormulas } from "./progression/derived.js";
import type { GameContentContext } from "./game-content.js";

/**
 * Papel de cada atributo, fechado com o dono do jogo:
 *   STR  dano e penetração — o primário do Mundo 0
 *   CONS vida
 *   DEX  cadência e crítico
 *   INT  mana e dano mágico
 *
 * `sustain` fica sem atributo de propósito: nenhum ponto do jogador concede
 * roubo de vida. O campo continua existindo porque é ele que define a Gorja,
 * que cura o que causa de dano.
 *
 * `reach` sai de arma, não de atributo, e por isso tem base 1 e coeficiente 0.
 */
const formulas: DerivedStatFormulas = {
  vigor:       { base: 0,  attribute: "cons", coefficient: 10 },
  // `includeWeaponBaseDamage` faltava: o dano da arma era passado ao cálculo
  // e descartado, então nenhuma arma alterava o dano em combate
  damage:      { base: 0,  attribute: "str",  coefficient: 2, includeWeaponBaseDamage: true },
  penetration: { base: 0,  attribute: "str",  coefficient: 1 },
  cadence:     { base: 1,  attribute: "dex",  coefficient: 0.1 },
  critical:    { base: 0,  attribute: "dex",  coefficient: 1 },
  reach:       { base: 1,  attribute: null,   coefficient: 0 },
  sustain:     { base: 0,  attribute: null,   coefficient: 0 },
  mana:        { base: 30, attribute: "int",  coefficient: 2 },
  spellDamage: { base: 0,  attribute: "int",  coefficient: 3 },
};
const sword = createEquipment("fixture-sword", "Lâmina do teste", "weapon", {}, { instanceId: "fixture-sword", stats: { baseDamage: 3 } });
export const VERTICAL_FIXTURE_CONSUMABLE = createConsumable("fixture-potion", "Poção de teste");
export const VERTICAL_FIXTURE_DROP_TABLE: readonly EquipmentDropEntry[] = [{ equipment: sword, rarity: "common", weight: 1, attributeRollPools: { str: [0] } }];

export const VERTICAL_FIXTURE_CONTENT: GameContentContext = {
  version: "fixture-1",
  phases: [
    { id: "fixture-phase-0", order: 0, waveIds: ["fixture-wave-0", "fixture-wave-1"], nextPhaseId: "fixture-phase-1", retreatPhaseId: null },
    { id: "fixture-phase-1", order: 1, waveIds: ["fixture-wave-boss"], nextPhaseId: null, retreatPhaseId: "fixture-phase-0" },
  ],
  waves: [
    { id: "fixture-wave-0", enemyIds: ["fixture-rat"], dropTableId: "fixture-drops", xpReward: 60, goldReward: 3, consumableRuleId: "fixture-potion-cost" },
    { id: "fixture-wave-1", enemyIds: ["fixture-rat"], dropTableId: "fixture-drops", xpReward: 60, goldReward: 3, consumableRuleId: "fixture-potion-cost" },
    { id: "fixture-wave-boss", enemyIds: ["fixture-guardian"], dropTableId: "fixture-drops", xpReward: 10, goldReward: 1, consumableRuleId: null },
  ],
  enemies: [
    { id: "fixture-rat", name: "Rato de osso", stats: { maxHp: 8, damage: 1, defense: 0, penetration: 0, attacksPerSecond: 0.5, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 } },
    { id: "fixture-guardian", name: "Guardião do teste", stats: { maxHp: 999, damage: 999, defense: 0, penetration: 0, attacksPerSecond: 2, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 } },
  ],
  spells: [], dropTables: [{ id: "fixture-drops", entries: VERTICAL_FIXTURE_DROP_TABLE }],
  consumables: [{ id: "fixture-potion-cost", itemId: VERTICAL_FIXTURE_CONSUMABLE.id, quantity: 1, goldCost: 1 }],
  combatRules: { tickSeconds: 0.25, defenseConstant: 100 }, rewardRules: { goldResourceId: "gold" }, runRules: { walkingMs: 1000, offlineCapMs: 12 * 60 * 60 * 1000, checkpointEveryWave: true }, derivedStatFormulas: formulas,
};

export function addFixtureStartingItems<T extends { readonly inventory: { readonly capacity: number; readonly items: readonly import("./equipment.js").ItemStack[] } }>(state: T): T {
  return { ...state, inventory: { ...state.inventory, items: [createItemStack(VERTICAL_FIXTURE_CONSUMABLE, 2)] } };
}

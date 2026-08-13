import { createEquipment, type EquipmentDropEntry } from "./equipment.js";
import type { DerivedStatFormulas } from "./progression/derived.js";
import type { GameContentContext } from "./game-content.js";
import type { SpellDefinition } from "./spells.js";

const formulas: DerivedStatFormulas = {
  vigor: { base: 0, attribute: "cons", coefficient: 14 },
  damage: { base: 6, attribute: "str", coefficient: 1.7, includeWeaponBaseDamage: true },
  penetration: { base: 0, attribute: "str", coefficient: 0.9 },
  cadence: { base: 0.78, attribute: "dex", coefficient: 0.035 },
  critical: { base: 0.03, attribute: "dex", coefficient: 0.8 },
  reach: { base: 1, attribute: "dex", coefficient: 0.07 },
  sustain: { base: 0, attribute: "int", coefficient: 0.6 },
  mana: { base: 18, attribute: "int", coefficient: 9 },
};

const sword = createEquipment("vestibule-sword", "Lâmina do Vestíbulo", "weapon", { str: 1 }, { rarity: "common", instanceId: "vestibule-sword", stats: { baseDamage: 2 } });
const shield = createEquipment("vestibule-shield", "Escudo de limo", "shield", { cons: 1 }, { rarity: "rare", instanceId: "vestibule-shield" });
const drops: readonly EquipmentDropEntry[] = [
  { equipment: sword, rarity: "common", weight: 8, attributeRollPools: { str: [0, 1, 2] } },
  { equipment: shield, rarity: "rare", weight: 2, attributeRollPools: { cons: [0, 1] } },
];

const spells: readonly SpellDefinition[] = [{
  id: "vestibule-ember-bolt",
  name: "Raio de brasa",
  archetype: "damage",
  manaCost: 20,
  cooldown: 4,
  trigger: { kind: "enemyCount", min: 2 },
  effect: { kind: "damage", damageType: "arcano", target: "um inimigo" },
  scaling: { basePower: 18, intCoefficient: 2 },
}];

const enemies = [
  ["ignavo", "Ignavo", { maxHp: 26, damage: 3, defense: 0, penetration: 0, attacksPerSecond: 0.87, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 }],
  ["moscardo", "Moscardo", { maxHp: 12, damage: 2, defense: 2, penetration: 0, attacksPerSecond: 2.5, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 }],
  ["gorja", "Gorja", { maxHp: 70, damage: 7, defense: 8, penetration: 0, attacksPerSecond: 0.5, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0.35 }],
  ["encalhado", "Encalhado", { maxHp: 120, damage: 1, defense: 80, penetration: 0, attacksPerSecond: 0.33, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 }],
  ["marcado", "Marcado", { maxHp: 180, damage: 15, defense: 10, penetration: 0, attacksPerSecond: 0.71, criticalChancePercent: 5, criticalMultiplier: 2, sustainPercent: 0 }],
  ["caronte", "Caronte", { maxHp: 650, damage: 25, defense: 35, penetration: 10, attacksPerSecond: 0.56, criticalChancePercent: 10, criticalMultiplier: 2, sustainPercent: 0 }],
] as const;

const enemyDefinitions = enemies.map(([id, name, stats]) => ({ id, name, stats }));
const phaseEnemyIds: readonly (readonly string[])[] = [
  ["ignavo", "ignavo", "ignavo", "ignavo", "ignavo"],
  ["ignavo", "ignavo", "ignavo", "ignavo", "moscardo"],
  ["ignavo", "ignavo", "moscardo", "moscardo", "moscardo"],
  ["ignavo", "moscardo", "moscardo", "moscardo", "gorja"],
  ["gorja", "gorja", "moscardo", "moscardo"],
  ["moscardo", "moscardo", "gorja", "gorja"],
  ["moscardo", "gorja", "gorja", "gorja"],
  ["marcado"], ["encalhado"], ["encalhado", "gorja", "caronte"],
];

export const VESTIBULE_CONTENT: GameContentContext = {
  version: "vestibule-1",
  phases: phaseEnemyIds.map((_, index) => ({
    id: `vestibule-phase-${index + 1}`,
    order: index,
    waveIds: [`vestibule-wave-${index + 1}`],
    nextPhaseId: index < 9 ? `vestibule-phase-${index + 2}` : null,
    retreatPhaseId: index === 0 ? null : `vestibule-phase-${index}`,
  })),
  waves: phaseEnemyIds.map((enemyIds, index) => ({
    id: `vestibule-wave-${index + 1}`,
    enemyIds,
    dropTableId: "vestibule-drops",
    xpReward: 12 + index * 4,
    goldReward: 8 + index * 3,
    consumableRuleId: null,
  })),
  enemies: enemyDefinitions,
  spells,
  dropTables: [{ id: "vestibule-drops", entries: drops }],
  consumables: [],
  combatRules: { tickSeconds: 0.25, defenseConstant: 100 },
  rewardRules: { goldResourceId: "gold" },
  runRules: { walkingMs: 1800, offlineCapMs: 12 * 60 * 60 * 1000, checkpointEveryWave: true },
  derivedStatFormulas: formulas,
  startingEquipment: [sword],
  startingGold: 150,
  ossuaryUpgrades: [{
    id: "vestibule-first-bone",
    name: "Fragmento do Vestíbulo",
    requirements: [{ kind: "bones", amount: 1 }],
    bonuses: [{ stat: "penetration", percent: 8 }],
  }],
};

import type { CombatRules, CombatantSnapshot, DerivedStatFormulas, Equipment, EquipmentDropEntry, ItemStack, OssuaryUpgradeDefinition, SpellDefinition } from '@ossuary/core';
import {
  createAttributeBonusEffect,
  createConsumable,
  createEquipment,
  createItemStack,
  createSpellLoadout,
  equipSpell,
} from '@ossuary/core';

export const TEST_SPELLS: readonly SpellDefinition[] = [
  {
    id: 'lab-ember-bolt',
    name: 'Raio de brasa',
    archetype: 'damage',
    manaCost: 20,
    cooldown: 4,
    trigger: { kind: 'cooldown' },
    effect: { kind: 'damage', damageType: 'arcano', target: 'um inimigo' },
    scaling: { basePower: 18, intCoefficient: 2 },
  },
  {
    id: 'lab-bone-aegis',
    name: 'Égide de osso',
    archetype: 'protection',
    manaCost: 30,
    cooldown: 8,
    trigger: { kind: 'hpBelow', thresholdPercent: 45 },
    effect: { kind: 'protection', protectionType: 'escudo', duration: 5 },
    scaling: { basePower: 24, intCoefficient: 1.5 },
  },
  {
    id: 'lab-grave-bind',
    name: 'Laço da cova',
    archetype: 'control',
    manaCost: 25,
    cooldown: 6,
    trigger: { kind: 'enemyCount', min: 3 },
    effect: { kind: 'control', controlType: 'lentidão', duration: 3, chancePercent: 75 },
    scaling: { basePower: 10, intCoefficient: 1 },
  },
];

export const TEST_EQUIPMENT: readonly Equipment[] = [
  createEquipment('test-iron-sword', 'Espada de ferro', 'weapon', { str: 2 }, { rarity: 'common', instanceId: 'test-sword-a', stats: { baseDamage: 8 } }),
  createEquipment('test-bone-shield', 'Escudo de osso', 'shield', { cons: 2 }, { rarity: 'rare', instanceId: 'test-shield-a' }),
  createEquipment('test-leather-boots', 'Botas de couro', 'boots', { dex: 1 }, { rarity: 'epic', instanceId: 'test-boots-a' }),
];

export const TEST_CONSUMABLE = createConsumable(
  'test-strength-tonic',
  'Tônico de força',
  [createAttributeBonusEffect('test-strength-effect', { str: 1 })],
  { rarity: 'rare' },
);

export const TEST_CONSUMABLE_STACK: ItemStack = createItemStack(TEST_CONSUMABLE, 2);

export const TEST_OSSUARY_UPGRADES: readonly OssuaryUpgradeDefinition[] = [
  {
    id: 'lab-first-bone',
    name: 'Fragmento do Vestíbulo',
    requirements: [{ kind: 'bones', amount: 1 }],
    bonuses: [{ stat: 'penetration', percent: 8 }],
  },
  {
    id: 'lab-shadow-runner-milestone',
    name: 'Marca dos Corredores',
    requirements: [{ kind: 'milestone', key: 'shadow-runner', amount: 3 }],
    bonuses: [{ stat: 'sustain', percent: 5 }],
  },
];

/** Fórmulas provisórias apenas para tornar a progressão observável no Lab. */
export const TEST_DERIVED_FORMULAS: DerivedStatFormulas = {
  vigor: { base: 0, attribute: 'cons', coefficient: 10 },
  damage: { base: 0, attribute: 'str', coefficient: 2, includeWeaponBaseDamage: true },
  penetration: { base: 0, attribute: 'str', coefficient: 1 },
  cadence: { base: 1, attribute: 'dex', coefficient: 0.1 },
  critical: { base: 0, attribute: 'dex', coefficient: 0.5 },
  reach: { base: 1, attribute: 'dex', coefficient: 0.1 },
  sustain: { base: 0, attribute: 'int', coefficient: 1 },
  mana: { base: 50, attribute: 'int', coefficient: 10 },
};

/** Combates artificiais: validam o domínio sem bestiário, waves ou loot. */
export const TEST_COMBAT_RULES: CombatRules = {
  tickSeconds: 0.25,
  defenseConstant: 100,
};

export const TEST_COMBAT_PRESETS: Readonly<Record<'victory' | 'defeat' | 'effects', readonly CombatantSnapshot[]>> = {
  victory: [
    {
      id: 'lab-party', name: 'Party de teste', side: 'party',
      stats: { maxHp: 100, damage: 25, defense: 10, penetration: 5, attacksPerSecond: 2, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 },
      spells: createTestCombatSpellSetup(['lab-ember-bolt'], 40),
    },
    {
      id: 'lab-enemy', name: 'Alvo de teste', side: 'enemy',
      stats: { maxHp: 60, damage: 8, defense: 0, penetration: 0, attacksPerSecond: 1, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 },
    },
  ],
  defeat: [
    {
      id: 'lab-party', name: 'Party de teste', side: 'party',
      stats: { maxHp: 40, damage: 2, defense: 0, penetration: 0, attacksPerSecond: 1, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 },
    },
    {
      id: 'lab-enemy', name: 'Alvo de teste', side: 'enemy',
      stats: { maxHp: 100, damage: 20, defense: 0, penetration: 0, attacksPerSecond: 2, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 },
    },
  ],
  effects: [
    {
      id: 'lab-party', name: 'Party de efeitos', side: 'party',
      stats: { maxHp: 100, damage: 4, defense: 0, penetration: 0, attacksPerSecond: 1, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 },
      spells: createTestCombatSpellSetup(['lab-bone-aegis', 'lab-grave-bind'], 100),
    },
    {
      id: 'lab-enemy-a', name: 'Alvo de controle A', side: 'enemy',
      stats: { maxHp: 100, damage: 30, defense: 0, penetration: 0, attacksPerSecond: 1, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 },
    },
    {
      id: 'lab-enemy-b', name: 'Alvo de controle B', side: 'enemy',
      stats: { maxHp: 100, damage: 0, defense: 0, penetration: 0, attacksPerSecond: 0, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 },
    },
    {
      id: 'lab-enemy-c', name: 'Alvo de controle C', side: 'enemy',
      stats: { maxHp: 100, damage: 0, defense: 0, penetration: 0, attacksPerSecond: 0, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 },
    },
  ],
};

export const TEST_PARTY_COMBAT_ENEMY: CombatantSnapshot = {
  id: 'lab-party-target',
  name: 'Alvo da party',
  side: 'enemy',
  stats: { maxHp: 10, damage: 1, defense: 0, penetration: 0, attacksPerSecond: 1, criticalChancePercent: 0, criticalMultiplier: 2, sustainPercent: 0 },
};

function createTestCombatSpellSetup(spellIds: readonly string[], maxMana: number) {
  let loadout = createSpellLoadout(spellIds.length);
  for (const spellId of spellIds) loadout = equipSpell(loadout, TEST_SPELLS.map(({ id }) => id), spellId);
  return {
    loadout,
    definitions: TEST_SPELLS,
    maxMana,
    initialMana: maxMana,
    int: 5,
    spellDamagePercent: 0,
  } as const;
}

export function createTestDropTable(
  commonWeight: number,
  rareWeight: number,
): EquipmentDropEntry[] {
  const entries: EquipmentDropEntry[] = [];
  if (commonWeight > 0) entries.push({ equipment: TEST_EQUIPMENT[0], rarity: 'common', weight: commonWeight, attributeRollPools: { str: [1, 2, 3] } });
  if (rareWeight > 0) entries.push({ equipment: TEST_EQUIPMENT[1], rarity: 'rare', weight: rareWeight, attributeRollPools: { cons: [2, 3, 4] } });
  return entries;
}

import type { Equipment, EquipmentDropEntry, ItemStack, SpellDefinition } from '@ossuary/core';
import {
  createAttributeBonusEffect,
  createConsumable,
  createEquipment,
  createItemStack,
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

export function createTestDropTable(
  commonWeight: number,
  rareWeight: number,
): EquipmentDropEntry[] {
  const entries: EquipmentDropEntry[] = [];
  if (commonWeight > 0) entries.push({ equipment: TEST_EQUIPMENT[0], rarity: 'common', weight: commonWeight, attributeRollPools: { str: [1, 2, 3] } });
  if (rareWeight > 0) entries.push({ equipment: TEST_EQUIPMENT[1], rarity: 'rare', weight: rareWeight, attributeRollPools: { cons: [2, 3, 4] } });
  return entries;
}

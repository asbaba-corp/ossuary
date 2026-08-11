import type {
  Character,
  CharacterLoadout,
  Equipment,
  EquipmentReplacementPreview,
  EquipmentSlot,
  EffectiveCharacterStats,
  Inventory,
  ItemEffectState,
} from '@ossuary/core';
import {
  equipFromInventory as equipLoadoutFromInventory,
  generateEquipmentDrop,
  getCharacterStats as getEffectiveStats,
  getReplacementPreview as getEquipmentReplacementPreview,
  unequipToInventory as unequipLoadoutToInventory,
} from '@ossuary/core';
import { createTestDropTable } from './lab-fixtures';

export function equipFromInventory(inventory: Inventory, loadout: CharacterLoadout, instanceId: string) {
  return equipLoadoutFromInventory(inventory, loadout, instanceId);
}

export function unequipToInventory(inventory: Inventory, loadout: CharacterLoadout, slot: EquipmentSlot) {
  return unequipLoadoutToInventory(inventory, loadout, slot);
}

export function getCharacterEquipmentStats(character: Character, loadout: CharacterLoadout, effects: ItemEffectState): EffectiveCharacterStats {
  return getEffectiveStats(character, loadout, effects);
}

export function getReplacementPreview(character: Character, loadout: CharacterLoadout, candidate: Equipment, effects: ItemEffectState): EquipmentReplacementPreview {
  return getEquipmentReplacementPreview(character, loadout, candidate, effects);
}

export function rollTestDrop(instanceId: string, seed: string, commonWeight: number, rareWeight: number) {
  return generateEquipmentDrop(instanceId, seed, createTestDropTable(commonWeight, rareWeight));
}

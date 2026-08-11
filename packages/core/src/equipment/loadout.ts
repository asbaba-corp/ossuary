import type { Inventory } from "../inventory.js";
import {
  equipEquipmentFromInventory,
  unequipEquipmentToInventory,
} from "./legacy.js";
import type {
  CharacterLoadout,
  EquipmentSlot,
  EquipmentTransitionResult,
} from "./legacy.js";

/** Comandos de ownership entre inventário e loadout. */
export function equipFromInventory(
  inventory: Inventory,
  loadout: CharacterLoadout,
  instanceId: string,
): EquipmentTransitionResult {
  return equipEquipmentFromInventory(inventory, loadout, instanceId);
}

export function unequipToInventory(
  inventory: Inventory,
  loadout: CharacterLoadout,
  slotOrInstanceId: EquipmentSlot | string,
): EquipmentTransitionResult {
  return unequipEquipmentToInventory(inventory, loadout, slotOrInstanceId);
}

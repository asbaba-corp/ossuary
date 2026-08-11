import type { Character } from "../party.js";
import {
  getEffectiveCharacterStats,
  previewEquipmentReplacement,
} from "./legacy.js";
import type {
  CharacterLoadout,
  EffectiveCharacterStats,
  Equipment,
  EquipmentReplacementPreview,
  ItemEffectState,
} from "./legacy.js";

/** Leitura dos valores efetivos usados pela ficha do personagem. */
export function getCharacterStats(
  character: Character,
  loadout: CharacterLoadout,
  effects: ItemEffectState,
): EffectiveCharacterStats {
  return getEffectiveCharacterStats(character, loadout, effects);
}

/** Compara uma candidata com o loadout atual sem escolher uma vencedora. */
export function getReplacementPreview(
  character: Character,
  loadout: CharacterLoadout,
  candidate: Equipment,
  effects: ItemEffectState,
): EquipmentReplacementPreview {
  return previewEquipmentReplacement(character, loadout, candidate, effects);
}

/**
 * Preenche automaticamente os slots VAZIOS da party com o que houver no
 * inventário.
 *
 * Existe por um motivo concreto: drop garantido não é o mesmo que item
 * equipado. A fase 3 do Mundo 0 entrega a arma que dá o segundo alvo, e as
 * fases seguintes são calibradas assumindo que o jogador a esteja usando. Num
 * jogo idle, cuja promessa é deixar rodando, esperar que ele abra a mochila e
 * equipe à mão é apostar contra a própria proposta.
 *
 * A regra é deliberadamente conservadora e foi escolhida pelo dono: só entra
 * em slot vazio. Nunca substitui uma peça que o jogador escolheu, nem compara
 * qual é melhor. Se o slot está ocupado, a decisão continua sendo dele.
 */
import {
  EQUIPMENT_SLOTS,
  equipEquipmentFromInventory,
  type CharacterLoadout,
  type Equipment,
  type EquipmentSlot,
} from "./equipment/legacy.js";
import type { Inventory } from "./inventory.js";
import type { Party, RosterState } from "./party.js";

export interface AutoEquipAssignment {
  readonly characterId: string;
  readonly instanceId: string;
  readonly slot: EquipmentSlot;
}

export interface AutoEquipResult {
  readonly roster: RosterState;
  readonly inventory: Inventory;
  readonly assignments: readonly AutoEquipAssignment[];
}

/**
 * Percorre a party na ordem, e para cada slot vazio pega a primeira peça
 * compatível do inventário. Determinístico: mesma entrada, mesmo resultado.
 */
export function autoEquipEmptySlots(
  roster: RosterState,
  party: Party,
  inventory: Inventory,
): AutoEquipResult {
  let nextRoster = roster;
  let nextInventory = inventory;
  const assignments: AutoEquipAssignment[] = [];

  for (const characterId of party.characterIds) {
    const loadout = nextRoster.equipmentLoadouts[characterId];
    if (!loadout) continue;

    let nextLoadout = loadout;
    for (const slot of EQUIPMENT_SLOTS) {
      if (nextLoadout.equipped[slot]) continue;               // ocupado: não toca
      const candidate = firstEquipmentForSlot(nextInventory, slot);
      if (!candidate) continue;

      const transition = equipEquipmentFromInventory(
        nextInventory,
        nextLoadout,
        candidate.instanceId,
      );
      nextInventory = transition.inventory;
      nextLoadout = transition.loadout;
      assignments.push({ characterId, instanceId: candidate.instanceId, slot });
    }

    if (nextLoadout !== loadout) {
      nextRoster = {
        ...nextRoster,
        equipmentLoadouts: { ...nextRoster.equipmentLoadouts, [characterId]: nextLoadout },
      };
    }
  }

  return { roster: nextRoster, inventory: nextInventory, assignments };
}

function firstEquipmentForSlot(inventory: Inventory, slot: EquipmentSlot): Equipment | null {
  for (const stack of inventory.items) {
    if (stack.item.kind === "equipment" && stack.item.slot === slot) return stack.item;
  }
  return null;
}

/** Conveniência para quem só quer saber se um loadout tem buraco. */
export function hasEmptySlot(loadout: CharacterLoadout): boolean {
  return EQUIPMENT_SLOTS.some((slot) => !loadout.equipped[slot]);
}

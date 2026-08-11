import {
  gainExperience,
  type CharacterAttributes,
  type CharacterProgress,
  type PrimaryAttribute,
} from "./progression/xp.js";
import type { Character } from "./party.js";

export const EQUIPMENT_SLOTS = [
  "weapon",
  "helmet",
  "chest",
  "gloves",
  "boots",
  "shield",
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];
export type ItemRarity = "common" | "rare" | "epic" | "legendary";
export type ItemKind = "equipment" | "consumable";

export type EquipmentAttributeBonuses = Readonly<Partial<Record<PrimaryAttribute, number>>>;

export interface AttributeBonusEffect {
  readonly kind: "attribute-bonus";
  readonly id: string;
  readonly bonuses: EquipmentAttributeBonuses;
}

export interface FutureItemEffect {
  readonly kind: "future";
  readonly id: string;
  readonly description: string;
}

export type ItemEffect = AttributeBonusEffect | FutureItemEffect;

export interface ItemOptions {
  readonly rarity?: ItemRarity;
  readonly effects?: readonly ItemEffect[];
}

interface ItemBase {
  readonly id: string;
  readonly name: string;
  readonly rarity: ItemRarity;
  readonly effects: readonly ItemEffect[];
}

export interface Equipment extends ItemBase {
  readonly kind: "equipment";
  readonly slot: EquipmentSlot;
  readonly attributeBonuses: EquipmentAttributeBonuses;
}

export interface Consumable extends ItemBase {
  readonly kind: "consumable";
}

export type Item = Equipment | Consumable;

export interface ItemStack {
  readonly item: Item;
  readonly quantity: number;
}

export interface ActiveItemEffect {
  readonly itemId: string;
  readonly effectId: string;
  readonly targetCharacterId: string;
  readonly effect: ItemEffect;
}

export interface ItemEffectState {
  readonly activeEffects: readonly ActiveItemEffect[];
}

export interface ItemUseResult {
  readonly itemStack: ItemStack;
  readonly effectState: ItemEffectState;
}

type MutableCharacterAttributes = { -readonly [Attribute in PrimaryAttribute]: number };

export type EquippedItems = Readonly<Record<EquipmentSlot, Equipment | null>>;

export interface CharacterLoadout {
  readonly characterId: string;
  readonly equipped: EquippedItems;
}

export function createAttributeBonusEffect(
  id: string,
  bonuses: EquipmentAttributeBonuses,
): AttributeBonusEffect {
  assertNonEmptyString(id, "effect id");
  assertAttributeBonuses(bonuses);
  return { kind: "attribute-bonus", id, bonuses: { ...bonuses } };
}

export function createFutureItemEffect(id: string, description: string): FutureItemEffect {
  assertNonEmptyString(id, "effect id");
  assertNonEmptyString(description, "effect description");
  return { kind: "future", id, description };
}

export function createEquipment(
  id: string,
  name: string,
  slot: EquipmentSlot,
  attributeBonuses: EquipmentAttributeBonuses = {},
  options: ItemOptions = {},
): Equipment {
  assertNonEmptyString(id, "equipment id");
  assertNonEmptyString(name, "equipment name");
  assertEquipmentSlot(slot);
  assertAttributeBonuses(attributeBonuses);
  const item = {
    kind: "equipment" as const,
    id,
    name,
    rarity: options.rarity ?? "common",
    effects: cloneEffects(options.effects ?? []),
    slot,
    attributeBonuses: { ...attributeBonuses },
  };
  assertEquipment(item);
  return item;
}

export function createConsumable(
  id: string,
  name: string,
  effects: readonly ItemEffect[] = [],
  options: ItemOptions = {},
): Consumable {
  assertNonEmptyString(id, "consumable id");
  assertNonEmptyString(name, "consumable name");
  const item = {
    kind: "consumable" as const,
    id,
    name,
    rarity: options.rarity ?? "common",
    effects: cloneEffects([...effects, ...(options.effects ?? [])]),
  };
  assertConsumable(item);
  return item;
}

export function createItemStack(item: Item, quantity: number): ItemStack {
  assertItem(item);
  assertQuantity(quantity);
  return { item: cloneItem(item), quantity };
}

export function createItemEffectState(): ItemEffectState {
  return { activeEffects: [] };
}

export function useItem(
  itemStack: ItemStack,
  targetCharacterId: string,
  effectState: ItemEffectState,
): ItemUseResult {
  assertItemStack(itemStack);
  assertNonEmptyString(targetCharacterId, "target characterId");
  assertEffectState(effectState);
  if (itemStack.item.kind !== "consumable") {
    throw new RangeError(`item cannot be used as a consumable: ${itemStack.item.id}`);
  }
  if (itemStack.quantity < 1) {
    throw new RangeError("item stack has no remaining quantity");
  }
  if (
    effectState.activeEffects.some(
      (active) =>
        active.itemId === itemStack.item.id && active.targetCharacterId === targetCharacterId,
    )
  ) {
    throw new RangeError(`item effect is already active for character: ${targetCharacterId}`);
  }
  return {
    itemStack: { item: cloneItem(itemStack.item), quantity: itemStack.quantity - 1 },
    effectState: {
      activeEffects: [
        ...effectState.activeEffects,
        ...itemStack.item.effects.map((effect) => ({
          itemId: itemStack.item.id,
          effectId: effect.id,
          targetCharacterId,
          effect: cloneEffect(effect),
        })),
      ],
    },
  };
}

export function removeItemEffect(
  effectState: ItemEffectState,
  itemId: string,
  targetCharacterId: string,
): ItemEffectState {
  assertEffectState(effectState);
  assertNonEmptyString(itemId, "item id");
  assertNonEmptyString(targetCharacterId, "target characterId");
  const activeEffects = effectState.activeEffects.filter(
    (active) => !(active.itemId === itemId && active.targetCharacterId === targetCharacterId),
  );
  if (activeEffects.length === effectState.activeEffects.length) {
    throw new RangeError(`item effect is not active for character: ${targetCharacterId}`);
  }
  return { activeEffects };
}

export function getActiveItemAttributeBonuses(
  effectState: ItemEffectState,
  targetCharacterId: string,
): CharacterAttributes {
  assertEffectState(effectState);
  assertNonEmptyString(targetCharacterId, "target characterId");
  const bonuses: MutableCharacterAttributes = { cons: 0, str: 0, dex: 0, int: 0 };
  for (const active of effectState.activeEffects) {
    if (active.targetCharacterId !== targetCharacterId || active.effect.kind !== "attribute-bonus") {
      continue;
    }
    for (const attribute of Object.keys(active.effect.bonuses) as PrimaryAttribute[]) {
      bonuses[attribute] += active.effect.bonuses[attribute] ?? 0;
    }
  }
  return bonuses;
}

export function createCharacterLoadout(characterId: string): CharacterLoadout {
  assertNonEmptyString(characterId, "loadout characterId");
  return { characterId, equipped: createEmptyEquippedItems() };
}

export function equipEquipment(
  loadout: CharacterLoadout,
  equipment: Equipment,
): CharacterLoadout {
  assertLoadout(loadout);
  assertEquipment(equipment);
  return {
    characterId: loadout.characterId,
    equipped: { ...loadout.equipped, [equipment.slot]: cloneEquipment(equipment) },
  };
}

export function unequipEquipment(
  loadout: CharacterLoadout,
  slot: EquipmentSlot,
): CharacterLoadout {
  assertLoadout(loadout);
  assertEquipmentSlot(slot);
  return { characterId: loadout.characterId, equipped: { ...loadout.equipped, [slot]: null } };
}

export function getEquippedEquipment(
  loadout: CharacterLoadout,
  slot: EquipmentSlot,
): Equipment | null {
  assertLoadout(loadout);
  assertEquipmentSlot(slot);
  const equipment = loadout.equipped[slot];
  return equipment ? cloneEquipment(equipment) : null;
}

export function getEffectiveCharacterAttributes(
  character: Character,
  loadout: CharacterLoadout,
  effectState: ItemEffectState = createItemEffectState(),
): CharacterAttributes {
  assertCharacter(character);
  assertLoadout(loadout);
  if (character.id !== loadout.characterId) {
    throw new RangeError(
      `loadout belongs to ${loadout.characterId}, not character ${character.id}`,
    );
  }
  const attributes = { ...character.progress.attributes };
  for (const equipment of Object.values(loadout.equipped)) {
    if (!equipment) continue;
    addBonuses(attributes, equipment.attributeBonuses);
  }
  addBonuses(attributes, getActiveItemAttributeBonuses(effectState, character.id));
  return attributes;
}

function createEmptyEquippedItems(): EquippedItems {
  return { weapon: null, helmet: null, chest: null, gloves: null, boots: null, shield: null };
}

function assertItemStack(itemStack: ItemStack): void {
  if (!itemStack || typeof itemStack !== "object") throw new RangeError("item stack must be an object");
  assertItem(itemStack.item);
  assertQuantity(itemStack.quantity);
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError("item quantity must be a positive integer");
  }
}

function assertEffectState(effectState: ItemEffectState): void {
  if (!effectState || !Array.isArray(effectState.activeEffects)) {
    throw new RangeError("item effect state must contain an activeEffects array");
  }
  for (const active of effectState.activeEffects) {
    assertNonEmptyString(active.itemId, "active item id");
    assertNonEmptyString(active.effectId, "active effect id");
    assertNonEmptyString(active.targetCharacterId, "active target characterId");
    assertEffect(active.effect);
  }
}

function assertItem(item: Item): void {
  if (!item || typeof item !== "object") throw new RangeError("item must be an object");
  assertNonEmptyString(item.id, "item id");
  assertNonEmptyString(item.name, "item name");
  assertItemRarity(item.rarity);
  if (!Array.isArray(item.effects)) throw new RangeError("item effects must be an array");
  item.effects.forEach(assertEffect);
  if (item.kind === "equipment") assertEquipment(item);
  else if (item.kind === "consumable") assertConsumable(item);
  else throw new RangeError("unknown item kind");
}

function assertEquipment(equipment: Equipment): void {
  assertItemBase(equipment);
  if (equipment.kind !== "equipment") throw new RangeError("item is not equipment");
  assertEquipmentSlot(equipment.slot);
  assertAttributeBonuses(equipment.attributeBonuses);
}

function assertConsumable(consumable: Consumable): void {
  assertItemBase(consumable);
  if (consumable.kind !== "consumable") throw new RangeError("item is not consumable");
}

function assertItemBase(item: ItemBase): void {
  assertNonEmptyString(item.id, "item id");
  assertNonEmptyString(item.name, "item name");
  assertItemRarity(item.rarity);
  if (!Array.isArray(item.effects)) throw new RangeError("item effects must be an array");
  item.effects.forEach(assertEffect);
}

function assertEffect(effect: ItemEffect): void {
  if (!effect || typeof effect !== "object") throw new RangeError("item effect must be an object");
  assertNonEmptyString(effect.id, "effect id");
  if (effect.kind === "attribute-bonus") assertAttributeBonuses(effect.bonuses);
  else if (effect.kind === "future") assertNonEmptyString(effect.description, "effect description");
  else throw new RangeError("unknown item effect kind");
}

function assertLoadout(loadout: CharacterLoadout): void {
  if (!loadout || typeof loadout !== "object") throw new RangeError("loadout must be an object");
  assertNonEmptyString(loadout.characterId, "loadout characterId");
  if (!loadout.equipped || typeof loadout.equipped !== "object") {
    throw new RangeError("loadout.equipped must be an object");
  }
  for (const slot of EQUIPMENT_SLOTS) {
    const equipment = loadout.equipped[slot];
    if (equipment === undefined) throw new RangeError(`loadout.equipped is missing slot: ${slot}`);
    if (equipment === null) continue;
    assertEquipment(equipment);
    if (equipment.slot !== slot) {
      throw new RangeError(`equipment ${equipment.id} does not belong in slot ${slot}`);
    }
  }
}

function assertCharacter(character: Character): void {
  if (!character || typeof character !== "object") throw new RangeError("character must be an object");
  assertNonEmptyString(character.id, "character id");
  assertNonEmptyString(character.name, "character name");
  gainExperience(character.progress, 0);
}

function assertAttributeBonuses(bonuses: EquipmentAttributeBonuses): void {
  if (!bonuses || typeof bonuses !== "object") throw new RangeError("attribute bonuses must be an object");
  for (const [attribute, value] of Object.entries(bonuses)) {
    if (!EQUIPMENT_ATTRIBUTES.includes(attribute as PrimaryAttribute)) {
      throw new RangeError(`unknown item attribute: ${attribute}`);
    }
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`attribute bonus must be a non-negative integer: ${attribute}`);
    }
  }
}

function assertEquipmentSlot(value: string): asserts value is EquipmentSlot {
  if (!EQUIPMENT_SLOTS.includes(value as EquipmentSlot)) throw new RangeError(`unknown equipment slot: ${value}`);
}

function assertItemRarity(value: string): asserts value is ItemRarity {
  if (!["common", "rare", "epic", "legendary"].includes(value)) {
    throw new RangeError(`unknown item rarity: ${value}`);
  }
}

function assertNonEmptyString(value: string, name: string): void {
  if (typeof value !== "string" || value.trim() === "") throw new RangeError(`${name} must be a non-empty string`);
}

function addBonuses(target: MutableCharacterAttributes, bonuses: EquipmentAttributeBonuses): void {
  for (const attribute of Object.keys(bonuses) as PrimaryAttribute[]) {
    target[attribute] += bonuses[attribute] ?? 0;
  }
}

function cloneEffects(effects: readonly ItemEffect[]): readonly ItemEffect[] {
  effects.forEach(assertEffect);
  return effects.map(cloneEffect);
}

function cloneEffect(effect: ItemEffect): ItemEffect {
  return effect.kind === "attribute-bonus"
    ? { ...effect, bonuses: { ...effect.bonuses } }
    : { ...effect };
}

function cloneItem(item: Item): Item {
  return item.kind === "equipment"
    ? { ...item, attributeBonuses: { ...item.attributeBonuses }, effects: cloneEffects(item.effects) }
    : { ...item, effects: cloneEffects(item.effects) };
}

function cloneEquipment(equipment: Equipment): Equipment {
  return cloneItem(equipment) as Equipment;
}

const EQUIPMENT_ATTRIBUTES: readonly PrimaryAttribute[] = ["cons", "str", "dex", "int"];

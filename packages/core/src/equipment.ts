import {
  gainExperience,
  type CharacterAttributes,
  type CharacterProgress,
  type PrimaryAttribute,
} from "./progression/xp.js";
import type { Character } from "./party.js";
import { deterministicUnit } from "./random.js";
import { addItem, findItemStack, removeItem, type Inventory } from "./inventory.js";

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

export interface EquipmentStats {
  readonly baseDamage: number;
  readonly baseDefense: number;
  readonly defensePercent: number;
  readonly physicalDamagePercent: number;
  readonly spellDamagePercent: number;
  readonly criticalChancePercent: number;
  readonly lifestealPercent: number;
  readonly manaStealPercent: number;
  readonly armorPenetrationPercent: number;
  readonly attackSpeedPercent: number;
}

export type EquipmentAttributeRollPools = Readonly<
  Partial<Record<PrimaryAttribute, readonly number[]>>
>;

export interface EquipmentDropEntry {
  readonly equipment: Equipment;
  readonly rarity: ItemRarity;
  readonly weight: number;
  readonly attributeRollPools: EquipmentAttributeRollPools;
}

export interface EffectiveCharacterStats extends EquipmentStats {
  readonly attributes: CharacterAttributes;
}

export interface EquipmentStatDelta {
  readonly stat: keyof EffectiveCharacterStats;
  readonly current: number;
  readonly candidate: number;
  readonly delta: number;
}

export interface EquipmentReplacementPreview {
  readonly slot: EquipmentSlot;
  readonly current: Equipment | null;
  readonly candidate: Equipment;
  readonly deltas: readonly EquipmentStatDelta[];
}

export interface EquipmentTransitionResult {
  readonly inventory: Inventory;
  readonly loadout: CharacterLoadout;
}

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
  readonly instanceId?: string;
  readonly stats?: Partial<EquipmentStats>;
}

interface ItemBase {
  readonly id: string;
  readonly name: string;
  readonly rarity: ItemRarity;
  readonly effects: readonly ItemEffect[];
}

export interface Equipment extends ItemBase {
  readonly kind: "equipment";
  readonly instanceId: string;
  readonly slot: EquipmentSlot;
  readonly attributeBonuses: EquipmentAttributeBonuses;
  readonly stats: EquipmentStats;
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
    instanceId: options.instanceId ?? id,
    name,
    rarity: options.rarity ?? "common",
    effects: cloneEffects(options.effects ?? []),
    slot,
    attributeBonuses: { ...attributeBonuses },
    stats: createEquipmentStats(options.stats),
  };
  assertEquipment(item);
  return item;
}

export function createEquipmentStats(stats: Partial<EquipmentStats> = {}): EquipmentStats {
  const normalized = { ...DEFAULT_EQUIPMENT_STATS, ...stats };
  assertEquipmentStats(normalized);
  return normalized;
}

export function rollEquipment(
  baseEquipment: Equipment,
  instanceId: string,
  seed: number | string,
  pools: EquipmentAttributeRollPools,
  rarity: ItemRarity = baseEquipment.rarity,
): Equipment {
  assertEquipment(baseEquipment);
  assertNonEmptyString(instanceId, "equipment instanceId");
  assertItemRarity(rarity);
  assertAttributeRollPools(pools);
  const attributeBonuses: Partial<Record<PrimaryAttribute, number>> = {
    ...baseEquipment.attributeBonuses,
  };
  for (const attribute of EQUIPMENT_ATTRIBUTES) {
    const values = pools[attribute];
    if (values !== undefined) {
      attributeBonuses[attribute] = values[Math.floor(deterministicUnit(seed, attribute) * values.length)];
    }
  }
  return {
    ...cloneEquipment(baseEquipment),
    instanceId,
    rarity,
    attributeBonuses,
    stats: { ...baseEquipment.stats },
  };
}

export function createEquipmentFromDropTable(
  instanceId: string,
  seed: number | string,
  entries: readonly EquipmentDropEntry[],
): Equipment {
  assertNonEmptyString(instanceId, "equipment instanceId");
  if (!Array.isArray(entries) || entries.length === 0) throw new RangeError("drop table must not be empty");
  entries.forEach(assertDropEntry);
  const totalWeight = entries.reduce((total, entry) => total + entry.weight, 0);
  const target = deterministicUnit(seed, "drop-entry") * totalWeight;
  let cursor = 0;
  for (const entry of entries) {
    cursor += entry.weight;
    if (target < cursor) return rollEquipment(entry.equipment, instanceId, seed, entry.attributeRollPools, entry.rarity);
  }
  return rollEquipment(entries[entries.length - 1].equipment, instanceId, seed, entries[entries.length - 1].attributeRollPools, entries[entries.length - 1].rarity);
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

export function equipEquipmentFromInventory(
  inventory: Inventory,
  loadout: CharacterLoadout,
  instanceId: string,
): EquipmentTransitionResult {
  assertLoadout(loadout);
  assertNonEmptyString(instanceId, "equipment instanceId");
  const stack = findItemStack(inventory, instanceId);
  if (!stack || stack.item.kind !== "equipment" || stack.item.instanceId !== instanceId) {
    throw new RangeError(`equipment instance is not in inventory: ${instanceId}`);
  }
  const candidate = stack.item;
  const previous = loadout.equipped[candidate.slot];
  let nextInventory = removeItem(inventory, instanceId);
  if (previous) nextInventory = addItem(nextInventory, { item: previous, quantity: 1 });
  return { inventory: nextInventory, loadout: equipEquipment(loadout, candidate) };
}

export function unequipEquipmentToInventory(
  inventory: Inventory,
  loadout: CharacterLoadout,
  slotOrInstanceId: EquipmentSlot | string,
): EquipmentTransitionResult {
  assertLoadout(loadout);
  const slot = EQUIPMENT_SLOTS.includes(slotOrInstanceId as EquipmentSlot)
    ? slotOrInstanceId as EquipmentSlot
    : EQUIPMENT_SLOTS.find((candidateSlot) => loadout.equipped[candidateSlot]?.instanceId === slotOrInstanceId);
  if (!slot) throw new RangeError(`equipment is not equipped: ${slotOrInstanceId}`);
  const equipment = loadout.equipped[slot];
  if (!equipment) throw new RangeError(`equipment slot is empty: ${slot}`);
  const nextInventory = addItem(inventory, { item: equipment, quantity: 1 });
  return { inventory: nextInventory, loadout: unequipEquipment(loadout, slot) };
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

export function getEffectiveCharacterStats(
  character: Character,
  loadout: CharacterLoadout,
  effectState: ItemEffectState = createItemEffectState(),
): EffectiveCharacterStats {
  const attributes = getEffectiveCharacterAttributes(character, loadout, effectState);
  const stats = { ...DEFAULT_EQUIPMENT_STATS };
  for (const equipment of Object.values(loadout.equipped)) {
    if (!equipment) continue;
    for (const stat of EQUIPMENT_STAT_KEYS) stats[stat] += equipment.stats[stat];
  }
  return { ...stats, attributes };
}

export function previewEquipmentReplacement(
  character: Character,
  loadout: CharacterLoadout,
  candidate: Equipment,
  effectState: ItemEffectState = createItemEffectState(),
): EquipmentReplacementPreview {
  assertEquipment(candidate);
  const current = loadout.equipped[candidate.slot];
  const currentStats = getEffectiveCharacterStats(character, loadout, effectState);
  const candidateLoadout = equipEquipment(loadout, candidate);
  const candidateStats = getEffectiveCharacterStats(character, candidateLoadout, effectState);
  const deltas: EquipmentStatDelta[] = [];
  for (const stat of [...EQUIPMENT_STAT_KEYS, ...EQUIPMENT_ATTRIBUTES] as const) {
    const currentValue = getEffectiveStatValue(currentStats, stat);
    const candidateValue = getEffectiveStatValue(candidateStats, stat);
    deltas.push({ stat: stat as keyof EffectiveCharacterStats, current: currentValue, candidate: candidateValue, delta: candidateValue - currentValue });
  }
  return { slot: candidate.slot, current: current ? cloneEquipment(current) : null, candidate: cloneEquipment(candidate), deltas };
}

function getEffectiveStatValue(stats: EffectiveCharacterStats, stat: keyof EquipmentStats | PrimaryAttribute): number {
  return stat in stats ? stats[stat as keyof EquipmentStats] : stats.attributes[stat as PrimaryAttribute];
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
  assertNonEmptyString(equipment.instanceId, "equipment instanceId");
  assertEquipmentStats(equipment.stats);
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

function assertEquipmentStats(stats: EquipmentStats): void {
  if (!stats || typeof stats !== "object") throw new RangeError("equipment stats must be an object");
  for (const stat of EQUIPMENT_STAT_KEYS) {
    if (!Number.isInteger(stats[stat]) || stats[stat] < 0) throw new RangeError(`equipment stat must be a non-negative integer: ${stat}`);
  }
}

function assertAttributeRollPools(pools: EquipmentAttributeRollPools): void {
  if (!pools || typeof pools !== "object") throw new RangeError("attribute roll pools must be an object");
  if (Object.keys(pools).length === 0) throw new RangeError("attribute roll pools must not be empty");
  for (const [attribute, values] of Object.entries(pools)) {
    if (!EQUIPMENT_ATTRIBUTES.includes(attribute as PrimaryAttribute)) throw new RangeError(`unknown roll pool attribute: ${attribute}`);
    if (!Array.isArray(values) || values.length === 0) throw new RangeError(`roll pool must not be empty: ${attribute}`);
    values.forEach((value) => {
      if (!Number.isInteger(value) || value < 0) throw new RangeError(`roll pool values must be non-negative integers: ${attribute}`);
    });
  }
}

function assertDropEntry(entry: EquipmentDropEntry): void {
  if (!entry || typeof entry !== "object") throw new RangeError("drop entry must be an object");
  assertEquipment(entry.equipment);
  assertItemRarity(entry.rarity);
  if (!Number.isInteger(entry.weight) || entry.weight <= 0) throw new RangeError("drop weight must be a positive integer");
  assertAttributeRollPools(entry.attributeRollPools);
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
    ? { ...item, attributeBonuses: { ...item.attributeBonuses }, stats: { ...item.stats }, effects: cloneEffects(item.effects) }
    : { ...item, effects: cloneEffects(item.effects) };
}

function cloneEquipment(equipment: Equipment): Equipment {
  return cloneItem(equipment) as Equipment;
}

const EQUIPMENT_ATTRIBUTES: readonly PrimaryAttribute[] = ["cons", "str", "dex", "int"];
const EQUIPMENT_STAT_KEYS: readonly (keyof EquipmentStats)[] = [
  "baseDamage", "baseDefense", "defensePercent", "physicalDamagePercent", "spellDamagePercent",
  "criticalChancePercent", "lifestealPercent", "manaStealPercent", "armorPenetrationPercent", "attackSpeedPercent",
];
const DEFAULT_EQUIPMENT_STATS: EquipmentStats = {
  baseDamage: 0, baseDefense: 0, defensePercent: 0, physicalDamagePercent: 0,
  spellDamagePercent: 0, criticalChancePercent: 0, lifestealPercent: 0, manaStealPercent: 0,
  armorPenetrationPercent: 0, attackSpeedPercent: 0,
};

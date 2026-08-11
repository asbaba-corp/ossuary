import {
  createItemStack,
  type Item,
  type ItemStack,
} from "./equipment.js";

export const INVENTORY_DEFAULT_CAPACITY = 128 as const;

export interface Inventory {
  readonly capacity: number;
  readonly items: readonly ItemStack[];
}

export interface InventorySummary {
  readonly capacity: number;
  readonly usedSlots: number;
  readonly availableSlots: number;
  readonly totalItemQuantity: number;
}

export function createInventory(
  capacity: number = INVENTORY_DEFAULT_CAPACITY,
): Inventory {
  assertCapacity(capacity);
  return { capacity, items: [] };
}

export function addItem(inventory: Inventory, itemStack: ItemStack): Inventory {
  assertInventory(inventory);
  assertInventoryItemStack(itemStack);

  const conflictingIndex = inventory.items.findIndex(({ item }) =>
    item.kind === itemStack.item.kind &&
    (item.kind === "consumable"
      ? item.id === itemStack.item.id
      : item.instanceId === (itemStack.item.kind === "equipment" ? itemStack.item.instanceId : "")),
  );
  const sameBaseKindIndex = inventory.items.findIndex(({ item }) => item.id === itemStack.item.id && item.kind !== itemStack.item.kind);
  if (sameBaseKindIndex >= 0) throw new RangeError(`inventory item kind conflicts with existing item: ${itemStack.item.id}`);
  if (itemStack.item.kind === "equipment" && conflictingIndex >= 0) {
    throw new RangeError(`equipment instance is already in inventory: ${itemStack.item.instanceId}`);
  }
  const existingIndex = itemStack.item.kind === "consumable" ? conflictingIndex : -1;
  if (itemStack.item.kind === "consumable" && existingIndex >= 0) {
    const existing = inventory.items[existingIndex];
    const merged = createItemStack(existing.item, existing.quantity + itemStack.quantity);
    const items = inventory.items.slice();
    items[existingIndex] = merged;
    return { capacity: inventory.capacity, items };
  }

  if (inventory.items.length >= inventory.capacity) {
    throw new RangeError("inventory has no available slots");
  }
  return {
    capacity: inventory.capacity,
    items: [...inventory.items, createItemStack(itemStack.item, itemStack.quantity)],
  };
}

export function removeItem(
  inventory: Inventory,
  itemId: string,
  quantity: number = 1,
): Inventory {
  assertInventory(inventory);
  assertNonEmptyString(itemId, "item id");
  assertPositiveInteger(quantity, "item quantity");

  const existingIndex = inventory.items.findIndex(({ item }) =>
    item.kind === "equipment" ? item.instanceId === itemId : item.id === itemId,
  );
  if (existingIndex < 0) {
    throw new RangeError(`item is not in inventory: ${itemId}`);
  }

  const existing = inventory.items[existingIndex];
  if (quantity > existing.quantity) {
    throw new RangeError(`inventory does not contain ${quantity} of item: ${itemId}`);
  }
  if (existing.item.kind === "equipment" && quantity !== 1) {
    throw new RangeError("equipment can only be removed one piece at a time");
  }

  const items = inventory.items.slice();
  if (quantity === existing.quantity) items.splice(existingIndex, 1);
  else items[existingIndex] = createItemStack(existing.item, existing.quantity - quantity);
  return { capacity: inventory.capacity, items };
}

export function findItemStack(inventory: Inventory, itemId: string): ItemStack | null {
  assertInventory(inventory);
  assertNonEmptyString(itemId, "item id");
  const stack = inventory.items.find(({ item }) => item.kind === "equipment" ? item.instanceId === itemId : item.id === itemId);
  return stack ? createItemStack(stack.item, stack.quantity) : null;
}

export function getItemQuantity(inventory: Inventory, itemId: string): number {
  assertInventory(inventory);
  assertNonEmptyString(itemId, "item id");
  return inventory.items
    .filter(({ item }) => item.kind === "equipment" ? item.instanceId === itemId : item.id === itemId)
    .reduce((total, stack) => total + stack.quantity, 0);
}

export function getInventorySummary(inventory: Inventory): InventorySummary {
  assertInventory(inventory);
  return {
    capacity: inventory.capacity,
    usedSlots: inventory.items.length,
    availableSlots: inventory.capacity - inventory.items.length,
    totalItemQuantity: inventory.items.reduce((total, stack) => total + stack.quantity, 0),
  };
}

function assertInventory(inventory: Inventory): void {
  if (!inventory || typeof inventory !== "object") {
    throw new RangeError("inventory must be an object");
  }
  assertCapacity(inventory.capacity);
  if (!Array.isArray(inventory.items)) throw new RangeError("inventory.items must be an array");
  if (inventory.items.length > inventory.capacity) {
    throw new RangeError("inventory contains more slots than its capacity");
  }

  const itemKeys = new Set<string>();
  for (const itemStack of inventory.items) {
    assertInventoryItemStack(itemStack);
    const key = itemStack.item.kind === "equipment" ? `equipment:${itemStack.item.instanceId}` : `consumable:${itemStack.item.id}`;
    if (itemKeys.has(key)) throw new RangeError(`inventory contains duplicate item stack: ${key}`);
    itemKeys.add(key);
  }
}

function assertInventoryItemStack(itemStack: ItemStack): void {
  if (!itemStack || typeof itemStack !== "object") {
    throw new RangeError("inventory item stack must be an object");
  }
  const normalized = createItemStack(itemStack.item, itemStack.quantity);
  if (normalized.item.kind === "equipment" && normalized.quantity !== 1) {
    throw new RangeError("equipment must have quantity 1 in inventory");
  }
}

function assertCapacity(capacity: number): void {
  assertPositiveInteger(capacity, "inventory capacity");
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

function assertNonEmptyString(value: string, name: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new RangeError(`${name} must be a non-empty string`);
  }
}

import type { SpellDefinition } from "./spells.js";

export interface SpellLoadoutEntry {
  readonly spellId: string;
  readonly enabled: boolean;
}

export interface SpellLoadout {
  readonly maxSlots: number;
  /** Entries are stored in auto-cast priority order. */
  readonly entries: readonly SpellLoadoutEntry[];
}

export type SpellPriorityDirection = "up" | "down";

export function createSpellLoadout(maxSlots: number): SpellLoadout {
  assertMaxSlots(maxSlots);
  return { maxSlots, entries: [] };
}

export function validateSpellLoadout(
  loadout: SpellLoadout,
  availableSpellIds: readonly string[],
): readonly string[] {
  const errors: string[] = [];
  const available = new Set(availableSpellIds);
  const seen = new Set<string>();

  if (!Number.isInteger(loadout.maxSlots) || loadout.maxSlots < 0) {
    errors.push("maxSlots deve ser um inteiro não negativo");
  }
  if (loadout.entries.length > loadout.maxSlots) {
    errors.push("loadout excede a capacidade de slots");
  }

  for (const entry of loadout.entries) {
    if (!entry.spellId.trim()) errors.push("spellId obrigatório");
    if (seen.has(entry.spellId)) errors.push(`spell duplicada: ${entry.spellId}`);
    if (!available.has(entry.spellId)) errors.push(`spell indisponível: ${entry.spellId}`);
    seen.add(entry.spellId);
  }
  return errors;
}

export function equipSpell(
  loadout: SpellLoadout,
  availableSpellIds: readonly string[],
  spellId: string,
): SpellLoadout {
  assertValidLoadout(loadout, availableSpellIds);
  if (!availableSpellIds.includes(spellId)) {
    throw new RangeError(`spell indisponível: ${spellId}`);
  }
  if (loadout.entries.some((entry) => entry.spellId === spellId)) {
    throw new RangeError(`spell já equipada: ${spellId}`);
  }
  if (loadout.entries.length >= loadout.maxSlots) {
    throw new RangeError("loadout excede a capacidade de slots");
  }
  return {
    ...loadout,
    entries: [...loadout.entries, { spellId, enabled: true }],
  };
}

export function unequipSpell(loadout: SpellLoadout, spellId: string): SpellLoadout {
  const index = loadout.entries.findIndex((entry) => entry.spellId === spellId);
  if (index < 0) throw new RangeError(`spell não equipada: ${spellId}`);
  return {
    ...loadout,
    entries: loadout.entries.filter((entry) => entry.spellId !== spellId),
  };
}

export function setSpellEnabled(
  loadout: SpellLoadout,
  spellId: string,
  enabled: boolean,
): SpellLoadout {
  let found = false;
  const entries = loadout.entries.map((entry) => {
    if (entry.spellId !== spellId) return entry;
    found = true;
    return { ...entry, enabled };
  });
  if (!found) throw new RangeError(`spell não equipada: ${spellId}`);
  return { ...loadout, entries };
}

export function moveSpellPriority(
  loadout: SpellLoadout,
  spellId: string,
  direction: SpellPriorityDirection,
): SpellLoadout {
  const index = loadout.entries.findIndex((entry) => entry.spellId === spellId);
  if (index < 0) throw new RangeError(`spell não equipada: ${spellId}`);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= loadout.entries.length) return loadout;

  const entries = [...loadout.entries];
  [entries[index], entries[targetIndex]] = [entries[targetIndex], entries[index]];
  return { ...loadout, entries };
}

export function getEnabledSpellDefinitions(
  loadout: SpellLoadout,
  definitions: readonly SpellDefinition[],
): readonly SpellDefinition[] {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  return loadout.entries
    .filter((entry) => entry.enabled)
    .map((entry) => definitionsById.get(entry.spellId))
    .filter((definition): definition is SpellDefinition => definition !== undefined);
}

function assertValidLoadout(
  loadout: SpellLoadout,
  availableSpellIds: readonly string[],
): void {
  const errors = validateSpellLoadout(loadout, availableSpellIds);
  if (errors.length > 0) throw new RangeError(errors.join("; "));
}

function assertMaxSlots(maxSlots: number): void {
  if (!Number.isInteger(maxSlots) || maxSlots < 0) {
    throw new RangeError("maxSlots deve ser um inteiro não negativo");
  }
}

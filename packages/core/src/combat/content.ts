import type { SpellDefinition } from "../spells.js";

export interface CombatContentContext {
  readonly spells: readonly SpellDefinition[];
}

export function createCombatContentContext(spells: readonly SpellDefinition[]): CombatContentContext {
  const ids = new Set<string>();
  for (const spell of spells) {
    if (!spell.id.trim() || ids.has(spell.id)) throw new RangeError(`duplicate combat spell: ${spell.id}`);
    ids.add(spell.id);
  }
  return { spells: spells.map((spell) => ({ ...spell })) };
}

export function resolveCombatSpell(context: CombatContentContext, spellId: string): SpellDefinition {
  const definition = context.spells.find((spell) => spell.id === spellId);
  if (!definition) throw new RangeError(`combat spell not found: ${spellId}`);
  return definition;
}

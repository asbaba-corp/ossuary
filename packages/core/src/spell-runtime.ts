import type { SpellAttemptResult, SpellDefinition } from "./spells.js";
import { resolveSpellAttempt } from "./spells.js";
import type { SpellLoadout } from "./spell-loadout.js";
import { validateSpellLoadout } from "./spell-loadout.js";

export interface SpellRuntimeState {
  readonly mana: number;
  readonly maxMana: number;
  readonly cooldowns: Readonly<Record<string, number>>;
}

export interface SpellAutoCastContext {
  readonly hpPercent: number;
  readonly enemyCount: number;
  readonly int: number;
  readonly spellDamagePercent: number;
  readonly seed: number | string;
}

export interface SpellAutoCastEvent {
  readonly spellId: string;
  readonly result: SpellAttemptResult;
}

export interface SpellAutoCastResult {
  readonly runtime: SpellRuntimeState;
  readonly events: readonly SpellAutoCastEvent[];
}

export function createSpellRuntimeState(maxMana: number, mana = maxMana): SpellRuntimeState {
  assertFiniteNonNegative(maxMana, "maxMana");
  assertFiniteNonNegative(mana, "mana");
  if (mana > maxMana) throw new RangeError("mana não pode superar maxMana");
  return { mana, maxMana, cooldowns: {} };
}

export function advanceSpellRuntime(
  runtime: SpellRuntimeState,
  elapsed: number,
): SpellRuntimeState {
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    throw new RangeError("elapsed deve ser não negativo");
  }
  const cooldowns = Object.fromEntries(
    Object.entries(runtime.cooldowns).map(([spellId, cooldown]) => [
      spellId,
      Math.max(0, cooldown - elapsed),
    ]),
  );
  return { ...runtime, cooldowns };
}

export function resolveAutoCastOpportunity(
  loadout: SpellLoadout,
  definitions: readonly SpellDefinition[],
  runtime: SpellRuntimeState,
  context: SpellAutoCastContext,
): SpellAutoCastResult {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const errors = validateSpellLoadout(loadout, definitions.map((definition) => definition.id));
  if (errors.length > 0) throw new RangeError(errors.join("; "));
  assertRuntime(runtime);

  let nextRuntime = runtime;
  const events: SpellAutoCastEvent[] = [];
  for (const entry of loadout.entries) {
    const definition = definitionsById.get(entry.spellId);
    if (!definition) throw new RangeError(`definição de spell ausente: ${entry.spellId}`);
    const cooldownRemaining = nextRuntime.cooldowns[definition.id] ?? 0;
    const result = resolveSpellAttempt(definition, {
      hpPercent: context.hpPercent,
      manaPercent: manaPercent(nextRuntime),
      mana: nextRuntime.mana,
      enemyCount: context.enemyCount,
      int: context.int,
      spellDamagePercent: context.spellDamagePercent,
      cooldownRemaining,
      seed: `${String(context.seed)}:${definition.id}`,
    }, entry.enabled);
    events.push({ spellId: definition.id, result });

    if (result.reason !== "fired") continue;
    nextRuntime = {
      ...nextRuntime,
      mana: result.manaAfter,
      cooldowns: { ...nextRuntime.cooldowns, [definition.id]: result.cooldownAfter },
    };
    break;
  }

  return { runtime: nextRuntime, events };
}

function manaPercent(runtime: SpellRuntimeState): number {
  if (runtime.maxMana === 0) return 0;
  return (runtime.mana / runtime.maxMana) * 100;
}

function assertRuntime(runtime: SpellRuntimeState): void {
  assertFiniteNonNegative(runtime.maxMana, "maxMana");
  assertFiniteNonNegative(runtime.mana, "mana");
  if (runtime.mana > runtime.maxMana) throw new RangeError("mana não pode superar maxMana");
  for (const cooldown of Object.values(runtime.cooldowns)) {
    assertFiniteNonNegative(cooldown, "cooldown");
  }
}

function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} deve ser não negativo`);
  }
}

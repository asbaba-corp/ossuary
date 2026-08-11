import { deterministicUnit } from "./random.js";

export type SpellArchetype = "damage" | "protection" | "control";

export type SpellTrigger =
  | { readonly kind: "cooldown" }
  | { readonly kind: "hpBelow"; readonly thresholdPercent: number }
  | { readonly kind: "manaBelow"; readonly thresholdPercent: number }
  | {
      readonly kind: "enemyCount";
      readonly min?: number;
      readonly max?: number;
    };

export type SpellEffect =
  | {
      readonly kind: "damage";
      readonly damageType: string;
      readonly target: string;
    }
  | {
      readonly kind: "protection";
      readonly protectionType: string;
      readonly duration: number;
    }
  | {
      readonly kind: "control";
      readonly controlType: string;
      readonly duration: number;
      readonly chancePercent: number;
    };

export interface SpellDefinition {
  readonly id: string;
  readonly name: string;
  readonly archetype: SpellArchetype;
  readonly manaCost: number;
  readonly cooldown: number;
  readonly trigger: SpellTrigger;
  readonly effect: SpellEffect;
  readonly scaling: {
    readonly basePower: number;
    readonly intCoefficient: number;
  };
}

export interface SpellAttemptContext {
  readonly hpPercent: number;
  readonly manaPercent: number;
  readonly mana: number;
  readonly enemyCount: number;
  readonly int: number;
  readonly spellDamagePercent: number;
  readonly cooldownRemaining: number;
  readonly seed: number | string;
}

export type SpellAttemptReason =
  | "disabled"
  | "trigger_not_met"
  | "cooldown_remaining"
  | "insufficient_mana"
  | "fired";

export interface SpellAttemptResult {
  readonly reason: SpellAttemptReason;
  readonly manaAfter: number;
  readonly cooldownAfter: number;
  readonly power: number | null;
  readonly controlChanceRoll: number | null;
  readonly controlChanceSucceeded: boolean | null;
}

export function validateSpellDefinition(definition: SpellDefinition): readonly string[] {
  const errors: string[] = [];
  if (!definition.id.trim()) errors.push("id obrigatório");
  if (!definition.name.trim()) errors.push("nome obrigatório");
  if (!Number.isFinite(definition.manaCost) || definition.manaCost < 0) {
    errors.push("custo de mana deve ser não negativo");
  }
  if (!Number.isFinite(definition.cooldown) || definition.cooldown < 0) {
    errors.push("cooldown deve ser não negativo");
  }
  if (!Number.isFinite(definition.scaling.basePower) || definition.scaling.basePower < 0) {
    errors.push("potência base deve ser não negativa");
  }
  if (!Number.isFinite(definition.scaling.intCoefficient) || definition.scaling.intCoefficient < 0) {
    errors.push("coeficiente de INT deve ser não negativo");
  }

  const trigger = definition.trigger;
  if (trigger.kind === "hpBelow" || trigger.kind === "manaBelow") {
    if (!Number.isFinite(trigger.thresholdPercent) || trigger.thresholdPercent < 0 || trigger.thresholdPercent > 100) {
      errors.push("limiar percentual deve estar entre 0 e 100");
    }
  }
  if (trigger.kind === "enemyCount") {
    if (trigger.min === undefined && trigger.max === undefined) errors.push("enemyCount precisa de mínimo ou máximo");
    if (trigger.min !== undefined && (!Number.isInteger(trigger.min) || trigger.min < 0)) errors.push("mínimo de inimigos inválido");
    if (trigger.max !== undefined && (!Number.isInteger(trigger.max) || trigger.max < 0)) errors.push("máximo de inimigos inválido");
    if (trigger.min !== undefined && trigger.max !== undefined && trigger.min > trigger.max) errors.push("mínimo não pode superar máximo");
  }
  if (definition.effect.kind !== definition.archetype) errors.push("efeito e arquétipo devem coincidir");
  if (definition.effect.kind === "protection" || definition.effect.kind === "control") {
    if (!Number.isFinite(definition.effect.duration) || definition.effect.duration < 0) errors.push("duração deve ser não negativa");
  }
  if (definition.effect.kind === "control" && (!Number.isFinite(definition.effect.chancePercent) || definition.effect.chancePercent < 0 || definition.effect.chancePercent > 100)) {
    errors.push("chance de controle deve estar entre 0 e 100");
  }
  return errors;
}

export function calculateSpellPower(
  definition: SpellDefinition,
  int: number,
  spellDamagePercent: number,
): number {
  return (definition.scaling.basePower + int * definition.scaling.intCoefficient) * (1 + spellDamagePercent / 100);
}

export function isSpellTriggerSatisfied(
  trigger: SpellTrigger,
  context: Pick<SpellAttemptContext, "hpPercent" | "manaPercent" | "enemyCount">,
): boolean {
  switch (trigger.kind) {
    case "cooldown":
      return true;
    case "hpBelow":
      return context.hpPercent <= trigger.thresholdPercent;
    case "manaBelow":
      return context.manaPercent <= trigger.thresholdPercent;
    case "enemyCount":
      return (trigger.min === undefined || context.enemyCount >= trigger.min)
        && (trigger.max === undefined || context.enemyCount <= trigger.max);
  }
}

export function resolveSpellAttempt(
  definition: SpellDefinition,
  context: SpellAttemptContext,
  enabled = true,
): SpellAttemptResult {
  const base = {
    manaAfter: context.mana,
    cooldownAfter: Math.max(0, context.cooldownRemaining),
    power: null,
    controlChanceRoll: null,
    controlChanceSucceeded: null,
  } as const;
  if (!enabled) return { ...base, reason: "disabled" };
  if (!isSpellTriggerSatisfied(definition.trigger, context)) return { ...base, reason: "trigger_not_met" };
  if (context.cooldownRemaining > 0) return { ...base, reason: "cooldown_remaining" };
  if (context.mana < definition.manaCost) return { ...base, reason: "insufficient_mana" };

  const result: SpellAttemptResult = {
    reason: "fired",
    manaAfter: context.mana - definition.manaCost,
    cooldownAfter: definition.cooldown,
    power: calculateSpellPower(definition, context.int, context.spellDamagePercent),
    controlChanceRoll: null,
    controlChanceSucceeded: null,
  };
  if (definition.effect.kind !== "control") return result;
  const controlChanceRoll = deterministicUnit(context.seed, `${definition.id}:control`);
  return {
    ...result,
    controlChanceRoll,
    controlChanceSucceeded: controlChanceRoll < definition.effect.chancePercent / 100,
  };
}

export function advanceSpellCooldown(cooldownRemaining: number, elapsed: number): number {
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new RangeError("elapsed deve ser não negativo");
  return Math.max(0, cooldownRemaining - elapsed);
}

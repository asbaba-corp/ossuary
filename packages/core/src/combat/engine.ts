import { resolveAutoCastOpportunity } from "../spell-runtime.js";
import { calculateCombatDamage } from "./damage.js";
import type {
  CombatEvent,
  CombatResolution,
  CombatRules,
  CombatState,
  CombatTickResult,
  CombatantSnapshot,
  CombatantState,
} from "./types.js";

const DEFAULT_CONTROL_CADENCE_MULTIPLIER = 0.5;
const DEFAULT_PROTECTION_REDUCTION_PERCENT = 25;

export function createCombatState(
  snapshots: readonly CombatantSnapshot[],
  seed: number | string,
): CombatState {
  assertSnapshots(snapshots);
  return {
    seed,
    tick: 0,
    elapsedSeconds: 0,
    outcome: "in_progress",
    combatants: snapshots.map(createCombatantState),
  };
}

export function advanceCombatTick(
  state: CombatState,
  rules: CombatRules,
): CombatTickResult {
  assertRules(rules);
  if (state.outcome !== "in_progress") return { state, events: [] };

  const tick = state.tick + 1;
  let combatants: CombatantState[] = state.combatants.map((combatant) => ({
    ...combatant,
    attackCooldown: Math.max(0, combatant.attackCooldown - rules.tickSeconds * cadenceMultiplier(combatant, rules)),
    spellCooldowns: advanceCooldowns(combatant.spellCooldowns, rules.tickSeconds),
    effects: advanceEffects(combatant.effects, rules.tickSeconds),
  }));
  const events: CombatEvent[] = [];

  for (const originalAttacker of state.combatants) {
    let attacker = findCombatant(combatants, originalAttacker.snapshot.id);
    if (attacker.hp <= 0) continue;

    const spellResult = castAvailableSpell(attacker, combatants, state.seed, tick, rules);
    combatants = spellResult.combatants;
    events.push(...spellResult.events);
    attacker = findCombatant(combatants, attacker.snapshot.id);
    const spellOutcome = getOutcome(combatants);
    if (spellOutcome !== "in_progress") {
      events.push(...outcomeEvents(tick, spellOutcome));
      break;
    }

    if (attacker.attackCooldown > 0 || attacker.snapshot.stats.attacksPerSecond <= 0) continue;
    const target = findLivingTarget(combatants, attacker);
    if (!target) continue;

    const damageResult = calculateCombatDamage(
      attacker.snapshot,
      target.snapshot,
      rules,
      `${String(state.seed)}:${tick}:${attacker.snapshot.id}:${target.snapshot.id}`,
    );
    const effectiveDamage = applyProtection(damageResult.damage, target, rules);
    const targetHpAfter = Math.max(0, target.hp - effectiveDamage);
    const attackerHpAfter = Math.min(
      attacker.snapshot.stats.maxHp,
      attacker.hp + damageResult.healing,
    );
    combatants = combatants.map((candidate) => {
      if (candidate.snapshot.id === attacker.snapshot.id) {
        return { ...candidate, hp: attackerHpAfter, attackCooldown: attackInterval(attacker, rules) };
      }
      if (candidate.snapshot.id === target.snapshot.id) return { ...candidate, hp: targetHpAfter };
      return candidate;
    });
    events.push({
      type: "attack",
      tick,
      attackerId: attacker.snapshot.id,
      targetId: target.snapshot.id,
      critical: damageResult.critical,
      damage: effectiveDamage,
      healing: damageResult.healing,
      targetHpAfter,
    });
    if (targetHpAfter === 0) events.push({ type: "combatant_defeated", tick, combatantId: target.snapshot.id });

    const outcome = getOutcome(combatants);
    if (outcome !== "in_progress") {
      events.push(...outcomeEvents(tick, outcome));
      break;
    }
  }

  const nextState: CombatState = {
    ...state,
    tick,
    elapsedSeconds: state.elapsedSeconds + rules.tickSeconds,
    outcome: getOutcome(combatants),
    combatants,
  };
  return { state: nextState, events };
}

export function resolveCombat(
  initialState: CombatState,
  rules: CombatRules,
  maxTicks: number,
): CombatResolution {
  if (!Number.isInteger(maxTicks) || maxTicks < 0) throw new RangeError("maxTicks deve ser inteiro não negativo");
  let state = initialState;
  const events: CombatEvent[] = [];
  for (let index = 0; index < maxTicks && state.outcome === "in_progress"; index += 1) {
    const result = advanceCombatTick(state, rules);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events, completed: state.outcome !== "in_progress" };
}

function castAvailableSpell(
  attacker: CombatantState,
  combatants: readonly CombatantState[],
  seed: number | string,
  tick: number,
  rules: CombatRules,
): { readonly combatants: CombatantState[]; readonly events: readonly CombatEvent[] } {
  const setup = attacker.snapshot.spells;
  if (!setup) return { combatants: [...combatants], events: [] };

  const runtime = {
    mana: attacker.mana,
    maxMana: attacker.maxMana,
    cooldowns: attacker.spellCooldowns,
  };
  const result = resolveAutoCastOpportunity(setup.loadout, setup.definitions, runtime, {
    hpPercent: attacker.hp / attacker.snapshot.stats.maxHp * 100,
    enemyCount: combatants.filter((candidate) => candidate.hp > 0 && candidate.snapshot.side !== attacker.snapshot.side).length,
    int: setup.int,
    spellDamagePercent: setup.spellDamagePercent,
    seed: `${String(seed)}:${tick}:${attacker.snapshot.id}`,
  });
  let nextCombatants: CombatantState[] = combatants.map((candidate) => candidate.snapshot.id === attacker.snapshot.id
    ? { ...candidate, mana: result.runtime.mana, spellCooldowns: result.runtime.cooldowns }
    : candidate);
  const events: CombatEvent[] = result.events.map(({ spellId, result: attempt }) => ({
    type: "spell_attempt",
    tick,
    casterId: attacker.snapshot.id,
    spellId,
    reason: attempt.reason,
    effect: attempt.reason === "fired" ? setup.definitions.find((definition) => definition.id === spellId)?.effect.kind ?? null : null,
    targetId: null,
    power: attempt.power,
    manaAfter: attempt.manaAfter,
    controlSucceeded: attempt.controlChanceSucceeded,
  }));
  const fired = result.events.find(({ result: attempt }) => attempt.reason === "fired");
  if (!fired) return { combatants: nextCombatants, events };

  const definition = setup.definitions.find((candidate) => candidate.id === fired.spellId);
  if (!definition) return { combatants: nextCombatants, events };
  const target = findLivingTarget(nextCombatants, attacker);
  if (definition.effect.kind === "damage" && target && fired.result.power !== null) {
    const damage = spellDamage(fired.result.power, target, rules.defenseConstant);
    nextCombatants = updateHp(nextCombatants, target.snapshot.id, Math.max(0, target.hp - damage));
    setSpellTarget(events, fired.spellId, target.snapshot.id);
    if (target.hp - damage <= 0) events.push({ type: "combatant_defeated", tick, combatantId: target.snapshot.id });
  } else if (definition.effect.kind === "protection") {
    nextCombatants = addEffect(nextCombatants, attacker.snapshot.id, {
      kind: "protection", sourceSpellId: definition.id, remainingSeconds: definition.effect.duration,
    });
    setSpellTarget(events, fired.spellId, attacker.snapshot.id);
  } else if (definition.effect.kind === "control" && target && fired.result.controlChanceSucceeded) {
    nextCombatants = addEffect(nextCombatants, target.snapshot.id, {
      kind: "control", sourceSpellId: definition.id, remainingSeconds: definition.effect.duration,
    });
    setSpellTarget(events, fired.spellId, target.snapshot.id);
  }
  return { combatants: nextCombatants, events };
}

function setSpellTarget(events: CombatEvent[], spellId: string, targetId: string): void {
  const index = events.findIndex((candidate) => candidate.type === "spell_attempt" && candidate.spellId === spellId);
  const event = events[index];
  if (event?.type === "spell_attempt") events[index] = { ...event, targetId };
}

function createCombatantState(snapshot: CombatantSnapshot): CombatantState {
  const maxMana = snapshot.spells?.maxMana ?? 0;
  const initialMana = snapshot.spells?.initialMana ?? maxMana;
  if (initialMana < 0 || initialMana > maxMana) throw new RangeError(`invalid initial mana: ${snapshot.id}`);
  return {
    snapshot,
    hp: snapshot.stats.maxHp,
    attackCooldown: 0,
    mana: initialMana,
    maxMana,
    spellCooldowns: {},
    effects: [],
  };
}

function findLivingTarget(combatants: readonly CombatantState[], attacker: CombatantState): CombatantState | undefined {
  return combatants.find((candidate) => candidate.hp > 0 && candidate.snapshot.side !== attacker.snapshot.side);
}

function updateHp(combatants: readonly CombatantState[], id: string, hp: number): CombatantState[] {
  return combatants.map((candidate) => candidate.snapshot.id === id ? { ...candidate, hp } : candidate);
}

function addEffect(combatants: readonly CombatantState[], id: string, effect: CombatantState["effects"][number]): CombatantState[] {
  return combatants.map((candidate) => candidate.snapshot.id === id
    ? { ...candidate, effects: [...candidate.effects.filter((active) => active.kind !== effect.kind), effect] }
    : candidate);
}

function advanceEffects(effects: CombatantState["effects"], elapsed: number): CombatantState["effects"] {
  return effects.filter((effect) => effect.remainingSeconds > elapsed).map((effect) => ({ ...effect, remainingSeconds: effect.remainingSeconds - elapsed }));
}

function advanceCooldowns(cooldowns: Readonly<Record<string, number>>, elapsed: number): Readonly<Record<string, number>> {
  return Object.fromEntries(Object.entries(cooldowns).map(([id, cooldown]) => [id, Math.max(0, cooldown - elapsed)]));
}

function cadenceMultiplier(combatant: CombatantState, rules: CombatRules): number {
  return combatant.effects.some((effect) => effect.kind === "control")
    ? rules.controlCadenceMultiplier ?? DEFAULT_CONTROL_CADENCE_MULTIPLIER
    : 1;
}

function attackInterval(combatant: CombatantState, rules: CombatRules): number {
  return 1 / combatant.snapshot.stats.attacksPerSecond / cadenceMultiplier(combatant, rules);
}

function applyProtection(damage: number, target: CombatantState, rules: CombatRules): number {
  return target.effects.some((effect) => effect.kind === "protection")
    ? damage * (1 - (rules.protectionReductionPercent ?? DEFAULT_PROTECTION_REDUCTION_PERCENT) / 100)
    : damage;
}

function spellDamage(power: number, target: CombatantState, defenseConstant: number): number {
  return Math.max(0, power * Math.max(0, 1 - target.snapshot.stats.defense / defenseConstant));
}

function outcomeEvents(tick: number, outcome: Exclude<CombatState["outcome"], "in_progress">): CombatEvent[] {
  return [{ type: "outcome", tick, outcome }];
}

function getOutcome(combatants: readonly CombatantState[]): CombatState["outcome"] {
  const partyAlive = combatants.some((combatant) => combatant.snapshot.side === "party" && combatant.hp > 0);
  const enemyAlive = combatants.some((combatant) => combatant.snapshot.side === "enemy" && combatant.hp > 0);
  if (!enemyAlive) return "victory";
  if (!partyAlive) return "defeat";
  return "in_progress";
}

function findCombatant(combatants: readonly CombatantState[], id: string): CombatantState {
  const combatant = combatants.find((candidate) => candidate.snapshot.id === id);
  if (!combatant) throw new RangeError(`combatant not found: ${id}`);
  return combatant;
}

function assertSnapshots(snapshots: readonly CombatantSnapshot[]): void {
  if (snapshots.length === 0) throw new RangeError("combat requires combatants");
  const ids = new Set<string>();
  let hasParty = false;
  let hasEnemy = false;
  for (const snapshot of snapshots) {
    if (!snapshot.id.trim() || !snapshot.name.trim()) throw new RangeError("combatant identity is required");
    if (ids.has(snapshot.id)) throw new RangeError(`duplicate combatant: ${snapshot.id}`);
    ids.add(snapshot.id);
    if (snapshot.side === "party") hasParty = true;
    if (snapshot.side === "enemy") hasEnemy = true;
    assertStats(snapshot);
  }
  if (!hasParty || !hasEnemy) throw new RangeError("combat requires party and enemy sides");
}

function assertStats(snapshot: CombatantSnapshot): void {
  for (const value of Object.values(snapshot.stats)) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`invalid combat stats: ${snapshot.id}`);
  }
  if (snapshot.stats.maxHp <= 0) throw new RangeError(`combatant maxHp must be positive: ${snapshot.id}`);
  if (snapshot.stats.criticalChancePercent > 100) throw new RangeError(`critical chance must be <= 100: ${snapshot.id}`);
  if (snapshot.stats.criticalMultiplier < 1) throw new RangeError(`critical multiplier must be >= 1: ${snapshot.id}`);
}

function assertRules(rules: CombatRules): void {
  if (!Number.isFinite(rules.tickSeconds) || rules.tickSeconds <= 0) throw new RangeError("tickSeconds deve ser positivo");
  if (!Number.isFinite(rules.defenseConstant) || rules.defenseConstant <= 0) throw new RangeError("defenseConstant deve ser positivo");
  if (rules.protectionReductionPercent !== undefined && (!Number.isFinite(rules.protectionReductionPercent) || rules.protectionReductionPercent < 0 || rules.protectionReductionPercent > 100)) throw new RangeError("protectionReductionPercent inválido");
  if (rules.controlCadenceMultiplier !== undefined && (!Number.isFinite(rules.controlCadenceMultiplier) || rules.controlCadenceMultiplier <= 0 || rules.controlCadenceMultiplier > 1)) throw new RangeError("controlCadenceMultiplier inválido");
}

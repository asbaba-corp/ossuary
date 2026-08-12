export const OSSUARY_DERIVED_STATS = [
  "vigor",
  "damage",
  "penetration",
  "cadence",
  "critical",
  "reach",
  "sustain",
  "mana",
] as const;

export type OssuaryDerivedStat = (typeof OSSUARY_DERIVED_STATS)[number];

export interface OssuaryState {
  readonly bones: number;
  readonly milestones: Readonly<Record<string, number>>;
  readonly unlockedUpgradeIds: readonly string[];
}

export type OssuaryUpgradeRequirement =
  | { readonly kind: "bones"; readonly amount: number }
  | { readonly kind: "milestone"; readonly key: string; readonly amount: number };

export interface OssuaryBonus {
  readonly stat: OssuaryDerivedStat;
  readonly percent: number;
}

export interface OssuaryUpgradeDefinition {
  readonly id: string;
  readonly name: string;
  readonly requirements: readonly OssuaryUpgradeRequirement[];
  readonly bonuses: readonly OssuaryBonus[];
}

export function createOssuaryState(): OssuaryState {
  return { bones: 0, milestones: {}, unlockedUpgradeIds: [] };
}

export function validateOssuaryState(state: OssuaryState): readonly string[] {
  const errors: string[] = [];
  if (!isNonNegativeInteger(state.bones)) errors.push("bones deve ser inteiro não negativo");
  const unlocked = new Set<string>();
  for (const id of state.unlockedUpgradeIds) {
    if (!id.trim()) errors.push("upgrade desbloqueado precisa de ID");
    if (unlocked.has(id)) errors.push(`upgrade duplicado: ${id}`);
    unlocked.add(id);
  }
  for (const [key, amount] of Object.entries(state.milestones)) {
    if (!key.trim()) errors.push("marco precisa de chave");
    if (!isNonNegativeInteger(amount)) errors.push(`progresso inválido: ${key}`);
  }
  return errors;
}

export function addOssuaryBones(state: OssuaryState, amount: number): OssuaryState {
  assertValidState(state);
  assertPositiveInteger(amount, "amount");
  return { ...state, bones: state.bones + amount };
}

export function recordOssuaryMilestone(
  state: OssuaryState,
  key: string,
  amount: number,
): OssuaryState {
  assertValidState(state);
  if (!key.trim()) throw new RangeError("marco precisa de chave");
  assertPositiveInteger(amount, "amount");
  return {
    ...state,
    milestones: { ...state.milestones, [key]: (state.milestones[key] ?? 0) + amount },
  };
}

export function validateOssuaryUpgrade(
  definition: OssuaryUpgradeDefinition,
): readonly string[] {
  const errors: string[] = [];
  if (!definition.id.trim()) errors.push("upgrade precisa de ID");
  if (!definition.name.trim()) errors.push("upgrade precisa de nome");
  for (const requirement of definition.requirements) {
    if (requirement.kind === "milestone" && !requirement.key.trim()) {
      errors.push("requisito de marco precisa de chave");
    }
    if (!isPositiveInteger(requirement.amount)) errors.push("requisito precisa de quantidade positiva");
  }
  for (const bonus of definition.bonuses) {
    if (!OSSUARY_DERIVED_STATS.includes(bonus.stat)) errors.push(`derivado inválido: ${bonus.stat}`);
    if (!Number.isFinite(bonus.percent) || bonus.percent < 0) errors.push("bônus deve ser percentual não negativo");
  }
  return errors;
}

export function canUnlockOssuaryUpgrade(
  state: OssuaryState,
  definition: OssuaryUpgradeDefinition,
): boolean {
  assertValidState(state);
  assertValidUpgrade(definition);
  if (state.unlockedUpgradeIds.includes(definition.id)) return false;
  return definition.requirements.every((requirement) => {
    if (requirement.kind === "bones") return state.bones >= requirement.amount;
    return (state.milestones[requirement.key] ?? 0) >= requirement.amount;
  });
}

export function unlockOssuaryUpgrade(
  state: OssuaryState,
  definition: OssuaryUpgradeDefinition,
): OssuaryState {
  if (state.unlockedUpgradeIds.includes(definition.id)) {
    throw new RangeError(`upgrade já desbloqueado: ${definition.id}`);
  }
  if (!canUnlockOssuaryUpgrade(state, definition)) {
    throw new RangeError(`requisitos não atendidos: ${definition.id}`);
  }
  return { ...state, unlockedUpgradeIds: [...state.unlockedUpgradeIds, definition.id] };
}

export function getOssuaryBonuses(
  state: OssuaryState,
  definitions: readonly OssuaryUpgradeDefinition[],
): Readonly<Record<OssuaryDerivedStat, number>> {
  assertValidState(state);
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const bonuses = emptyOssuaryBonuses();
  for (const id of state.unlockedUpgradeIds) {
    const definition = byId.get(id);
    if (!definition) throw new RangeError(`definição de upgrade ausente: ${id}`);
    assertValidUpgrade(definition);
    for (const bonus of definition.bonuses) bonuses[bonus.stat] += bonus.percent;
  }
  return bonuses;
}

export function applyOssuaryBonuses(
  baseValues: Readonly<Record<OssuaryDerivedStat, number>>,
  bonuses: Readonly<Record<OssuaryDerivedStat, number>>,
): Readonly<Record<OssuaryDerivedStat, number>> {
  const result = emptyOssuaryBonuses();
  for (const stat of OSSUARY_DERIVED_STATS) {
    if (!Number.isFinite(baseValues[stat])) throw new RangeError(`valor base inválido: ${stat}`);
    if (!Number.isFinite(bonuses[stat]) || bonuses[stat] < 0) throw new RangeError(`bônus inválido: ${stat}`);
    result[stat] = baseValues[stat] * (1 + bonuses[stat] / 100);
  }
  return result;
}

function emptyOssuaryBonuses(): Record<OssuaryDerivedStat, number> {
  return Object.fromEntries(OSSUARY_DERIVED_STATS.map((stat) => [stat, 0])) as Record<OssuaryDerivedStat, number>;
}

function assertValidState(state: OssuaryState): void {
  const errors = validateOssuaryState(state);
  if (errors.length > 0) throw new RangeError(errors.join("; "));
}

function assertValidUpgrade(definition: OssuaryUpgradeDefinition): void {
  const errors = validateOssuaryUpgrade(definition);
  if (errors.length > 0) throw new RangeError(errors.join("; "));
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!isPositiveInteger(value)) throw new RangeError(`${name} deve ser inteiro positivo`);
}

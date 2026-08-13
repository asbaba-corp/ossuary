import type { DerivedStatFormulas } from "./progression/derived.js";
import type { EquipmentDropEntry, Equipment } from "./equipment.js";
import type { OssuaryUpgradeDefinition } from "./ossuary.js";
import type { CombatRules, CombatantStats } from "./combat/types.js";

export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly stats: CombatantStats;
}

export interface WaveDefinition {
  readonly id: string;
  readonly enemyIds: readonly string[];
  readonly dropTableId: string;
  readonly xpReward: number;
  readonly goldReward: number;
  readonly consumableRuleId: string | null;
}

export interface PhaseDefinition {
  readonly id: string;
  readonly order: number;
  readonly waveIds: readonly string[];
  readonly nextPhaseId: string | null;
  readonly retreatPhaseId: string | null;
}

export interface DropTableDefinition {
  readonly id: string;
  readonly entries: readonly EquipmentDropEntry[];
}

export interface ConsumableRule {
  readonly id: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly goldCost: number;
}

export interface RewardRules {
  readonly goldResourceId: string;
}

export interface RunRules {
  readonly walkingMs: number;
  readonly offlineCapMs: number;
  readonly checkpointEveryWave: boolean;
}

export interface GameContentContext {
  readonly version: string;
  readonly phases: readonly PhaseDefinition[];
  readonly waves: readonly WaveDefinition[];
  readonly enemies: readonly EnemyDefinition[];
  readonly spells: readonly import("./spells.js").SpellDefinition[];
  readonly dropTables: readonly DropTableDefinition[];
  readonly consumables: readonly ConsumableRule[];
  readonly combatRules: CombatRules;
  readonly rewardRules: RewardRules;
  readonly runRules: RunRules;
  readonly derivedStatFormulas: DerivedStatFormulas;
  readonly startingEquipment?: readonly Equipment[];
  readonly ossuaryUpgrades?: readonly OssuaryUpgradeDefinition[];
  readonly startingGold?: number;
}

export function validateGameContent(content: GameContentContext): readonly string[] {
  const errors: string[] = [];
  const checkIds = (values: readonly { readonly id: string }[], label: string) => {
    const ids = new Set<string>();
    for (const value of values) {
      if (!value.id?.trim()) errors.push(`${label} precisa de id`);
      if (ids.has(value.id)) errors.push(`${label} duplicado: ${value.id}`);
      ids.add(value.id);
    }
  };
  if (!content || typeof content !== "object") return ["content inválido"];
  if (!content.version?.trim()) errors.push("content.version obrigatório");
  checkIds(content.phases, "phase");
  checkIds(content.waves, "wave");
  checkIds(content.enemies, "enemy");
  checkIds(content.dropTables, "drop table");
  const phaseIds = new Set(content.phases.map((phase) => phase.id));
  const waveIds = new Set(content.waves.map((wave) => wave.id));
  const enemyIds = new Set(content.enemies.map((enemy) => enemy.id));
  const dropIds = new Set(content.dropTables.map((table) => table.id));
  for (const phase of content.phases) {
    if (phase.waveIds.length === 0) errors.push(`phase sem waves: ${phase.id}`);
    for (const id of phase.waveIds) if (!waveIds.has(id)) errors.push(`wave ausente: ${id}`);
    if (phase.nextPhaseId !== null && !phaseIds.has(phase.nextPhaseId)) errors.push(`next phase ausente: ${phase.nextPhaseId}`);
    if (phase.retreatPhaseId !== null && !phaseIds.has(phase.retreatPhaseId)) errors.push(`retreat phase ausente: ${phase.retreatPhaseId}`);
  }
  for (const wave of content.waves) {
    if (wave.enemyIds.length === 0) errors.push(`wave sem inimigos: ${wave.id}`);
    for (const id of wave.enemyIds) if (!enemyIds.has(id)) errors.push(`enemy ausente: ${id}`);
    if (!dropIds.has(wave.dropTableId)) errors.push(`drop table ausente: ${wave.dropTableId}`);
    if (!Number.isFinite(wave.xpReward) || wave.xpReward < 0 || !Number.isFinite(wave.goldReward) || wave.goldReward < 0) errors.push(`recompensa inválida: ${wave.id}`);
  }
  return errors;
}

export function assertGameContent(content: GameContentContext): void {
  const errors = validateGameContent(content);
  if (errors.length > 0) throw new RangeError(errors.join("; "));
}

export function findPhase(content: GameContentContext, id: string): PhaseDefinition {
  const phase = content.phases.find((candidate) => candidate.id === id);
  if (!phase) throw new RangeError(`phase não encontrada: ${id}`);
  return phase;
}

export function findWave(content: GameContentContext, id: string): WaveDefinition {
  const wave = content.waves.find((candidate) => candidate.id === id);
  if (!wave) throw new RangeError(`wave não encontrada: ${id}`);
  return wave;
}

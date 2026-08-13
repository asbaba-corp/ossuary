import { addItem, createInventory, removeItem, type Inventory } from "./inventory.js";
import { applyEconomyTransaction, createEconomyState, GOLD_RESOURCE, type EconomyState } from "./economy.js";
import { createOssuaryState, OSSUARY_DERIVED_STATS, type OssuaryState } from "./ossuary.js";
import { createRoster, createParty, gainPartyExperience, type Party, type RosterState } from "./party.js";
import { createCombatantsFromParty } from "./combat/character-adapter.js";
import { createCombatState, advanceCombatTick, type CombatState, type CombatEvent } from "./combat/index.js";
import { createEquipmentFromDropTable } from "./equipment/legacy.js";
import { deterministicUnit } from "./random.js";
import { assertGameContent, findPhase, findWave, type GameContentContext } from "./game-content.js";

export interface WorldProgressState { readonly unlockedPhaseIds: readonly string[]; readonly clearedPhaseIds: readonly string[]; readonly selectedFarmPhaseId: string; }
export interface RunCheckpoint { readonly checkpointId: string; readonly sequence: number; readonly lastResolvedWaveIndex: number; readonly appliedRewardIds: readonly string[]; }
export interface RunState { readonly phaseId: string; readonly seed: number | string; readonly status: "walking" | "combat" | "completed" | "retreating"; readonly waveIndex: number; readonly distanceToWave: number; readonly combat: CombatState | null; readonly checkpoint: RunCheckpoint; }
export interface GameStateMetadata { readonly lastUpdatedAtMs: number; readonly pendingSync: boolean; readonly seq: number; readonly deviceId: string; }
export interface GameState { readonly schemaVersion: number; readonly contentVersion: string; readonly roster: RosterState; readonly party: Party; readonly inventory: Inventory; readonly economy: EconomyState; readonly ossuary: OssuaryState; readonly world: WorldProgressState; readonly run: RunState | null; readonly metadata: GameStateMetadata; }
export type GameAction = { readonly type: "start_run"; readonly phaseId?: string; readonly seed?: number | string } | { readonly type: "select_farm_phase"; readonly phaseId: string } | { readonly type: "retreat" };
export type GameEvent = { readonly type: "run_started" | "wave_started" | "wave_victory" | "phase_unlocked" | "run_defeat" | "run_retreat" | "checkpoint_saved"; readonly phaseId?: string; readonly waveIndex?: number; readonly rewardId?: string } | { readonly type: "combat"; readonly event: CombatEvent };
export interface GameTransition { readonly state: GameState; readonly events: readonly GameEvent[]; }

export function createInitialGameState(content: GameContentContext, deviceId = "local"): GameState {
  assertGameContent(content);
  const first = content.phases.find((phase) => phase.order === 0) ?? content.phases[0];
  if (!first) throw new RangeError("content não possui fase inicial");
  return { schemaVersion: 1, contentVersion: content.version, roster: createRoster(), party: createParty(), inventory: createInventory(), economy: { ...createEconomyState(), account: { [GOLD_RESOURCE]: 10 } }, ossuary: createOssuaryState(), world: { unlockedPhaseIds: [first.id], clearedPhaseIds: [], selectedFarmPhaseId: first.id }, run: null, metadata: { lastUpdatedAtMs: 0, pendingSync: false, seq: 0, deviceId } };
}

export function applyGameAction(state: GameState, action: GameAction, content: GameContentContext): GameTransition {
  assertGameContent(content);
  if (action.type === "select_farm_phase") {
    if (!state.world.unlockedPhaseIds.includes(action.phaseId)) throw new RangeError(`fase bloqueada: ${action.phaseId}`);
    return { state: { ...state, world: { ...state.world, selectedFarmPhaseId: action.phaseId } }, events: [] };
  }
  if (action.type === "retreat") return retreat(state, content, "manual");
  if (state.run && state.run.status !== "completed") throw new RangeError("já existe uma run em andamento");
  const phaseId = action.phaseId ?? state.world.selectedFarmPhaseId;
  if (!state.world.unlockedPhaseIds.includes(phaseId)) throw new RangeError(`fase bloqueada: ${phaseId}`);
  const checkpoint = makeCheckpoint(0, -1, []);
  return { state: { ...state, run: { phaseId, seed: action.seed ?? 1, status: "walking", waveIndex: 0, distanceToWave: content.runRules.walkingMs, combat: null, checkpoint }, metadata: { ...state.metadata, pendingSync: true } }, events: [{ type: "run_started", phaseId }] };
}

export function tickGameState(state: GameState, deltaMs: number, content: GameContentContext): GameTransition {
  assertGameContent(content);
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError("deltaMs deve ser não negativo");
  if (!state.run || state.run.status === "completed") return { state, events: [] };
  let next = state;
  const events: GameEvent[] = [];
  let remaining = Math.min(deltaMs, content.runRules.offlineCapMs);
  while (remaining > 0 && next.run && next.run.status !== "completed" && events.length < 2000) {
    const run = next.run;
    if (run.status === "walking") {
      const used = Math.min(remaining, run.distanceToWave);
      remaining -= used;
      const distance = run.distanceToWave - used;
      if (distance > 0) { next = { ...next, run: { ...run, distanceToWave: distance } }; continue; }
      const wave = findWaveForRun(next, content);
      const combatants = createCombatantsForWave(next, content, wave.enemyIds, run.seed, run.waveIndex);
      next = { ...next, run: { ...run, status: "combat", distanceToWave: 0, combat: createCombatState(combatants, `${String(run.seed)}:${run.waveIndex}`) } };
      events.push({ type: "wave_started", phaseId: run.phaseId, waveIndex: run.waveIndex });
      continue;
    }
    if (run.status === "combat" && run.combat) {
      const step = content.combatRules.tickSeconds * 1000;
      if (remaining < step) break;
      remaining -= step;
      const result = advanceCombatTick(run.combat, content.combatRules, { spells: content.spells });
      events.push(...result.events.map((event) => ({ type: "combat" as const, event })));
      next = { ...next, run: { ...run, combat: result.state } };
      if (result.state.outcome === "victory") next = resolveVictory(next, content, events);
      else if (result.state.outcome === "defeat") { const retreatResult = retreat(next, content, "defeat"); next = retreatResult.state; events.push(...retreatResult.events); }
    }
  }
  return { state: next, events };
}

function resolveVictory(state: GameState, content: GameContentContext, events: GameEvent[]): GameState {
  const run = state.run!; const wave = findWaveForRun(state, content); const rewardId = `${run.phaseId}:${run.waveIndex}`;
  if (run.checkpoint.appliedRewardIds.includes(rewardId)) return state;
  const experience = gainPartyExperience(state.roster, state.party, wave.xpReward);
  let economy = applyEconomyTransaction(state.economy, { scope: "account", resourceId: GOLD_RESOURCE, direction: "credit", amount: wave.goldReward, reason: `wave:${wave.id}` }).state;
  let inventory = state.inventory;
  const table = content.dropTables.find((candidate) => candidate.id === wave.dropTableId)!;
  inventory = addItem(inventory, { item: createEquipmentFromDropTable(`${rewardId}:${Math.floor(deterministicUnit(run.seed, rewardId) * 1e9)}`, `${String(run.seed)}:${rewardId}`, table.entries), quantity: 1 });
  if (wave.consumableRuleId) {
    const rule = content.consumables.find((candidate) => candidate.id === wave.consumableRuleId);
    if (rule) { inventory = removeItem(inventory, rule.itemId, rule.quantity); economy = applyEconomyTransaction(economy, { scope: "account", resourceId: GOLD_RESOURCE, direction: "debit", amount: rule.goldCost, reason: `consumable:${rule.id}` }).state; }
  }
  const phase = findPhase(content, run.phaseId); const last = run.waveIndex >= phase.waveIds.length - 1;
  const cleared = last && !state.world.clearedPhaseIds.includes(phase.id) ? [...state.world.clearedPhaseIds, phase.id] : [...state.world.clearedPhaseIds];
  const unlocked = [...state.world.unlockedPhaseIds]; const eventsToAdd: GameEvent[] = [{ type: "wave_victory", phaseId: phase.id, waveIndex: run.waveIndex, rewardId }];
  if (last && phase.nextPhaseId && !unlocked.includes(phase.nextPhaseId)) { unlocked.push(phase.nextPhaseId); eventsToAdd.push({ type: "phase_unlocked", phaseId: phase.nextPhaseId }); }
  events.push(...eventsToAdd);
  const checkpoint = makeCheckpoint(run.checkpoint.sequence + 1, run.waveIndex, [...run.checkpoint.appliedRewardIds, rewardId]);
  if (last) return { ...state, roster: experience.roster, inventory, economy, world: { ...state.world, clearedPhaseIds: cleared, unlockedPhaseIds: unlocked }, run: { ...run, status: "completed", combat: null, checkpoint }, metadata: { ...state.metadata, pendingSync: true } };
  return { ...state, roster: experience.roster, inventory, economy, world: { ...state.world, clearedPhaseIds: cleared, unlockedPhaseIds: unlocked }, run: { ...run, status: "walking", waveIndex: run.waveIndex + 1, distanceToWave: content.runRules.walkingMs, combat: null, checkpoint }, metadata: { ...state.metadata, pendingSync: true } };
}

function retreat(state: GameState, content: GameContentContext, reason: string): GameTransition {
  const run = state.run; if (!run) return { state, events: [] };
  const phase = findPhase(content, run.phaseId); const fallback = phase.retreatPhaseId ?? state.world.selectedFarmPhaseId;
  const target = state.world.unlockedPhaseIds.includes(fallback) ? fallback : state.world.selectedFarmPhaseId;
  const next = { ...state, world: { ...state.world, selectedFarmPhaseId: target }, run: { ...run, phaseId: target, status: "retreating" as const, waveIndex: 0, distanceToWave: content.runRules.walkingMs, combat: null, checkpoint: makeCheckpoint(run.checkpoint.sequence + 1, -1, []) }, metadata: { ...state.metadata, pendingSync: true } };
  return { state: { ...next, run: { ...next.run!, status: "walking" } }, events: [{ type: reason === "defeat" ? "run_defeat" : "run_retreat", phaseId: target }] };
}

function findWaveForRun(state: GameState, content: GameContentContext) { const phase = findPhase(content, state.run!.phaseId); const id = phase.waveIds[state.run!.waveIndex]; if (!id) throw new RangeError("índice de wave inválido"); return findWave(content, id); }
function createCombatantsForWave(state: GameState, content: GameContentContext, enemyIds: readonly string[], seed: number | string, waveIndex: number) {
  const party = createCombatantsFromParty(state.roster, state.party, { side: "party", itemEffects: { activeEffects: [] }, formulas: content.derivedStatFormulas, ossuaryBonuses: Object.fromEntries(OSSUARY_DERIVED_STATS.map((id) => [id, 0])) as never });
  const enemies = enemyIds.map((id, index) => { const enemy = content.enemies.find((candidate) => candidate.id === id); if (!enemy) throw new RangeError(`enemy ausente: ${id}`); return { id: `${id}:${waveIndex}:${index}`, name: enemy.name, side: "enemy" as const, stats: enemy.stats }; });
  return [...party, ...enemies];
}
function makeCheckpoint(sequence: number, lastResolvedWaveIndex: number, appliedRewardIds: readonly string[]): RunCheckpoint { return { checkpointId: `checkpoint-${sequence}`, sequence, lastResolvedWaveIndex, appliedRewardIds }; }

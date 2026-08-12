import type { GameState } from "./game-state.js";

export interface SerializedSave {
  readonly schemaVersion: number;
  readonly contentVersion: string;
  readonly payload: unknown;
}

export interface SaveStore {
  load(): Promise<SerializedSave | null>;
  save(save: SerializedSave): Promise<void>;
  clear(): Promise<void>;
}

export interface Clock { nowMs(): number; }
export interface SyncRequest { readonly expectedSeq: number; readonly save: SerializedSave; readonly deviceId: string; }
export interface RemoteSave { readonly seq: number; readonly save: SerializedSave; readonly deviceId: string; }
export interface SyncResponse { readonly accepted: boolean; readonly remote: RemoteSave | null; }
export interface SyncClient { pull(): Promise<RemoteSave | null>; push(request: SyncRequest): Promise<SyncResponse>; clear?(): Promise<void>; }

export const CURRENT_SAVE_SCHEMA_VERSION = 1;

export function serializeGameState(state: GameState): SerializedSave {
  return { schemaVersion: CURRENT_SAVE_SCHEMA_VERSION, contentVersion: state.contentVersion, payload: cloneJson(state) };
}

export function migrateSave(blob: SerializedSave): SerializedSave {
  if (!blob || blob.schemaVersion !== CURRENT_SAVE_SCHEMA_VERSION) throw new RangeError(`schema de save não suportado: ${blob?.schemaVersion}`);
  if (!blob.contentVersion?.trim()) throw new RangeError("contentVersion do save é obrigatório");
  return { schemaVersion: blob.schemaVersion, contentVersion: blob.contentVersion, payload: cloneJson(blob.payload) };
}

export function validateGameState(input: unknown): readonly string[] {
  const errors: string[] = [];
  const state = input as Partial<GameState> | null;
  if (!state || typeof state !== "object") return ["game state inválido"];
  if (state.schemaVersion !== CURRENT_SAVE_SCHEMA_VERSION) errors.push("schemaVersion inválido");
  if (!state.contentVersion?.trim()) errors.push("contentVersion obrigatório");
  if (!state.roster || !state.party || !state.inventory || !state.economy || !state.ossuary || !state.world || !state.metadata) errors.push("game state incompleto");
  if (state.run !== null && state.run !== undefined && (!state.run.phaseId || !Number.isInteger(state.run.waveIndex))) errors.push("run inválida");
  return errors;
}

export function deserializeGameState(blob: SerializedSave): GameState {
  const migrated = migrateSave(blob);
  const errors = validateGameState(migrated.payload);
  if (errors.length > 0) throw new RangeError(errors.join("; "));
  return cloneJson(migrated.payload) as GameState;
}

function cloneJson<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

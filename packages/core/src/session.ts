import { applyGameAction, createInitialGameState, tickGameState, type GameAction, type GameEvent, type GameState } from "./game-state.js";
import { deserializeGameState, serializeGameState, type Clock, type SaveStore, type SyncClient } from "./save.js";
import type { GameContentContext } from "./game-content.js";

export interface GameSessionDependencies {
  readonly saveStore: SaveStore;
  readonly clock: Clock;
  readonly content: GameContentContext;
  readonly sync?: SyncClient;
  readonly deviceId?: string;
  readonly createInitialState?: (content: GameContentContext, deviceId: string | undefined) => GameState;
}

export class GameSession {
  private current: GameState | null = null;
  public constructor(private readonly dependencies: GameSessionDependencies) {}

  get state(): GameState { if (!this.current) throw new Error("sessão ainda não foi carregada"); return this.current; }

  async load(): Promise<GameState> {
    const blob = await this.dependencies.saveStore.load();

    /* Save de outro conteúdo é save de outro jogo, e recarregá-lo aqui não dá
       "progresso antigo": dá um estado que aponta para fases e itens que não
       existem mais, e o primeiro tick morre procurando por eles. Trocar o
       mundo que o app carrega é justamente o caso que produz isso.

       Enquanto não houver migração de conteúdo, o save divergente é
       descartado e a partida recomeça — perder progresso de teste é barato,
       um app que não abre não é. */
    const compativel = blob?.contentVersion === this.dependencies.content.version;
    this.current = blob && compativel
      ? deserializeGameState(blob)
      : (this.dependencies.createInitialState?.(this.dependencies.content, this.dependencies.deviceId)
        ?? createInitialGameState(this.dependencies.content, this.dependencies.deviceId));
    let remote;
    try {
      remote = await this.dependencies.sync?.pull();
    } catch {
      // Local progress remains playable while the development API is starting
      // or temporarily unavailable. The next save retries the sync.
      remote = null;
    }
    if (remote && remote.seq > this.current.metadata.seq) {
      const remoteState = deserializeGameState(remote.save);
      this.current = { ...remoteState, metadata: { ...remoteState.metadata, seq: remote.seq, pendingSync: false } };
      await this.dependencies.saveStore.save(serializeGameState(this.current));
    }
    return this.current;
  }

  async action(action: GameAction): Promise<readonly GameEvent[]> { this.ensureLoaded(); const transition = applyGameAction(this.current!, action, this.dependencies.content); this.current = this.touch(transition.state); await this.save(); return transition.events; }
  async tick(deltaMs: number): Promise<readonly GameEvent[]> { this.ensureLoaded(); const transition = tickGameState(this.current!, deltaMs, this.dependencies.content); this.current = this.touch(transition.state); if (transition.events.length > 0 || this.current.metadata.pendingSync) await this.save(); return transition.events; }

  async save(): Promise<void> {
    this.ensureLoaded();
    await this.dependencies.saveStore.save(serializeGameState(this.current!));
    if (!this.dependencies.sync || !this.current!.metadata.pendingSync) return;

    let response;
    try {
      response = await this.dependencies.sync.push({
        expectedSeq: this.current!.metadata.seq,
        save: serializeGameState(this.current!),
        deviceId: this.current!.metadata.deviceId,
      });
    } catch {
      return;
    }
    if (!response.accepted) {
      if (response.remote && response.remote.seq > this.current!.metadata.seq) {
        this.current = deserializeGameState(response.remote.save);
        await this.dependencies.saveStore.save(serializeGameState(this.current));
      }
      return;
    }
    const remote = response.remote;
    if (remote) {
      this.current = { ...this.current!, metadata: { ...this.current!.metadata, seq: remote.seq, pendingSync: false } };
      await this.dependencies.saveStore.save(serializeGameState(this.current));
    }
  }
  async reset(): Promise<GameState> {
    await this.dependencies.saveStore.clear();
    try {
      await this.dependencies.sync?.clear?.();
    } catch {
      // Reset local development state even when the remote API is offline.
    }
    this.current = null;
    return this.load();
  }
  async sync(): Promise<void> {
    if (!this.dependencies.sync) return;
    this.ensureLoaded();
    const remote = await this.dependencies.sync.pull();
    if (remote && remote.seq > this.current!.metadata.seq) {
      const remoteState = deserializeGameState(remote.save);
      this.current = { ...remoteState, metadata: { ...remoteState.metadata, seq: remote.seq, pendingSync: false } };
      await this.dependencies.saveStore.save(serializeGameState(this.current));
    }
  }
  private touch(state: GameState): GameState { return { ...state, metadata: { ...state.metadata, lastUpdatedAtMs: this.dependencies.clock.nowMs(), pendingSync: true } }; }
  private ensureLoaded(): void { if (!this.current) throw new Error("chame load() antes de usar a sessão"); }
}

import { addItem, createInventory, removeItem, type Inventory } from "./inventory.js";
import { applyEconomyTransaction, createEconomyState, GOLD_RESOURCE, type EconomyState, getAccountBalance } from "./economy.js";
import { createOssuaryState, getOssuaryBonuses, type OssuaryState } from "./ossuary.js";
import { autoEquipEmptySlots } from "./auto-equip.js";
import { createRoster, createParty, gainPartyExperience, type Party, type RosterState } from "./party.js";
import { createCombatantsFromParty } from "./combat/character-adapter.js";
import { createCombatState, advanceCombatTick, type CombatState, type CombatEvent } from "./combat/index.js";
import { createEquipmentFromDropTable, equipEquipment } from "./equipment.js";
import { equipSpell } from "./spell-loadout.js";
import { deterministicUnit } from "./random.js";
import { assertGameContent, findPhase, findWave, type GameContentContext } from "./game-content.js";

export interface WorldProgressState { readonly unlockedPhaseIds: readonly string[]; readonly clearedPhaseIds: readonly string[]; readonly selectedFarmPhaseId: string; }
export interface RunCheckpoint { readonly checkpointId: string; readonly sequence: number; readonly lastResolvedWaveIndex: number; readonly appliedRewardIds: readonly string[]; }
export interface RunMetrics { readonly kills: number; readonly loot: number; readonly dust: number; readonly retreats: number; }
export interface RunState { readonly phaseId: string; readonly seed: number | string; readonly status: "walking" | "combat" | "completed" | "retreating"; readonly waveIndex: number; readonly distanceToWave: number; readonly combat: CombatState | null; readonly checkpoint: RunCheckpoint; readonly metrics?: RunMetrics; readonly vitals?: Readonly<Record<string, { readonly hp: number; readonly mana: number }>>; }
export interface GameStateMetadata { readonly lastUpdatedAtMs: number; readonly pendingSync: boolean; readonly seq: number; readonly deviceId: string; }
export interface PotionSetting { readonly on: boolean; readonly cost: number; readonly heal: number; readonly at: number }
export interface PotionSettings { readonly hp: PotionSetting; readonly mp: PotionSetting }

/** Preferência de fábrica: bebe vida a 45%, mana desligada — sem magia
    implementada, nada gasta mana. */
export const DEFAULT_POTION_SETTINGS: PotionSettings = {
  hp: { on: true, cost: 50, heal: 45, at: 0.45 },
  mp: { on: false, cost: 50, heal: 40, at: 0.35 },
};

export interface GameState { readonly schemaVersion: number; readonly contentVersion: string; readonly roster: RosterState; readonly party: Party; readonly inventory: Inventory; readonly economy: EconomyState; readonly ossuary: OssuaryState; readonly world: WorldProgressState; readonly run: RunState | null; readonly potions?: PotionSettings; readonly metadata: GameStateMetadata; }
export type GameAction = { readonly type: "set_potions"; readonly settings: PotionSettings } | { readonly type: "start_run"; readonly phaseId?: string; readonly seed?: number | string } | { readonly type: "select_farm_phase"; readonly phaseId: string } | { readonly type: "retreat" } | { readonly type: "abandon_run" };
export type GameEvent = { readonly type: "potion_used"; readonly combatantId: string; readonly kind: "hp" | "mp"; readonly amount: number; readonly cost: number } | { readonly type: "run_started" | "wave_started" | "wave_victory" | "phase_unlocked" | "run_defeat" | "run_retreat" | "checkpoint_saved"; readonly phaseId?: string; readonly waveIndex?: number; readonly rewardId?: string } | { readonly type: "combat"; readonly event: CombatEvent };
export interface GameTransition { readonly state: GameState; readonly events: readonly GameEvent[]; }

export function createInitialGameState(content: GameContentContext, deviceId = "local"): GameState {
  assertGameContent(content);
  const first = content.phases.find((phase) => phase.order === 0) ?? content.phases[0];
  if (!first) throw new RangeError("content não possui fase inicial");
  const initial = createRoster();
  const characterId = initial.characters[0]!.id;
  let spellLoadout = initial.spellLoadouts[characterId]!;
  if (content.spells[0]) spellLoadout = equipSpell(spellLoadout, content.spells.map(({ id }) => id), content.spells[0].id);
  let loadout = initial.equipmentLoadouts[characterId]!;
  for (const equipment of content.startingEquipment ?? []) loadout = equipEquipment(loadout, equipment);
  const roster: RosterState = { ...initial, equipmentLoadouts: { ...initial.equipmentLoadouts, [characterId]: loadout }, spellLoadouts: { ...initial.spellLoadouts, [characterId]: spellLoadout } };
  return { schemaVersion: 1, contentVersion: content.version, roster, party: createParty(), inventory: createInventory(), economy: { ...createEconomyState(), account: { [GOLD_RESOURCE]: content.startingGold ?? 10 } }, ossuary: createOssuaryState(), world: { unlockedPhaseIds: [first.id], clearedPhaseIds: [], selectedFarmPhaseId: first.id }, run: null, metadata: { lastUpdatedAtMs: 0, pendingSync: false, seq: 0, deviceId } };
}

export function applyGameAction(state: GameState, action: GameAction, content: GameContentContext): GameTransition {
  assertGameContent(content);
  if (action.type === "select_farm_phase") {
    if (!state.world.unlockedPhaseIds.includes(action.phaseId)) throw new RangeError(`fase bloqueada: ${action.phaseId}`);
    return { state: { ...state, world: { ...state.world, selectedFarmPhaseId: action.phaseId } }, events: [] };
  }
  if (action.type === "set_potions") {
    return { state: { ...state, potions: action.settings, metadata: { ...state.metadata, pendingSync: true } }, events: [] };
  }
  if (action.type === "retreat") return retreat(state, content, "manual");

  /* Abandonar é diferente de recuar: recuar volta uma fase e conta derrota,
     abandonar só encerra a run em curso sem punição. É o que o jogador faz ao
     escolher outra noite no HUD — trocar de alvo não é fracassar.

     Sem isto, `start_run` batia na guarda de "já existe uma run em andamento"
     e a troca de noite falhava calada. */
  if (action.type === "abandon_run") {
    if (!state.run || state.run.status === "completed") return { state, events: [] };
    return {
      state: { ...state, run: { ...state.run, status: "completed", combat: null }, metadata: { ...state.metadata, pendingSync: true } },
      events: [{ type: "run_retreat", phaseId: state.run.phaseId }],
    };
  }
  if (state.run && state.run.status !== "completed") throw new RangeError("já existe uma run em andamento");
  const phaseId = action.phaseId ?? state.world.selectedFarmPhaseId;
  if (!state.world.unlockedPhaseIds.includes(phaseId)) throw new RangeError(`fase bloqueada: ${phaseId}`);
  const checkpoint = makeCheckpoint(0, -1, []);
  return { state: { ...state, run: { phaseId, seed: action.seed ?? 1, status: "walking", waveIndex: 0, distanceToWave: content.runRules.walkingMs, combat: null, checkpoint, metrics: { kills: 0, loot: 0, dust: 0, retreats: 0 } }, metadata: { ...state.metadata, pendingSync: true } }, events: [{ type: "run_started", phaseId }] };
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
      let combate = createCombatState(combatants, `${String(run.seed)}:${run.waveIndex}`);

      /* A VIDA DA PARTY ATRAVESSA A ONDA.
         Cada `createCombatState` nasce com todo mundo no máximo, e isso curava
         a party de graça a cada onda: entrar na onda 2 devolvia a vida
         inteira. Com cura grátis a cada onda nada sustenta pressão dentro de
         uma noite e poção nunca precisa ser bebida.

         A noite continua sendo o descanso: `start_run` cria a run do zero e
         não passa por aqui, então abrir uma noite restaura. O que persiste é
         de onda para onda, dentro da mesma noite. Inimigo não herda nada —
         cada onda traz bichos novos. */
      if (run.vitals) {
        const guardado = run.vitals;
        combate = {
          ...combate,
          combatants: combate.combatants.map((combatente) => {
            if (combatente.snapshot.side !== "party") return combatente;
            const anterior = guardado[combatente.snapshot.id];
            if (!anterior) return combatente;
            return {
              ...combatente,
              hp: Math.max(1, Math.min(combatente.snapshot.stats.maxHp, anterior.hp)),
              mana: Math.max(0, Math.min(combatente.maxMana, anterior.mana)),
            };
          }),
        };
      }
      next = { ...next, run: { ...run, status: "combat", distanceToWave: 0, combat: combate } };
      events.push({ type: "wave_started", phaseId: run.phaseId, waveIndex: run.waveIndex });
      continue;
    }
    if (run.status === "combat" && run.combat) {
      const step = content.combatRules.tickSeconds * 1000;
      if (remaining < step) break;
      remaining -= step;
      const result = advanceCombatTick(run.combat, content.combatRules, { spells: content.spells });
      events.push(...result.events.map((event) => ({ type: "combat" as const, event })));
      const caidos = result.events.filter((event): event is Extract<CombatEvent, { type: "combatant_defeated" }> =>
        event.type === "combatant_defeated"
        && run.combat?.combatants.find(({ snapshot }) => snapshot.id === event.combatantId)?.snapshot.side === "enemy");
      const defeatedEnemies = caidos.length;

      /* OURO POR BICHO, e não só por onda.
         Antes o ouro só entrava na vitória da onda: matar dez bichos e morrer
         no décimo primeiro não rendia nada, e o contador ficava parado durante
         a luta inteira. Agora cada queda paga na hora, dentro da faixa do
         bicho — a faixa é o que faz a caça parecer caça, e o sorteio é
         determinístico pela seed, então o mesmo save rende o mesmo ouro. */
      let ouroDosCaidos = 0;
      for (const caido of caidos) {
        /* O id do combatente é `${enemyId}:${onda}:${índice}`; os dois últimos
           segmentos são posição, o resto é a espécie. */
        const partes = caido.combatantId.split(":");
        const especie = partes.slice(0, -2).join(":");
        const faixa = content.enemies.find(({ id }) => id === especie)?.goldRange;
        if (!faixa) continue;
        const [minimo, maximo] = faixa;
        const sorte = deterministicUnit(run.seed, `ouro:${caido.combatantId}:${run.waveIndex}`);
        ouroDosCaidos += Math.round(minimo + sorte * (maximo - minimo));
      }
      let economiaAgora = next.economy;
      if (ouroDosCaidos > 0) {
        economiaAgora = applyEconomyTransaction(economiaAgora, { scope: "account", resourceId: GOLD_RESOURCE, direction: "credit", amount: ouroDosCaidos, reason: "abate" }).state;
        economiaAgora = applyEconomyTransaction(economiaAgora, { scope: "run", resourceId: GOLD_RESOURCE, direction: "credit", amount: ouroDosCaidos, reason: "abate" }).state;
      }

      next = { ...next, economy: economiaAgora, run: { ...run, combat: result.state, metrics: { kills: (run.metrics?.kills ?? 0) + defeatedEnemies, loot: (run.metrics?.loot ?? 0) + ouroDosCaidos, dust: run.metrics?.dust ?? 0, retreats: run.metrics?.retreats ?? 0 } } };
      /* A PARTY BEBE.
         Aqui, e não no cliente, porque quem sabe a vida real é o motor e é ele
         que roda offline. A regra do §5.3: só bebe se o ouro cobrir — nunca
         deixa o saldo negativo — e só abaixo do limiar que o jogador escolheu.

         Um gole por tick por personagem, de propósito: beber em rajada até
         encher apagaria a tensão e esvaziaria a bolsa num quadro. */
      const ajustes = next.potions ?? DEFAULT_POTION_SETTINGS;
      if (ajustes.hp.on && next.run?.combat) {
        let combateAtual = next.run.combat;
        let economiaPocao = next.economy;
        let bebidas = 0;
        for (const combatente of combateAtual.combatants) {
          if (combatente.snapshot.side !== "party") continue;
          const maximo = combatente.snapshot.stats.maxHp;
          if (combatente.hp <= 0 || combatente.hp > maximo * ajustes.hp.at) continue;
          if (getAccountBalance(economiaPocao, GOLD_RESOURCE) < ajustes.hp.cost) continue;
          economiaPocao = applyEconomyTransaction(economiaPocao, { scope: "account", resourceId: GOLD_RESOURCE, direction: "debit", amount: ajustes.hp.cost, reason: "pocao-vida" }).state;
          economiaPocao = applyEconomyTransaction(economiaPocao, { scope: "run", resourceId: GOLD_RESOURCE, direction: "debit", amount: ajustes.hp.cost, reason: "pocao-vida" }).state;
          combateAtual = { ...combateAtual, combatants: combateAtual.combatants.map((c) => c.snapshot.id === combatente.snapshot.id ? { ...c, hp: Math.min(maximo, c.hp + ajustes.hp.heal) } : c) };
          bebidas += 1;
          events.push({ type: "potion_used", combatantId: combatente.snapshot.id, kind: "hp", amount: ajustes.hp.heal, cost: ajustes.hp.cost });
        }
        if (bebidas > 0) next = { ...next, economy: economiaPocao, run: { ...next.run, combat: combateAtual } };
      }

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
  let roster = experience.roster;
  let economy = applyEconomyTransaction(state.economy, { scope: "account", resourceId: GOLD_RESOURCE, direction: "credit", amount: wave.goldReward, reason: `wave:${wave.id}` }).state;
  economy = applyEconomyTransaction(economy, { scope: "run", resourceId: GOLD_RESOURCE, direction: "credit", amount: wave.goldReward, reason: `wave:${wave.id}` }).state;
  let inventory = state.inventory;
  const table = content.dropTables.find((candidate) => candidate.id === wave.dropTableId)!;
  /* Cada drop é um item físico distinto, mesmo saindo da mesma wave com a
     mesma seed. O id antigo era phaseId:waveIndex:hash(seed) — determinístico —,
     então farmar a mesma fase de novo gerava a mesma instância e o inventário
     recusava com "equipment instance is already in inventory", derrubando o
     tick. Num jogo idle, cujo loop inteiro é repetir a fase de melhor saldo,
     isso quebra a proposta.

     Nem a sequência do checkpoint resolve: ela reinicia a cada run, então duas
     passagens pela mesma fase voltam a colidir. A unicidade é conferida contra
     o que está de fato na mochila, que é a única fonte que sabe o que já existe.
     O sorteio da peça segue determinístico: só a identidade muda. */
  const idBase = `${rewardId}:${Math.floor(deterministicUnit(run.seed, rewardId) * 1e9)}`;
  let instanciaId = idBase;
  // só equipamento tem instanceId; consumível empilha por id e não entra aqui
  const jaExiste = (id: string) => inventory.items.some(({ item }) => item.kind === "equipment" && item.instanceId === id);
  for (let n = 1; jaExiste(instanciaId); n++) {
    instanciaId = `${idBase}#${n}`;
  }
  /* Mochila cheia não pode parar a caça (core-design §5.4). `addItem` lança
     quando não há slot, e isso derrubava o tick para sempre: quem enchesse o
     inventário ficava com o jogo travado, sem pista do motivo. A peça sem
     lugar é vendida na hora e vira ouro — o drop não some, muda de forma. */
  const peca = createEquipmentFromDropTable(instanciaId, `${String(run.seed)}:${rewardId}`, table.entries);
  if (inventory.items.length < inventory.capacity) {
    inventory = addItem(inventory, { item: peca, quantity: 1 });
  } else {
    economy = applyEconomyTransaction(economy, { scope: "run", resourceId: GOLD_RESOURCE, direction: "credit", amount: wave.goldReward, reason: `mochila-cheia:${rewardId}` }).state;
  }
  /* Slot vazio é vestido na hora. Sem isso o drop garantido da fase 3 fica
     parado na mochila e o jogador entra na fase 4 sem o alcance que ela
     pressupõe — num jogo idle, contar com ele abrindo o inventário é apostar
     contra a própria proposta. Slot ocupado nunca é tocado. */
  const autoEquip = autoEquipEmptySlots(roster, state.party, inventory);
  roster = autoEquip.roster;
  inventory = autoEquip.inventory;
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
  const metrics = { kills: run.metrics?.kills ?? 0, loot: (run.metrics?.loot ?? 0) + wave.goldReward, dust: run.metrics?.dust ?? 0, retreats: run.metrics?.retreats ?? 0 };

  /* Vitais que a party leva para a onda seguinte. Lidos do combate que acabou
     de ser vencido, antes de ele ser descartado. */
  const vitals: Record<string, { readonly hp: number; readonly mana: number }> = {};
  for (const combatente of run.combat?.combatants ?? []) {
    if (combatente.snapshot.side === "party") {
      vitals[combatente.snapshot.id] = { hp: combatente.hp, mana: combatente.mana };
    }
  }
  if (last) return { ...state, roster, inventory, economy, world: { ...state.world, clearedPhaseIds: cleared, unlockedPhaseIds: unlocked }, run: { ...run, status: "completed", combat: null, checkpoint, metrics }, metadata: { ...state.metadata, pendingSync: true } };
  return { ...state, roster, inventory, economy, world: { ...state.world, clearedPhaseIds: cleared, unlockedPhaseIds: unlocked }, run: { ...run, status: "walking", waveIndex: run.waveIndex + 1, distanceToWave: content.runRules.walkingMs, combat: null, checkpoint, metrics, vitals }, metadata: { ...state.metadata, pendingSync: true } };
}

function retreat(state: GameState, content: GameContentContext, reason: string): GameTransition {
  const run = state.run; if (!run) return { state, events: [] };
  const phase = findPhase(content, run.phaseId); const fallback = phase.retreatPhaseId ?? state.world.selectedFarmPhaseId;
  const target = state.world.unlockedPhaseIds.includes(fallback) ? fallback : state.world.selectedFarmPhaseId;
  const next = { ...state, world: { ...state.world, selectedFarmPhaseId: target }, run: { ...run, phaseId: target, status: "retreating" as const, waveIndex: 0, distanceToWave: content.runRules.walkingMs, combat: null, checkpoint: makeCheckpoint(run.checkpoint.sequence + 1, -1, []), metrics: { kills: run.metrics?.kills ?? 0, loot: run.metrics?.loot ?? 0, dust: run.metrics?.dust ?? 0, retreats: (run.metrics?.retreats ?? 0) + 1 },
    /* Recuar é recomeçar numa noite mais rasa, e noite nova é descanso: a
       party volta inteira. Sem isto ela recuava com a vida que a matou e
       morria de novo na primeira onda — um laço de morte, desta vez dentro do
       motor. */
    vitals: undefined }, metadata: { ...state.metadata, pendingSync: true } };
  return { state: { ...next, run: { ...next.run!, status: "walking" } }, events: [{ type: reason === "defeat" ? "run_defeat" : "run_retreat", phaseId: target }] };
}

function findWaveForRun(state: GameState, content: GameContentContext) { const phase = findPhase(content, state.run!.phaseId); const id = phase.waveIds[state.run!.waveIndex]; if (!id) throw new RangeError("índice de wave inválido"); return findWave(content, id); }
function createCombatantsForWave(state: GameState, content: GameContentContext, enemyIds: readonly string[], seed: number | string, waveIndex: number) {
  const party = createCombatantsFromParty(state.roster, state.party, { side: "party", itemEffects: { activeEffects: [] }, formulas: content.derivedStatFormulas, ossuaryBonuses: getOssuaryBonuses(state.ossuary, content.ossuaryUpgrades ?? []) });
  const enemies = enemyIds.map((id, index) => { const enemy = content.enemies.find((candidate) => candidate.id === id); if (!enemy) throw new RangeError(`enemy ausente: ${id}`); return { id: `${id}:${waveIndex}:${index}`, name: enemy.name, side: "enemy" as const, stats: enemy.stats }; });
  return [...party, ...enemies];
}
function makeCheckpoint(sequence: number, lastResolvedWaveIndex: number, appliedRewardIds: readonly string[]): RunCheckpoint { return { checkpointId: `checkpoint-${sequence}`, sequence, lastResolvedWaveIndex, appliedRewardIds }; }

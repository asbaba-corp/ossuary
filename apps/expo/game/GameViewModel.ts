import { useEffect, useRef, useState } from "react";
import {
  GameSession,
  WORLD_0_CONTENT,
  createInitialGameState,
  type GameState,
  type GameEvent,
} from "@ossuary/core";
import { ExpoSaveStore } from "../storage";

export type GamePanel = "inventory" | "stats" | "bestiary" | "systems" | null;
export type SceneAnimation = "attack" | "hurt" | "dead";
export type SceneAnimationState = Readonly<Record<string, { readonly animation: SceneAnimation; readonly epoch: number }>>;

export interface GameViewModel {
  readonly state: GameState | null;
  readonly ready: boolean;
  readonly paused: boolean;
  readonly speed: 1 | 3;
  readonly sceneTime: number;
  readonly attackEpoch: number;
  readonly combatFeedback: readonly { readonly id: string; readonly alvo: string; readonly epoch: number; readonly text: string; readonly color: string }[];
  readonly combatAnimations: SceneAnimationState;
  readonly combatHits: Readonly<Record<string, number>>;
  readonly activeEffects: readonly string[];
  readonly panel: GamePanel;
  readonly inventoryPage: number;
  readonly eventMessage: string;
  readonly marchProgress: number;
  readonly upcomingEnemies: readonly { readonly id: string; readonly name: string; readonly hp: number; readonly maxHp: number }[];
  readonly phaseLabel: string;
  readonly waveLabel: string;
  readonly gold: number;
  readonly runIncome: number;
  readonly runExpenses: number;
  readonly runKills: number;
  readonly runDust: number;
  readonly runRetreats: number;
  readonly partyCombatants: readonly { readonly id: string; readonly name: string; readonly hp: number; readonly maxHp: number; readonly mana: number; readonly maxMana: number }[];
  readonly openPanel: (panel: Exclude<GamePanel, null>) => void;
  readonly closePanel: () => void;
  readonly togglePause: () => void;
  readonly toggleSpeed: () => void;
  readonly reset: () => void;
  readonly setInventoryPage: (page: number) => void;
}

function formatEvent(event: GameEvent | undefined): string {
  if (!event) return "A marcha começa.";
  if (event.type === "wave_started") return `Onda ${event.waveIndex! + 1} entrou na cena.`;
  if (event.type === "wave_victory") return "Onda vencida · recompensas aplicadas.";
  if (event.type === "phase_unlocked") return "Nova fase desbloqueada.";
  if (event.type === "run_defeat") return "A party recuou para uma fase mais rasa.";
  if (event.type === "run_retreat") return "Recuando.";
  return event.type === "run_started" ? "A party está caminhando." : "";
}

export function useGameViewModel(): GameViewModel {
  const [state, setState] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 3>(1);
  const [sceneTime, setSceneTime] = useState(0);
  const [attackEpoch, setAttackEpoch] = useState(0);
  const [combatHits, setCombatHits] = useState<Readonly<Record<string, number>>>({});
  const combatHitsRef = useRef<Readonly<Record<string, number>>>({});
  const [combatFeedback, setCombatFeedback] = useState<readonly { readonly id: string; readonly alvo: string; readonly epoch: number; readonly text: string; readonly color: string }[]>([]);
  const [combatAnimations, setCombatAnimations] = useState<SceneAnimationState>({});
  const combatAnimationsRef = useRef<SceneAnimationState>({});
  const sceneClockRef = useRef(0);
  const [panel, setPanel] = useState<GamePanel>(null);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [eventMessage, setEventMessage] = useState("Carregando save local…");
  const sessionRef = useRef<GameSession | null>(null);

  useEffect(() => {
    const session = new GameSession({
      saveStore: new ExpoSaveStore(),
      clock: { nowMs: () => Date.now() },
      /* O app joga o Mundo 0, não o fixture do Vestíbulo.
         `VESTIBULE_CONTENT` tem 10 fases de UMA onda cada — era andaime de
         teste, e enquanto o app o carregava o HUD só sabia mostrar "WAVE 1"
         e nenhuma noite tinha as 3 ou 5 ondas que o desenho pede. */
      content: WORLD_0_CONTENT,
      deviceId: "expo-home",
      createInitialState: (content, deviceId) => createInitialGameState(content, deviceId),
    });
    sessionRef.current = session;
    void session.load().then(async (loaded) => {
      let next = loaded;
      if (!next.run || next.run.status === "completed") {
        await session.action({ type: "start_run", phaseId: next.world.selectedFarmPhaseId, seed: "vestibule-home" });
        next = session.state;
      }
      setState(next);
      setReady(true);
      setEventMessage(next.metadata.seq > 0 ? "Save local carregado." : "A marcha começou.");
    }).catch((error: unknown) => {
      setReady(true);
      setEventMessage(error instanceof Error ? error.message : "Não foi possível carregar o save.");
    });
    return () => { sessionRef.current = null; };
  }, []);

  useEffect(() => {
    if (!ready || paused) return;
    const timer = setInterval(() => {
      const session = sessionRef.current;
      if (!session || !session.state.run || session.state.run.status === "completed") return;
      void session.tick(250 * speed).then((events) => {
        const combatEvents = events.filter((event): event is Extract<GameEvent, { type: "combat" }> => event.type === "combat").map((event) => event.event);
        const attacks = combatEvents.filter((event): event is Extract<typeof combatEvents[number], { type: "attack" }> => event.type === "attack");
        const defeats = combatEvents.filter((event): event is Extract<typeof combatEvents[number], { type: "combatant_defeated" }> => event.type === "combatant_defeated");
        if (attacks.length > 0 || defeats.length > 0) {
          /* O número carrega o instante e o alvo. Sem o instante ele não tem
             como subir nem desvanecer — ficava congelado na tela; sem o alvo,
             nasce num ponto fixo em vez de sobre quem levou o golpe. */
          const nascidoEm = sceneClockRef.current;

          /* Um número por alvo por tick, com o dano somado.
             Cercado, o herói leva vários golpes no mesmo tick, e cada um virava
             um número próprio nascido no mesmo ponto e no mesmo instante: eles
             se empilhavam parados ao lado do boneco em vez de subir. Somar é
             também o que o jogador quer ler — quanto a rodada custou, não a
             parcela de cada mob. */
          const somaPorAlvo = new Map<string, { dano: number; critico: boolean }>();
          for (const event of attacks) {
            const atual = somaPorAlvo.get(event.targetId) ?? { dano: 0, critico: false };
            somaPorAlvo.set(event.targetId, { dano: atual.dano + event.damage, critico: atual.critico || event.critical });
          }

          setCombatFeedback((anteriores) => [
            ...anteriores.filter((item) => nascidoEm - item.epoch < 1),
            ...[...somaPorAlvo].map(([alvo, { dano, critico }]) => ({
              id: `d:${nascidoEm.toFixed(3)}:${alvo}`, alvo, epoch: nascidoEm,
              text: `-${Math.round(dano)}`, color: critico ? "#ffb648" : "#ff5a48",
            })),
            ...defeats.map((event, i) => ({ id: `m:${nascidoEm.toFixed(3)}:${i}:${event.combatantId}`, alvo: event.combatantId, epoch: nascidoEm, text: "✦", color: "#f0c04a" })),
          ]);
        }
        if (attacks.length > 0 || defeats.length > 0) {
          const epoch = sceneClockRef.current;
          const nextAnimations = { ...combatAnimationsRef.current };
          /* Atacar vence apanhar. No mesmo lote o herói golpeia e é golpeado,
             e como o alvo era escrito depois, o "hurt" apagava o "attack" —
             ele nunca chegava a mostrar o golpe. Quem ataga neste tick mantém
             a animação de ataque; o dano recebido é comunicado pelo clarão,
             que não disputa o mesmo espaço. */
          const atacantes = new Set(attacks.map((event) => event.attackerId));
          for (const event of attacks) {
            nextAnimations[event.attackerId] = { animation: "attack", epoch };
            if (!atacantes.has(event.targetId)) {
              nextAnimations[event.targetId] = { animation: "hurt", epoch };
            }
          }
          /* O clarão de acerto vive à parte da animação: assim quem está no
             meio do próprio golpe também pisca ao levar dano. */
          const golpesRecebidos = { ...combatHitsRef.current };
          for (const event of attacks) golpesRecebidos[event.targetId] = epoch;
          combatHitsRef.current = golpesRecebidos;
          setCombatHits(golpesRecebidos);
          for (const event of defeats) nextAnimations[event.combatantId] = { animation: "dead", epoch };
          combatAnimationsRef.current = nextAnimations;
          setCombatAnimations(nextAnimations);
        }
        if (events.some((event) => event.type === "combat" && event.event.type === "attack")) {
          setAttackEpoch(sceneClockRef.current);
        }
        if (session.state.run?.status === "completed") {
          void session.action({ type: "start_run", phaseId: session.state.world.selectedFarmPhaseId, seed: `vestibule-home-${session.state.metadata.seq}` }).then(() => {
            combatAnimationsRef.current = {};
            setCombatAnimations({});
            setState(session.state);
            setEventMessage("Fase concluída · nova marcha iniciada.");
          });
          return;
        }
        setState(session.state);
        const message = formatEvent(events[events.length - 1]);
        if (message) setEventMessage(message);
      }).catch((error: unknown) => {
        /* Erro de domínio não é notícia de jogo. Antes a mensagem crua ia para
           a mesma linha que anuncia "Fase concluída", e o jogador lia
           "equipment instance is already in inventory: vestibule-phase-1:0:…"
           como se fosse parte da narrativa. O detalhe vai para o console, onde
           serve a quem depura; a tela recebe uma frase que ela entende. */
        console.error("Falha ao avançar a run:", error);
        setEventMessage("Algo deu errado ao avançar a marcha. Veja o console.");
      });
    }, 250);
    return () => clearInterval(timer);
  }, [paused, ready, speed]);

  useEffect(() => {
    if (!ready || paused) return;
    const timer = setInterval(() => {
      sceneClockRef.current += 0.05 * speed;
      setSceneTime(sceneClockRef.current);
    }, 50);
    return () => clearInterval(timer);
  }, [paused, ready, speed]);

  function reset() {
    const session = sessionRef.current;
    if (!session) return;
    void session.reset().then(async (loaded) => {
      await session.action({ type: "start_run", phaseId: loaded.world.selectedFarmPhaseId, seed: "vestibule-home" });
      combatAnimationsRef.current = {};
      setCombatAnimations({});
      setState(session.state);
      setEventMessage("Save reiniciado.");
    });
  }

  const run = state?.run;
  const phase = run ? WORLD_0_CONTENT.phases.find(({ id }) => id === run.phaseId) : undefined;
  return {
    state,
    ready,
    paused,
    speed,
    sceneTime,
    attackEpoch,
    combatFeedback,
    combatHits,
    combatAnimations,
    activeEffects: state?.run?.combat?.combatants.flatMap(({ effects }) => effects.map(({ sourceSpellId }) => sourceSpellId)) ?? [],
    panel,
    inventoryPage,
    eventMessage,
    /* "n / total" nos dois, e não "Fase 3 · Vestíbulo": o HUD é lido de relance
       durante a luta, e o que importa é quanto falta. O total de ondas vem da
       fase, não de uma constante — o Mundo 0 tem 3 ondas nas noites 1 a 4 e 5
       nas noites 5 a 10, então qualquer número fixo aqui mentiria em metade
       das noites. */
    /* Progresso da marcha, 0 ao sair e 1 ao encostar na horda.
       Vem do `distanceToWave` do motor, não de um cronômetro da cena: é o
       mesmo número que decide quando o combate começa, então a horda chega
       exatamente no quadro em que a luta começa. Um relógio próprio na cena
       chegava cedo e a horda ficava esperando parada. */
    marchProgress: run && run.status !== "combat"
      ? 1 - Math.min(1, Math.max(0, run.distanceToWave / WORLD_0_CONTENT.runRules.walkingMs))
      : 1,

    /* A horda da onda que está por vir, montada a partir do conteúdo.
       Durante a marcha `run.combat` é null, então a cena não tinha ninguém
       para desenhar entrando: os mobs simplesmente existiam no primeiro quadro
       de combate. Aqui eles passam a existir antes, ainda fora do alcance. */
    upcomingEnemies: (() => {
      if (!run || run.status === "combat" || !phase) return [];
      const onda = WORLD_0_CONTENT.waves.find(({ id }) => id === phase.waveIds[run.waveIndex]);
      if (!onda) return [];
      return onda.enemyIds.map((enemyId, i) => {
        const def = WORLD_0_CONTENT.enemies.find(({ id }) => id === enemyId);
        return { id: `proximo:${enemyId}:${i}`, name: def?.name ?? enemyId, hp: def?.stats.maxHp ?? 1, maxHp: def?.stats.maxHp ?? 1 };
      });
    })(),

    phaseLabel: phase ? `${phase.order + 1} / ${WORLD_0_CONTENT.phases.length}` : "—",
    waveLabel: run && phase ? `${run.waveIndex + 1} / ${phase.waveIds.length}` : "—",
    gold: state?.economy.account.gold ?? 0,
    runIncome: state?.economy.runIncome.gold ?? 0,
    runExpenses: state?.economy.runExpenses.gold ?? 0,
    runKills: state?.run?.metrics?.kills ?? 0,
    runDust: state?.run?.metrics?.dust ?? 0,
    runRetreats: state?.run?.metrics?.retreats ?? 0,
    partyCombatants: state?.run?.combat?.combatants.filter(({ snapshot }) => snapshot.side === "party").map(({ snapshot, hp, mana, maxMana }) => ({ id: snapshot.id, name: snapshot.name, hp, maxHp: snapshot.stats.maxHp, mana, maxMana })) ?? [],
    openPanel: setPanel,
    closePanel: () => setPanel(null),
    togglePause: () => setPaused((value) => !value),
    toggleSpeed: () => setSpeed((value) => value === 1 ? 3 : 1),
    reset,
    setInventoryPage: (page) => setInventoryPage(Math.max(0, Math.min(2, page))),
  };
}

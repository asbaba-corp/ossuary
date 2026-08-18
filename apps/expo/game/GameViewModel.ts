import { useEffect, useRef, useState } from "react";
import {
  GameSession,
  WORLD_0_CONTENT,
  createInitialGameState,
  type GameState,
  type GameEvent,
} from "@ossuary/core";
import { ExpoSaveStore } from "../storage";

/** Pixels por segundo que o mundo desliza enquanto a party marcha. */
const VELOCIDADE_DA_MARCHA = 62;
/** Fração da marcha a partir da qual o herói começa a frear. */
const FREIO_COMECA = 0.72;
/* Quanto tempo um corpo sobrevive NESTA lista antes de ser podado daqui.
   A cena (SkiaScene) já some com ele visualmente por volta de 1,8s de vida
   (atraso + fade); esta janela só existe para o array não crescer sem fim
   entre uma morte e outra — generosa o bastante para nunca cortar um corpo
   que a cena ainda está desenhando. */
const VIDA_DO_CORPO_NA_LISTA = 3;

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
  readonly combatFeedback: readonly { readonly id: string; readonly alvo: string; readonly epoch: number; readonly text: string; readonly color: string; readonly dx: number; readonly dy: number }[];
  readonly combatAnimations: SceneAnimationState;
  readonly combatHits: Readonly<Record<string, number>>;
  readonly activeEffects: readonly string[];
  readonly panel: GamePanel;
  readonly inventoryPage: number;
  readonly eventMessage: string;
  readonly marchProgress: number;
  readonly camera: number;
  readonly corpses: readonly { readonly id: string; readonly combatantId: string; readonly indice: number; readonly epoch: number; readonly camera: number }[];
  readonly upcomingEnemies: readonly { readonly id: string; readonly name: string; readonly hp: number; readonly maxHp: number }[];
  readonly phaseLabel: string;
  readonly waveLabel: string;
  readonly waveTrack: readonly ("cleared" | "current" | "pending")[];
  readonly nightTrack: readonly { readonly id: string; readonly numero: number; readonly estado: "cleared" | "current" | "unlocked" | "locked" }[];
  readonly selectNight: (phaseId: string) => void;
  readonly loopNight: boolean;
  readonly toggleLoop: () => void;
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
  const [combatFeedback, setCombatFeedback] = useState<readonly { readonly id: string; readonly alvo: string; readonly epoch: number; readonly text: string; readonly color: string; readonly dx: number; readonly dy: number }[]>([]);
  const [combatAnimations, setCombatAnimations] = useState<SceneAnimationState>({});
  const combatAnimationsRef = useRef<SceneAnimationState>({});
  const sceneClockRef = useRef(0);
  const cameraRef = useRef(0);
  /* Antes do primeiro requestAnimationFrame, sceneClockRef fica travado em 0 —
     o relógio da cena só anda dentro do loop de rAF, mas o tick do motor roda
     num setInterval à parte e pode disparar várias vezes antes do primeiro
     quadro. Sem esse contador, duas dessas iterações geravam o mesmo
     `d:0.000:<alvo>` e o React acusava chave duplicada logo no início da run. */
  const feedbackSeqRef = useRef(0);
  /* Mesmo problema do contador acima, mas para os corpos: o id de combatente
     se repete entre ondas (é o slot, não o bicho — ver comentário mais
     abaixo), e antes do primeiro rAF várias ondas inteiras podem se resolver
     dentro do mesmo `epoch` travado em 0. Duas mortes do mesmo slot nessa
     janela colidiam na chave React mesmo já levando o epoch no id. */
  const defeatSeqRef = useRef(0);
  /* Âncora da marcha: o progresso do motor mais o instante em que ele chegou.
     Entre um tick e outro a cena interpola a partir daqui. */
  /* Nasce em ZERO, não em um. Antes do primeiro tick não há âncora do motor, e
     começar em 1 fazia a cena concluir que a marcha já tinha acabado: a horda
     era plantada no lugar de combate no primeiro quadro e sumia no tick
     seguinte, quando o progresso real chegava. Era o "aparecem e somem" ao
     abrir o jogo. */
  const marchaRef = useRef({ progresso: 0, relogio: 0 });
  /* Os mortos sobrevivem à onda que os matou.
     Quando o último inimigo cai, o motor fecha a onda NO MESMO TICK: `combat`
     vira null e a cena perdia o corpo antes de ele piscar ou tombar — daí "o
     último hit nem pega". O corpo passa a viver aqui, guardando onde estava e
     quanto o mundo já tinha rolado, para depois ficar para trás sozinho. */
  /* Último slot conhecido de cada inimigo, enquanto vivo.
     Na morte não dá para perguntar onde ele estava: quando o ÚLTIMO cai, o
     motor fecha a onda no mesmo tick e a lista de combatentes já vem vazia.
     `indexOf` devolvia -1, o `Math.max(0, ...)` virava slot 0, e o corpo
     aparecia colado no herói — o "teletransporte para a frente". */
  /* Últimos sinais vitais vistos em combate.
     Vida e mana só existem dentro de `run.combat`; entre as ondas ele é null e
     o cartão da party caía para 0/0, como se o herói tivesse morrido ao vencer.
     A vida não some junto com o combate — o que some é a fonte de leitura. */
  const vitaisRef = useRef<readonly { id: string; name: string; hp: number; maxHp: number; mana: number; maxMana: number }[]>([]);
  const indicesRef = useRef<Record<string, number>>({});
  const restosRef = useRef<readonly { id: string; combatantId: string; indice: number; epoch: number; camera: number }[]>([]);
  const [restos, setRestos] = useState<readonly { id: string; combatantId: string; indice: number; epoch: number; camera: number }[]>([]);
  const [panel, setPanel] = useState<GamePanel>(null);
  const [inventoryPage, setInventoryPage] = useState(0);
  /* Repetir a noite é escolha do jogador, e precisa ser lida de dentro do
     laço de tick — que fecha sobre o valor do render em que foi criado. Por
     isso o ref ao lado do estado: o estado pinta o botão, o ref decide. */
  const [loopNight, setLoopNight] = useState(false);
  const loopRef = useRef(false);
  /* Uma troca de fase de cada vez.
     As ações são assíncronas e o intervalo de tick segue disparando a cada
     250ms; sem esta trava, dois avanços podiam correr ao mesmo tempo e o
     segundo batia na guarda de "já existe uma run em andamento". */
  const trocandoRef = useRef(false);
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
      if (!session) return;

      /* Fase terminada abre a PRÓXIMA noite. Antes o tick só devolvia aqui e
         parava: a noite 1 fechava, ninguém iniciava a 2, e o que o jogador via
         era a noite 1 recomeçando. O motor desbloqueia `nextPhaseId` na última
         onda, mas não escolhe a fase de farm — essa decisão é do app. */
      const corridaAtual = session.state.run;
      if (!corridaAtual || corridaAtual.status === "completed") {
        if (trocandoRef.current) return;
        trocandoRef.current = true;
        const fase = WORLD_0_CONTENT.phases.find(({ id }) => id === corridaAtual?.phaseId);
        const proxima = loopRef.current
          // em loop o jogador fica na mesma noite, moendo as mesmas ondas
          ? (corridaAtual?.phaseId ?? session.state.world.selectedFarmPhaseId)
          : fase?.nextPhaseId && session.state.world.unlockedPhaseIds.includes(fase.nextPhaseId)
            ? fase.nextPhaseId
            // sem próxima (ou ainda trancada), repete a atual: idle não para
            : session.state.world.selectedFarmPhaseId;
        void session.action({ type: "select_farm_phase", phaseId: proxima })
          .then(() => session.action({ type: "start_run", phaseId: proxima }))
          .then(() => { setState(session.state); marchaRef.current = { progresso: 0, relogio: sceneClockRef.current }; })
          .catch((erro: unknown) => console.error("Falha ao abrir a próxima noite:", erro))
          .finally(() => { trocandoRef.current = false; });
        return;
      }
      void session.tick(250 * speed).then((events) => {
        const corrida = session.state.run;
        // registra onde cada vivo está ANTES de precisar disso num enterro
        for (const [i, c] of (corrida?.combat?.combatants ?? []).filter(({ snapshot }) => snapshot.side === "enemy").entries()) {
          indicesRef.current[c.snapshot.id] = i;
        }
        marchaRef.current = corrida && corrida.status !== "combat"
          ? { progresso: 1 - Math.min(1, Math.max(0, corrida.distanceToWave / WORLD_0_CONTENT.runRules.walkingMs)), relogio: sceneClockRef.current }
          : { progresso: 1, relogio: sceneClockRef.current };
        const combatEvents = events.filter((event): event is Extract<GameEvent, { type: "combat" }> => event.type === "combat").map((event) => event.event);
        const attacks = combatEvents.filter((event): event is Extract<typeof combatEvents[number], { type: "attack" }> => event.type === "attack");
        const defeats = combatEvents.filter((event): event is Extract<typeof combatEvents[number], { type: "combatant_defeated" }> => event.type === "combatant_defeated");
        /* Vitória de onda zera a marcha IMEDIATAMENTE.
           A âncora vale `progresso: 1` durante o combate. Se ela sobrevivesse
           um único render depois de a onda cair, a cena concluiria que a
           marcha seguinte já tinha acabado e desenharia a horda nova direto na
           posição de combate: quatro inimigos piscando na tela e sumindo. */
        if (events.some(({ type }) => type === "wave_victory")) {
          marchaRef.current = { progresso: 0, relogio: sceneClockRef.current };
        }

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

          /* Desvio lateral por alvo e por instante.
             Sem ele, cercado, o herói ganhava um número novo a cada 250ms
             exatamente no mesmo ponto enquanto os anteriores ainda
             desvaneciam por 0,9s: lia como um borrão parado em cima do
             boneco, não como dano subindo. O desvio é determinístico — mesmo
             alvo no mesmo instante cai sempre no mesmo lugar —, então nada
             tremula entre um quadro e outro. */
          const desvio = (semente: string) => {
            let h = 0;
            for (let i = 0; i < semente.length; i += 1) h = (h * 31 + semente.charCodeAt(i)) | 0;
            return ((Math.abs(h) % 73) - 36);
          };

          setCombatFeedback((anteriores) => [
            ...anteriores.filter((item) => nascidoEm - item.epoch < 1),
            ...[...somaPorAlvo].map(([alvo, { dano, critico }]) => ({
              id: `d:${nascidoEm.toFixed(3)}:${alvo}:${feedbackSeqRef.current++}`, alvo, epoch: nascidoEm,
              text: `-${Math.round(dano)}`, color: critico ? "#ffb648" : "#ff5a48",
              dx: 0, dy: (Math.abs(Math.round(nascidoEm * 7)) % 3) * -11,
            })),
            /* Sem marca de morte subindo da cabeça do bicho.
               O "✦" dourado disputava espaço e leitura com o número de dano
               justamente no golpe que mata, que é o quadro mais cheio de
               informação da luta. A morte já é comunicada pelo clarão branco e
               pelo corpo que fica no chão. */
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

          if (defeats.length > 0) {
            const anteriores = restosRef.current.filter((r) => epoch - r.epoch < VIDA_DO_CORPO_NA_LISTA);
            /* O id do combatente se repete entre ondas — "w0-ignavo-f1" é o
               slot, não o bicho — e o Loop refaz a mesma noite sem parar.
               Duas mortes daquele slot em menos de VIDA_DO_CORPO_NA_LISTA
               colidiam na lista e o React reclamava de chave duplicada.
               O epoch da morte torna a chave única; o id do combatente
               continua guardado à parte para o clarão de acerto encontrar
               o corpo certo.

               Só que o epoch sozinho não bastava: antes do primeiro rAF ele
               fica travado em 0 (ver defeatSeqRef acima), e várias ondas
               inteiras podem se resolver nessa janela — o mesmo slot morre
               de novo com o epoch ainda em 0, e a chave colide de novo. O
               contador crescente garante id único mesmo quando o epoch não
               anda. */
            const novos = defeats.map((event) => ({
              id: `${event.combatantId}:${epoch}:${defeatSeqRef.current++}`,
              combatantId: event.combatantId,
              indice: indicesRef.current[event.combatantId] ?? 0,
              epoch, camera: cameraRef.current,
            }));
            restosRef.current = [...anteriores, ...novos];
            setRestos(restosRef.current);
          }
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

  /* Relógio da cena no rAF, não num intervalo de 50ms.
     A 20Hz cada posição dava 20 saltos por segundo: o herói parecia fluido
     porque o ciclo de andar dele é uma folha de sprites, mas a horda, cuja
     posição é calculada, andava em degraus. O rAF acompanha o monitor.

     Junto vai a CÂMERA, acumulada. Ela era `time * 34` durante a marcha e 0 no
     combate: ao virar a onda o fundo saltava do zero para o tempo absoluto e
     dava o corte brusco. Distância caminhada só cresce, e só enquanto anda. */
  useEffect(() => {
    if (!ready || paused) return;
    let vivo = true;
    let anterior = performance.now();
    const passo = (agora: number) => {
      if (!vivo) return;
      const delta = Math.min(0.05, (agora - anterior) / 1000) * speed;  // limita o salto ao voltar de aba oculta
      anterior = agora;
      sceneClockRef.current += delta;
      const andando = sessionRef.current?.state.run?.status;
      if (andando === "walking" || andando === "retreating") {
        /* O herói FREIA ao chegar, em vez de parar de um quadro para o outro.
           A câmera é a velocidade dele: no último quarto da marcha ela cai a
           zero, então quando a horda encosta ele já está quase parado. Sem
           isto o mundo corria a plena velocidade e travava seco no primeiro
           quadro de combate. */
        const p = Math.min(1, Math.max(0, marchaRef.current.progresso
          + (sceneClockRef.current - marchaRef.current.relogio) / (WORLD_0_CONTENT.runRules.walkingMs / 1000)));
        const freio = p > FREIO_COMECA ? Math.max(0, (1 - p) / (1 - FREIO_COMECA)) : 1;
        cameraRef.current += delta * VELOCIDADE_DA_MARCHA * freio;
      }
      setSceneTime(sceneClockRef.current);
      requestAnimationFrame(passo);
    };
    const id = requestAnimationFrame(passo);
    return () => { vivo = false; cancelAnimationFrame(id); };
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
    /* Interpolado entre os ticks. `distanceToWave` só muda 4 vezes por segundo,
       e ler direto dele fazia a horda andar em degraus de 250ms. A âncora vem
       do motor — então nada de drift acumulado — e o resto é o relógio da cena. */
    marchProgress: run && run.status !== "combat"
      ? Math.min(1, marchaRef.current.progresso
          + (sceneTime - marchaRef.current.relogio) / (WORLD_0_CONTENT.runRules.walkingMs / 1000))
      : 1,
    camera: cameraRef.current,
    corpses: restos,

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

    /* Uma lua por noite do mundo, com o estado que decide a cor e se dá para
       clicar. `unlocked` vem do motor: noite trancada não é escolhível, senão
       o jogador pula direto para a 10 e morre sem entender. */
    nightTrack: WORLD_0_CONTENT.phases.map((fase) => ({
      id: fase.id,
      numero: fase.order + 1,
      estado: fase.id === run?.phaseId ? "current" as const
        : state?.world.clearedPhaseIds.includes(fase.id) ? "cleared" as const
        : state?.world.unlockedPhaseIds.includes(fase.id) ? "unlocked" as const
        : "locked" as const,
    })),

    /* Trocar de noite encerra a run atual e abre a escolhida. É também o que
       o botão de loop respeita depois, porque `select_farm_phase` move o alvo
       de farm, não só a run em curso. */
    selectNight: (phaseId: string) => {
      const session = sessionRef.current;
      if (!session || !session.state.world.unlockedPhaseIds.includes(phaseId)) return;
      /* Abandona antes de começar: com uma run em andamento o `start_run`
         lança, e antes disso o clique não fazia nada além de uma linha no
         console — o jogador via o ícone não responder. */
      void session.action({ type: "abandon_run" })
        .then(() => session.action({ type: "select_farm_phase", phaseId }))
        .then(() => session.action({ type: "start_run", phaseId }))
        .then(() => {
          setState(session.state);
          marchaRef.current = { progresso: 0, relogio: sceneClockRef.current };
          restosRef.current = [];
          setRestos([]);
          setEventMessage(`Noite ${WORLD_0_CONTENT.phases.findIndex(({ id }) => id === phaseId) + 1}: a marcha recomeça.`);
        })
        .catch((erro: unknown) => {
          console.error("Falha ao trocar de noite:", erro);
          setEventMessage("Não foi possível trocar de noite. Veja o console.");
        });
    },

    loopNight,
    toggleLoop: () => { loopRef.current = !loopRef.current; setLoopNight(loopRef.current); },

    /* Uma casa por onda da noite. `cleared` é o que já caiu nesta run,
       `current` é a que está em jogo e `pending` o que falta — é essa leitura
       que deixa o jogador saber onde está sem contar no dedo. */
    waveTrack: phase
      ? phase.waveIds.map((_, i) => {
          const atual = run?.waveIndex ?? 0;
          return i < atual ? "cleared" as const : i === atual ? "current" as const : "pending" as const;
        })
      : [],

    phaseLabel: phase ? `${phase.order + 1} / ${WORLD_0_CONTENT.phases.length}` : "—",
    waveLabel: run && phase ? `${run.waveIndex + 1} / ${phase.waveIds.length}` : "—",
    gold: state?.economy.account.gold ?? 0,
    runIncome: state?.economy.runIncome.gold ?? 0,
    runExpenses: state?.economy.runExpenses.gold ?? 0,
    runKills: state?.run?.metrics?.kills ?? 0,
    runDust: state?.run?.metrics?.dust ?? 0,
    runRetreats: state?.run?.metrics?.retreats ?? 0,
    partyCombatants: (() => {
      const emCombate = state?.run?.combat?.combatants
        .filter(({ snapshot }) => snapshot.side === "party")
        .map(({ snapshot, hp, mana, maxMana }) => ({ id: snapshot.id, name: snapshot.name, hp, maxHp: snapshot.stats.maxHp, mana, maxMana })) ?? [];
      if (emCombate.length > 0) vitaisRef.current = emCombate;
      return emCombate.length > 0 ? emCombate : vitaisRef.current;
    })(),
    openPanel: setPanel,
    closePanel: () => setPanel(null),
    togglePause: () => setPaused((value) => !value),
    toggleSpeed: () => setSpeed((value) => value === 1 ? 3 : 1),
    reset,
    setInventoryPage: (page) => setInventoryPage(Math.max(0, Math.min(2, page))),
  };
}

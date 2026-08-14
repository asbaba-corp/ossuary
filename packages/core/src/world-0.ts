/**
 * Mundo 0 — o Vestíbulo. Dez fases, trinta e sete ondas, seis espécies.
 *
 * Os números saem de um modelo de balanceamento rodado sobre as fórmulas
 * reais deste pacote, não de estimativa. Três decisões estruturais explicam
 * quase tudo o que está aqui:
 *
 * 1. **Trash ameaça tempo, não vida.** O combate resolve um alvo por vez, e
 *    com N inimigos o dano recebido cresce com N(N+1)/2. Se o Ignavo doesse
 *    de verdade, nenhuma onda grande seria vencível. Quem ameaça vida é o que
 *    tem nome: Gorja, Marcado, Caronte.
 *
 * 2. **A parede mora perto do defenseConstant.** A mitigação é linear, então
 *    defesa só vira parede quando chega perto de 100. Daí o Encalhado com 106:
 *    é a faixa em que cada ponto de penetração vale muito e o build decide.
 *
 * 3. **O alcance abre a multidão.** Sem ele, as ondas teriam de ficar em 4-8
 *    inimigos. A foice da fase 3 é o que permite chegar a 21.
 *
 * O arco das fases segue `docs/design/core-design.md` §3.3.
 */
import {
  createConsumable,
  createEquipment,
  type EquipmentDropEntry,
  type ItemRarity,
} from "./equipment/legacy.js";
import type { DerivedStatFormulas } from "./progression/derived.js";
import type { CombatantStats } from "./combat/types.js";
import type {
  EnemyDefinition,
  GameContentContext,
  PhaseDefinition,
  WaveDefinition,
} from "./game-content.js";

/* ---------------------------------------------------------------- atributos */

/**
 * STR dano e penetração · CONS vida · DEX cadência e crítico · INT mana e mágico.
 * `sustain` e `reach` não vêm de atributo: roubo de vida é coisa de inimigo e
 * alcance vem de arma.
 */
const FORMULAS: DerivedStatFormulas = {
  vigor:       { base: 0,  attribute: "cons", coefficient: 10 },
  damage:      { base: 0,  attribute: "str",  coefficient: 2, includeWeaponBaseDamage: true },
  penetration: { base: 0,  attribute: "str",  coefficient: 1 },
  cadence:     { base: 1,  attribute: "dex",  coefficient: 0.1 },
  critical:    { base: 0,  attribute: "dex",  coefficient: 1 },
  reach:       { base: 1,  attribute: null,   coefficient: 0 },
  sustain:     { base: 0,  attribute: null,   coefficient: 0 },
  mana:        { base: 30, attribute: "int",  coefficient: 2 },
  spellDamage: { base: 0,  attribute: "int",  coefficient: 3 },
};

/* ---------------------------------------------------------------- bestiário */

type Especie = "ignavo" | "moscardo" | "gorja" | "encalhado" | "marcado" | "caronte";

const inimigo = (
  maxHp: number,
  damage: number,
  defense: number,
  attacksPerSecond: number,
  sustainPercent = 0,
): CombatantStats => ({
  maxHp: Math.round(maxHp),
  damage: Number(damage.toFixed(2)),
  defense,
  penetration: 0,
  attacksPerSecond,
  criticalChancePercent: 0,
  criticalMultiplier: 2,
  sustainPercent,
});

/** Curvas suaves de propósito: o salto de dificuldade vem da composição da onda. */
const BESTIARIO: Readonly<Record<Especie, (fase: number) => { nome: string; stats: CombatantStats }>> = {
  ignavo:    (f) => ({ nome: "Ignavo",    stats: inimigo(12 * 1.20 ** (f - 1), 1.0 + 0.15 * f, 0, 0.6) }),
  moscardo:  (f) => ({ nome: "Moscardo",  stats: inimigo(5 * 1.18 ** (f - 1),  0.5 + 0.08 * f, 0, 2.2) }),
  gorja:     (f) => ({ nome: "Gorja",     stats: inimigo(55 * 1.19 ** (f - 1), 3.0 + 0.35 * f, 20, 0.5, 30) }),
  encalhado: (f) => ({ nome: "Encalhado", stats: inimigo(30 * 1.10 ** (f - 1), 0.6, 106, 0.4) }),
  marcado:   (f) => ({ nome: "Marcado",   stats: inimigo(80 * 1.17 ** (f - 1), 7.0 + 0.6 * f, 12, 1.1) }),
  /* Caronte é o teto do que um herói sozinho e sem cura aguenta. Com 1100 de
     vida ele levava 17 segundos para cair, e 17 segundos de remo somam 250 de
     dano contra os 140 de vida do nível 10 — matava sempre. Estes números o
     deixam vencível por pouco, que é o lugar certo para um guardião. */
  caronte:   ()  => ({ nome: "Caronte, o Barqueiro", stats: inimigo(700, 9, 40, 1.0) }),
};

/* -------------------------------------------------------------- composição */

interface FaseDesenho {
  readonly papel: string;
  readonly ondas: readonly Readonly<Partial<Record<Especie, number>>>[];
  readonly xpPorOnda: number;
  readonly ouroPorOnda: number;
  readonly dropTableId: string;
}

/**
 * FORMA DO MUNDO 0: dez noites. Noites 1 a 4 têm 3 ondas; noites 5 a 10 têm 5.
 * A noite curta é a de aprender, a longa é a de sustentar — e como o
 * checkpoint é por onda, a noite de 5 também é a mais perdoada por onda.
 *
 * Ao mexer na contagem de ondas, o TOTAL DE INIMIGOS DA NOITE foi mantido
 * igual ao calibre anterior, redistribuído entre as ondas novas. Sem cura, o
 * que mata é o dano somado da noite inteira, não o pico de uma onda: preservar
 * o total é o que impede a mudança de forma de virar mudança de dificuldade.
 * `xpPorOnda` e `ouroPorOnda` foram redivididos pela mesma razão — a noite
 * paga o mesmo que pagava antes.
 *
 * CALIBRE ATUAL: sem cura de nenhum tipo.
 *
 * O modelo de balanceamento media dificuldade em poções queimadas, porque é
 * assim que o §5.3 define a fase de melhor saldo. Só que o motor ainda não
 * tem poção automática em combate — não tem cura alguma. Então todo dano
 * acumulado vira morte, e conteúdo calibrado para "queima 2,5 vidas" mata a
 * run em vez de custar ouro.
 *
 * Estes números são os que passam no jogo que existe HOJE, verificados
 * jogando as dez fases contra o motor real. Quando a poção automática entrar,
 * as fases 6 a 10 devem ser reapertadas — e aí sim vale calibrar contando com
 * o segundo personagem, que corta a dificuldade em cerca de 75%.
 */
const DESENHO: readonly FaseDesenho[] = [
  {
    papel: "Apresentação", dropTableId: "w0-drop-inicial", xpPorOnda: 18, ouroPorOnda: 34,
    ondas: [{ ignavo: 3 }, { ignavo: 4 }, { ignavo: 5 }],
  },
  {
    papel: "Apresentação", dropTableId: "w0-drop-inicial", xpPorOnda: 50, ouroPorOnda: 34,
    ondas: [{ ignavo: 6 }, { ignavo: 7 }, { ignavo: 9 }],
  },
  {
    // a foice cai aqui, garantida: é ela que abre a multidão das fases seguintes
    papel: "Escalada", dropTableId: "w0-drop-foice", xpPorOnda: 88, ouroPorOnda: 67,
    ondas: [{ ignavo: 7, moscardo: 5 }, { ignavo: 7, moscardo: 7 }, { ignavo: 5, moscardo: 9 }],
  },
  {
    papel: "Escalada", dropTableId: "w0-drop-vestibulo", xpPorOnda: 132, ouroPorOnda: 100,
    ondas: [{ ignavo: 12, moscardo: 6 }, { ignavo: 13, moscardo: 7 }, { ignavo: 14, moscardo: 8 }],
  },
  {
    // miniboss: o Marcado fecha a noite, nunca abre
    papel: "Miniboss", dropTableId: "w0-drop-vestibulo", xpPorOnda: 108, ouroPorOnda: 81,
    ondas: [
      { ignavo: 5, moscardo: 3 }, { ignavo: 6, moscardo: 3 }, { ignavo: 6, moscardo: 4 },
      { ignavo: 5, moscardo: 3 }, { marcado: 1, ignavo: 4, moscardo: 3 },
    ],
  },
  {
    // a Gorja estreia sozinha: dreno somado trava o DPS e, sem cura, mata
    papel: "Pressão", dropTableId: "w0-drop-vestibulo", xpPorOnda: 140, ouroPorOnda: 112,
    ondas: [
      { gorja: 1, ignavo: 6 }, { gorja: 1, moscardo: 7 }, { gorja: 1, ignavo: 6 },
      { gorja: 1, moscardo: 8 }, { gorja: 1, ignavo: 4 },
    ],
  },
  {
    // a ceifa cai aqui, garantida
    papel: "Pressão", dropTableId: "w0-drop-ceifa", xpPorOnda: 175, ouroPorOnda: 152,
    ondas: [
      { gorja: 2, ignavo: 6 }, { gorja: 2, moscardo: 6 }, { gorja: 1, ignavo: 7, moscardo: 4 },
      { gorja: 2, moscardo: 6, ignavo: 5 }, { gorja: 1, ignavo: 3, moscardo: 4 },
    ],
  },
  {
    // spawn garantido do elite: é o Óbolo que paga o Caronte
    papel: "Elite", dropTableId: "w0-drop-fundo", xpPorOnda: 212, ouroPorOnda: 176,
    ondas: [
      { ignavo: 8, moscardo: 6 }, { gorja: 2, moscardo: 5 }, { marcado: 1, ignavo: 5 },
      { ignavo: 3, moscardo: 4 }, { marcado: 1, gorja: 1 },
    ],
  },
  {
    papel: "A parede", dropTableId: "w0-drop-fundo", xpPorOnda: 250, ouroPorOnda: 240,
    ondas: [
      { encalhado: 2, ignavo: 6 }, { encalhado: 2, moscardo: 5 }, { encalhado: 3, gorja: 1 },
      { encalhado: 2, moscardo: 3 }, { encalhado: 3, ignavo: 9 },
    ],
  },
  {
    papel: "Guardião", dropTableId: "w0-drop-fundo", xpPorOnda: 240, ouroPorOnda: 156,
    ondas: [
      { ignavo: 5, moscardo: 3 }, { ignavo: 3, moscardo: 3 }, { gorja: 1, encalhado: 1 },
      { encalhado: 1 }, { caronte: 1 },
    ],
  },
];

/* ------------------------------------------------------------------- armas */

/**
 * A escada de alcance. `reachBonus` é alvo adicional por golpe, e é a resposta
 * à multidão — por isso sobe com a raridade e não com o nível.
 */
const arma = (
  id: string,
  nome: string,
  rarity: ItemRarity,
  baseDamage: number,
  reachBonus: number,
) => createEquipment(id, nome, "weapon", {}, { instanceId: id, rarity, stats: { baseDamage, reachBonus } });

/**
 * Não existe arma antes da fase 3, e isso é estrutural, não estético.
 *
 * O auto-equipar só preenche slot VAZIO — regra escolhida para o jogo nunca
 * desfazer escolha do jogador. Se uma arma qualquer caísse na fase 1, ela
 * ocuparia o slot e a foice da fase 3 ficaria parada na mochila: o jogador
 * entraria nas fases seguintes com alcance 1, contra um calibre que pressupõe
 * alcance 2, e morreria sem entender por quê. Verificado jogando: com uma
 * lâmina comum na fase 1, a run morre na fase 4.
 *
 * Deixar o slot vazio até lá resolve, e ainda conta melhor a história: você
 * chega ao Vestíbulo de mãos vazias, e a primeira coisa que ele te dá é a foice.
 */
export const W0_FOICE   = arma("w0-foice",   "Foice do Vestíbulo",  "rare",      8,  1);
export const W0_GADANHO = arma("w0-gadanho", "Gadanho de osso",     "epic",     14,  1);
export const W0_CEIFA   = arma("w0-ceifa",   "Ceifa de Caronte",    "legendary", 22, 2);

const protecao = (id: string, nome: string, slot: "helmet" | "chest" | "shield", rarity: ItemRarity, baseDefense: number) =>
  createEquipment(id, nome, slot, {}, { instanceId: id, rarity, stats: { baseDefense } });

export const W0_ELMO   = protecao("w0-elmo",   "Elmo esburacado",  "helmet", "common", 3);
export const W0_PEITO  = protecao("w0-peito",  "Cota de lama",     "chest",  "common", 5);
export const W0_ESCUDO = protecao("w0-escudo", "Escudo de tábuas", "shield", "common", 4);

export const W0_POCAO = createConsumable("w0-pocao-menor", "Poção menor");

/**
 * A raridade decide a faixa do bônus de atributo rolado. Armas rolam STR,
 * que é o primário do círculo; proteção rola CONS. Duas peças do mesmo tipo
 * não saem idênticas, e é isso que dá função ao reroll.
 */
const FAIXA_POR_RARIDADE: Readonly<Record<ItemRarity, readonly number[]>> = {
  common:    [0, 1],
  rare:      [1, 2, 3],
  epic:      [3, 4, 5],
  legendary: [5, 6, 7, 8],
};

const entrada = (
  equipment: ReturnType<typeof arma>,
  weight: number,
): EquipmentDropEntry => ({
  equipment,
  rarity: equipment.rarity,
  weight,
  attributeRollPools: equipment.slot === "weapon"
    ? { str: FAIXA_POR_RARIDADE[equipment.rarity] }
    : { cons: FAIXA_POR_RARIDADE[equipment.rarity] },
});

/**
 * As tabelas das fases 3 e 7 têm uma entrada só: o drop é garantido. É o que
 * torna o alcance previsível, e as fases seguintes dependem disso para fechar.
 */
const TABELAS = [
  // sem arma: o slot da arma fica vazio de propósito até a fase 3
  { id: "w0-drop-inicial",   entries: [entrada(W0_ELMO, 4), entrada(W0_ESCUDO, 3), entrada(W0_PEITO, 3)] },
  { id: "w0-drop-foice",     entries: [entrada(W0_FOICE, 1)] },
  { id: "w0-drop-vestibulo", entries: [entrada(W0_PEITO, 4), entrada(W0_ELMO, 3), entrada(W0_ESCUDO, 3)] },
  { id: "w0-drop-ceifa",     entries: [entrada(W0_CEIFA, 1)] },
  { id: "w0-drop-fundo",     entries: [entrada(W0_GADANHO, 4), entrada(W0_CEIFA, 2), entrada(W0_PEITO, 4)] },
];

/* -------------------------------------------------------------- montagem */

const idFase = (n: number) => `w0-fase-${n}`;
const idOnda = (fase: number, onda: number) => `w0-fase-${fase}-onda-${onda}`;
const idInimigo = (especie: Especie, fase: number) => `w0-${especie}-f${fase}`;

function montarInimigos(): readonly EnemyDefinition[] {
  const usados = new Map<string, EnemyDefinition>();
  DESENHO.forEach((fase, indice) => {
    const numero = indice + 1;
    for (const onda of fase.ondas) {
      for (const especie of Object.keys(onda) as Especie[]) {
        const id = idInimigo(especie, numero);
        if (usados.has(id)) continue;
        const { nome, stats } = BESTIARIO[especie](numero);
        usados.set(id, { id, name: `${nome} · fase ${numero}`, stats });
      }
    }
  });
  return [...usados.values()];
}

function montarOndas(): readonly WaveDefinition[] {
  const ondas: WaveDefinition[] = [];
  DESENHO.forEach((fase, indice) => {
    const numero = indice + 1;
    fase.ondas.forEach((composicao, posicao) => {
      const enemyIds: string[] = [];
      for (const [especie, quantidade] of Object.entries(composicao) as [Especie, number][]) {
        for (let i = 0; i < quantidade; i += 1) enemyIds.push(idInimigo(especie, numero));
      }
      ondas.push({
        id: idOnda(numero, posicao + 1),
        enemyIds,
        dropTableId: fase.dropTableId,
        xpReward: fase.xpPorOnda,
        goldReward: fase.ouroPorOnda,
        /* Sem cobrança automática de poção por onda. `resolveVictory` lança
           quando o item não está no inventário, e o jogador começa sem
           nenhum — a primeira vitória do jogo derrubaria a run.

           O consumo real deve seguir o DANO RECEBIDO, não a contagem de
           ondas: é assim que o §5.3 define a fase de melhor saldo. O motor
           ainda não tem poção automática em combate, então a cobrança fica
           para quando tiver. A regra continua declarada abaixo, pronta. */
        consumableRuleId: null,
      });
    });
  });
  return ondas;
}

function montarFases(): readonly PhaseDefinition[] {
  return DESENHO.map((fase, indice) => {
    const numero = indice + 1;
    return {
      id: idFase(numero),
      order: indice,
      waveIds: fase.ondas.map((_, posicao) => idOnda(numero, posicao + 1)),
      nextPhaseId: numero < DESENHO.length ? idFase(numero + 1) : null,
      // falhar recua para a fase anterior já limpa, nunca apaga progresso
      retreatPhaseId: numero > 1 ? idFase(numero - 1) : null,
    };
  });
}

/** Papel de cada fase, para interface e documentação. */
export const WORLD_0_PHASE_ROLES: Readonly<Record<string, string>> = Object.fromEntries(
  DESENHO.map((fase, indice) => [idFase(indice + 1), fase.papel]),
);

export const WORLD_0_CONTENT: GameContentContext = {
  version: "world-0.1",
  phases: montarFases(),
  waves: montarOndas(),
  enemies: montarInimigos(),
  spells: [],
  dropTables: TABELAS,
  consumables: [{ id: "w0-pocao-por-onda", itemId: W0_POCAO.id, quantity: 1, goldCost: 50 }],
  combatRules: { tickSeconds: 0.25, defenseConstant: 100 },
  rewardRules: { goldResourceId: "gold" },
  runRules: { walkingMs: 2500, offlineCapMs: 12 * 60 * 60 * 1000, checkpointEveryWave: true },
  derivedStatFormulas: FORMULAS,
};

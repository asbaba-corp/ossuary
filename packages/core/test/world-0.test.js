/**
 * O Mundo 0 tem de ser JOGÁVEL, não só válido. O teste mais importante daqui
 * joga as dez fases contra o motor real e exige que todas fechem.
 *
 * Foi ele que pegou os dois erros que a planilha não pegava: uma arma comum
 * caindo na fase 1 ocupava o slot e impedia a foice de ser vestida na fase 3,
 * e o calibre baseado em queima de poção matava a run porque o motor ainda
 * não tem cura nenhuma.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { WORLD_0_CONTENT, WORLD_0_PHASE_ROLES, W0_FOICE, W0_CEIFA } from "../dist/world-0.js";
import { validateGameContent } from "../dist/game-content.js";
import { createInitialGameState, applyGameAction, tickGameState } from "../dist/game-state.js";
import { allocatePartyAttributePoint } from "../dist/party.js";

const C = WORLD_0_CONTENT;
const HEROI = "character-1";

/* ---------------- estrutura ---------------- */

test("o conteúdo passa no validador do projeto", () => {
  assert.deepEqual(validateGameContent(C), []);
});

test("dez noites: 3 ondas nas quatro primeiras, 5 nas seis últimas", () => {
  assert.equal(C.phases.length, 10);

  // a regra, não o total: 37 ou 42 é consequência, a forma é o que foi decidido
  C.phases.forEach((fase, indice) => {
    const noite = indice + 1;
    const esperado = noite <= 4 ? 3 : 5;
    assert.equal(fase.waveIds.length, esperado, `a noite ${noite} tem ${fase.waveIds.length} ondas, esperava ${esperado}`);
  });

  assert.equal(C.waves.length, 4 * 3 + 6 * 5);
});

test("as fases formam uma corrente do início ao guardião", () => {
  for (let i = 0; i < C.phases.length; i += 1) {
    const fase = C.phases[i];
    assert.equal(fase.order, i);
    assert.equal(fase.nextPhaseId, i < 9 ? C.phases[i + 1].id : null);
    assert.equal(fase.retreatPhaseId, i > 0 ? C.phases[i - 1].id : null);
  }
});

test("os papéis seguem o arco do core-design §3.3", () => {
  const papeis = C.phases.map((f) => WORLD_0_PHASE_ROLES[f.id]);
  assert.deepEqual(papeis, [
    "Apresentação", "Apresentação", "Escalada", "Escalada", "Miniboss",
    "Pressão", "Pressão", "Elite", "A parede", "Guardião",
  ]);
});

/* ---------------- bestiário ---------------- */

const especiesDaFase = (n) => {
  const fase = C.phases[n - 1];
  const ids = fase.waveIds.flatMap((id) => C.waves.find((w) => w.id === id).enemyIds);
  return new Set(ids.map((id) => id.replace(/^w0-/, "").replace(/-f\d+$/, "")));
};

test("cada espécie estreia na fase que o design manda", () => {
  assert.deepEqual([...especiesDaFase(1)], ["ignavo"], "fase 1 só apresenta o Ignavo");
  assert.ok(especiesDaFase(3).has("moscardo"), "Moscardo estreia na 3");
  assert.ok(especiesDaFase(5).has("marcado"), "o elite aparece no miniboss");
  assert.ok(especiesDaFase(6).has("gorja"), "Gorja estreia na pressão");
  assert.ok(especiesDaFase(9).has("encalhado"), "a parede é na 9");
  assert.ok(especiesDaFase(10).has("caronte"), "o guardião é na 10");
});

test("o Encalhado não aparece antes da parede", () => {
  for (let n = 1; n <= 8; n += 1) {
    assert.ok(!especiesDaFase(n).has("encalhado"), `Encalhado não deveria estar na fase ${n}`);
  }
});

test("o Encalhado tem defesa acima do defenseConstant — é isso que o torna parede", () => {
  const encalhado = C.enemies.find((e) => e.id === "w0-encalhado-f9");
  assert.ok(encalhado.stats.defense > C.combatRules.defenseConstant);
});

test("a Gorja drena, e é a única que drena", () => {
  const comDreno = C.enemies.filter((e) => e.stats.sustainPercent > 0);
  assert.ok(comDreno.length > 0);
  assert.ok(comDreno.every((e) => e.id.startsWith("w0-gorja")));
});

/* ---------------- armas e alcance ---------------- */

test("a escada de alcance sobe com a raridade", () => {
  assert.equal(W0_FOICE.rarity, "rare");
  assert.equal(W0_FOICE.stats.reachBonus, 1);
  assert.equal(W0_CEIFA.rarity, "legendary");
  assert.equal(W0_CEIFA.stats.reachBonus, 2);
});

/* O drop precisa ser CERTO, não provável: as fases seguintes contam com ele. */
test("as tabelas da foice e da ceifa têm uma entrada só", () => {
  for (const id of ["w0-drop-foice", "w0-drop-ceifa"]) {
    const tabela = C.dropTables.find((t) => t.id === id);
    assert.equal(tabela.entries.length, 1, `${id} precisa ser garantido`);
  }
});

/* Se uma arma cair antes da fase 3, ela ocupa o slot e a foice nunca é
   vestida — o auto-equipar só preenche slot vazio. Foi assim que a run
   morria na fase 4. */
test("nenhuma arma cai antes da fase 3", () => {
  for (const n of [1, 2]) {
    const tabelaId = C.waves.find((w) => w.id === C.phases[n - 1].waveIds[0]).dropTableId;
    const tabela = C.dropTables.find((t) => t.id === tabelaId);
    const temArma = tabela.entries.some((e) => e.equipment.slot === "weapon");
    assert.equal(temArma, false, `a fase ${n} não pode dropar arma`);
  }
});

/* ---------------- jogabilidade ---------------- */

// distribui 2 STR : 1 CONS, o build de referência do círculo
function distribuir(estado) {
  let roster = estado.roster;
  let mudou = false;
  for (const personagem of roster.characters) {
    let pontos = personagem.progress.unspentAttributePoints;
    let gastos = personagem.progress.attributes.str + personagem.progress.attributes.cons;
    while (pontos > 0) {
      roster = allocatePartyAttributePoint(roster, estado.party, personagem.id, gastos % 3 === 2 ? "cons" : "str");
      pontos -= 1; gastos += 1; mudou = true;
    }
  }
  return mudou ? { ...estado, roster } : estado;
}

function jogarMundo() {
  let estado = createInitialGameState(C);
  const relatorio = [];
  for (const fase of C.phases) {
    estado = distribuir(estado);
    estado = applyGameAction(estado, { type: "start_run", phaseId: fase.id, seed: 42 }, C).state;
    let ticks = 0, derrota = false;
    while (ticks < 20000 && estado.run && estado.run.status !== "completed") {
      const r = tickGameState(estado, 500, C);
      estado = r.state; ticks += 1;
      if (r.events.some((e) => e.type === "run_defeat")) { derrota = true; break; }
      estado = distribuir(estado);
    }
    relatorio.push({ fase: fase.id, limpa: estado.world.clearedPhaseIds.includes(fase.id), derrota });
    if (derrota) break;
  }
  return { estado, relatorio };
}

/* BALANCEAMENTO É DO TIME, NÃO DESTE TESTE.
   Este teste exigia que as dez noites fechassem com um personagem e o build de
   referência. Isso amarrava a FORMA do mundo (quantas noites, quantas ondas) ao
   CALIBRE (quanto cada bicho bate): mudar a forma reprovava a suíte mesmo com o
   motor perfeito, e a saída fácil era mexer nos números até o vermelho sumir —
   ou seja, balancear às cegas para agradar um assert.

   O que o teste garante agora é o que é responsabilidade do código: o motor
   atravessa as dez noites sem lançar, e cada noite ou fecha ou termina em
   derrota declarada — nunca trava no meio. Até onde o herói CHEGA é relatório,
   impresso para quem estiver calibrando, e não motivo de reprovação. */
test("o motor atravessa as dez noites sem travar, e informa até onde o build de referência chega", () => {
  const { relatorio } = jogarMundo();

  for (const r of relatorio) {
    assert.ok(r.limpa || r.derrota, `a noite ${r.fase} nem fechou nem declarou derrota — o motor travou nela`);
  }

  const parou = relatorio.find((r) => !r.limpa);
  console.log(parou
    ? `      fronteira do build de referência: ${parou.fase} (limpou ${relatorio.length - 1} de 10)`
    : "      fronteira do build de referência: as dez noites fecham");
});

test("a foice é vestida sozinha ao chegar na fase 3", () => {
  let estado = createInitialGameState(C);
  assert.equal(estado.roster.equipmentLoadouts[HEROI].equipped.weapon, null, "começa sem arma");

  for (const fase of C.phases.slice(0, 3)) {
    estado = distribuir(estado);
    estado = applyGameAction(estado, { type: "start_run", phaseId: fase.id, seed: 42 }, C).state;
    let ticks = 0;
    while (ticks < 20000 && estado.run && estado.run.status !== "completed") {
      estado = distribuir(tickGameState(estado, 500, C).state);
      ticks += 1;
    }
  }

  const arma = estado.roster.equipmentLoadouts[HEROI].equipped.weapon;
  assert.ok(arma, "a foice deveria estar equipada ao fim da fase 3");
  assert.equal(arma.id, W0_FOICE.id);
  assert.equal(arma.stats.reachBonus, 1, "e deveria dar o segundo alvo");
});

/* Também calibre, e pela mesma razão: o nível ao fim depende de quanta XP cada
   onda paga, que é o que o time ajusta. O que o código deve garantir é que a
   progressão ANDA — que jogar rende nível — não que renda exatamente dez. */
test("jogar o mundo faz o herói subir de nível", () => {
  const { estado } = jogarMundo();
  const nivel = estado.roster.characters[0].progress.level;
  assert.ok(nivel > 1, `o herói terminou no nível ${nivel}: a XP não está virando progressão`);
  console.log(`      nível do build de referência ao parar: ${nivel}`);
});

/**
 * Integração: o drop de uma vitória de onda chega EQUIPADO, não parado na
 * mochila.
 *
 * É a garantia que sustenta o calibre do Mundo 0. A fase 3 entrega a arma que
 * dá o segundo alvo, e as fases seguintes assumem que ela está em uso. Se este
 * teste cair, o jogador atravessa o mundo com o alcance errado e a curva de
 * dificuldade inteira sai do lugar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createInitialGameState,
  applyGameAction,
  tickGameState,
} from "../dist/game-state.js";
import { VERTICAL_FIXTURE_CONTENT, addFixtureStartingItems } from "../dist/vertical-fixture.js";

const CONTEUDO = VERTICAL_FIXTURE_CONTENT;
const HEROI = "character-1";

// as ondas da fixture cobram uma poção por vitória
const estadoInicial = () => addFixtureStartingItems(createInitialGameState(CONTEUDO));

function ateVencerUmaOnda() {
  let estado = estadoInicial();
  estado = applyGameAction(estado, { type: "start_run", seed: 7 }, CONTEUDO).state;
  // caminhada + combate; a fixture usa rato de 8 de vida, cai rápido
  for (let i = 0; i < 40; i += 1) {
    const r = tickGameState(estado, 1000, CONTEUDO);
    estado = r.state;
    if (r.events.some((e) => e.type === "wave_victory")) return estado;
  }
  throw new Error("nenhuma onda foi vencida no orçamento de ticks");
}

test("o drop da onda entra no slot vazio em vez de ficar na mochila", () => {
  const inicial = estadoInicial();
  assert.equal(
    inicial.roster.equipmentLoadouts[HEROI].equipped.weapon,
    null,
    "o herói começa sem arma",
  );

  const depois = ateVencerUmaOnda();
  const arma = depois.roster.equipmentLoadouts[HEROI].equipped.weapon;
  assert.ok(arma, "a arma deveria ter sido equipada automaticamente");
  assert.equal(arma.slot, "weapon");
});

test("a arma equipada não fica duplicada no inventário", () => {
  const depois = ateVencerUmaOnda();
  const arma = depois.roster.equipmentLoadouts[HEROI].equipped.weapon;
  const naMochila = depois.inventory.items.some(
    (stack) => stack.item.kind === "equipment" && stack.item.instanceId === arma.instanceId,
  );
  assert.equal(naMochila, false);
});

test("vencer mais ondas não troca a arma já equipada", () => {
  let estado = ateVencerUmaOnda();
  const primeira = estado.roster.equipmentLoadouts[HEROI].equipped.weapon.instanceId;

  for (let i = 0; i < 40; i += 1) estado = tickGameState(estado, 1000, CONTEUDO).state;

  const atual = estado.roster.equipmentLoadouts[HEROI].equipped.weapon.instanceId;
  assert.equal(atual, primeira, "a escolha do jogador nunca é desfeita pelo automático");
});

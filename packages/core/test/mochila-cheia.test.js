/**
 * Regressão: mochila cheia travava a run para sempre.
 *
 * `addItem` lança `inventory has no available slots` quando não há vaga. Isso
 * subia pelo tick, e no app o `setInterval` seguia chamando um tick que só
 * sabia lançar: o jogo congelava sem nada na tela explicando o motivo. Num
 * idle, encher o inventário não é caso raro — é o destino de quem deixa rodando.
 *
 * O core-design §5.4 diz o oposto: mochila cheia nunca pode parar a caça. A
 * peça sem lugar é vendida e vira ouro.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { WORLD_0_CONTENT } from "../dist/world-0.js";
import { createInitialGameState, applyGameAction, tickGameState } from "../dist/game-state.js";
import { getAccountBalance, GOLD_RESOURCE } from "../dist/economy.js";

const C = WORLD_0_CONTENT;

/** Farma a mesma fase até encher a mochila, ou até o limite de voltas. */
function farmaAte(state, phaseId, parar, maxVoltas = 400) {
  for (let volta = 0; volta < maxVoltas && !parar(state); volta++) {
    state = applyGameAction(state, { type: "start_run", phaseId }, C).state;
    for (let i = 0; i < 600 && state.run && state.run.status !== "completed"; i++) {
      state = tickGameState(state, 250, C).state;
    }
  }
  return state;
}

test("encher a mochila não derruba o tick", () => {
  const phaseId = C.phases[0].id;
  const cheia = (s) => s.inventory.items.length >= s.inventory.capacity;

  // farmar até lotar é o próprio caso de teste; se lançar, o teste falha aqui
  let state = farmaAte(createInitialGameState(C, "mochila"), phaseId, cheia);
  assert.ok(cheia(state), "a mochila não encheu; o teste não exercitou o caso");

  // e continua jogável depois de cheia
  state = applyGameAction(state, { type: "start_run", phaseId }, C).state;
  for (let i = 0; i < 600 && state.run && state.run.status !== "completed"; i++) {
    state = tickGameState(state, 250, C).state;
  }
  assert.equal(state.run?.status, "completed", "a run após lotar a mochila não fechou");
});

test("o drop sem lugar vira ouro em vez de sumir", () => {
  const phaseId = C.phases[0].id;
  const cheia = (s) => s.inventory.items.length >= s.inventory.capacity;

  let state = farmaAte(createInitialGameState(C, "mochila-ouro"), phaseId, cheia);
  const antes = getAccountBalance(state.economy, GOLD_RESOURCE);

  state = applyGameAction(state, { type: "start_run", phaseId }, C).state;
  for (let i = 0; i < 600 && state.run && state.run.status !== "completed"; i++) {
    state = tickGameState(state, 250, C).state;
  }

  assert.ok(
    getAccountBalance(state.economy, GOLD_RESOURCE) > antes,
    "a run com a mochila cheia não rendeu ouro nenhum — o drop sumiu",
  );
  assert.equal(state.inventory.items.length, state.inventory.capacity, "a mochila passou da capacidade");
});

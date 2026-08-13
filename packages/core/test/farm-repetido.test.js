/**
 * Regressão: farmar a mesma fase duas vezes derrubava o tick.
 *
 * O id da instância do drop era `phaseId:waveIndex:hash(seed)` — determinístico.
 * Repetir a fase gerava a mesma instância, o inventário recusava com
 * "equipment instance is already in inventory" e a run parava. Num jogo idle,
 * cujo loop inteiro é repetir a fase de melhor saldo, isso quebra a proposta.
 *
 * O teste roda o motor de verdade em vez de checar o formato do id: o que
 * importa é que o loop sobreviva, não como a unicidade foi conseguida.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { WORLD_0_CONTENT } from "../dist/world-0.js";
import { createInitialGameState, applyGameAction, tickGameState } from "../dist/game-state.js";

const C = WORLD_0_CONTENT;

/** Joga uma fase até o fim, ou até o limite de ticks. */
function jogaFase(state, phaseId, maxTicks = 600) {
  let s = applyGameAction(state, { type: "start_run", phaseId }, C).state;
  for (let i = 0; i < maxTicks && s.run && s.run.status !== "completed"; i++) {
    s = tickGameState(s, 250, C).state;
  }
  return s;
}

test("a mesma fase pode ser farmada várias vezes seguidas", () => {
  const phaseId = C.phases[0].id;
  let state = createInitialGameState(C, "farm");

  for (let volta = 1; volta <= 5; volta++) {
    state = jogaFase(state, phaseId);
    assert.equal(state.run?.status, "completed", `a volta ${volta} não fechou a fase`);
  }
});

test("cada repetição gera uma instância de equipamento distinta", () => {
  const phaseId = C.phases[0].id;
  let state = createInitialGameState(C, "farm-ids");

  for (let volta = 0; volta < 4; volta++) state = jogaFase(state, phaseId);

  const ids = state.inventory.items
    .map(({ item }) => item.instanceId)
    .filter((id) => typeof id === "string");
  assert.equal(new Set(ids).size, ids.length, "duas peças no inventário compartilham instanceId");
});

test("repetir a fase com a mesma seed não derruba o tick", () => {
  const phaseId = C.phases[0].id;
  let state = createInitialGameState(C, "seed-fixa");

  // seed fixa é o pior caso: era exatamente o que colidia
  for (let volta = 1; volta <= 3; volta++) {
    state = applyGameAction(state, { type: "start_run", phaseId, seed: 12345 }, C).state;
    for (let i = 0; i < 600 && state.run && state.run.status !== "completed"; i++) {
      state = tickGameState(state, 250, C).state;   // lançava aqui, na volta 2
    }
    assert.equal(state.run?.status, "completed", `a volta ${volta} com seed fixa não fechou`);
  }
});

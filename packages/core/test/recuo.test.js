/**
 * O recuo deixa a run VIVA na fase anterior — não a encerra.
 *
 * Foi isso que escondeu um laço de morte no app: o cliente só avança de noite
 * quando a run fica `completed`, e depois de uma derrota ela fica `walking` na
 * fase de recuo. O jogo então limpava a noite 1, abria a 2, morria, voltava
 * para a 1 e recomeçava — de fora, parecia que a noite nunca avançava.
 *
 * O comportamento do motor está certo: num idle a marcha não pode parar porque
 * a party apanhou. O que faltava era o cliente saber disso.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { WORLD_0_CONTENT as C } from "../dist/world-0.js";
import { createInitialGameState, applyGameAction, tickGameState } from "../dist/game-state.js";

test("recuar mantém a run em andamento, não a encerra", () => {
  let estado = createInitialGameState(C, "recuo");
  estado = applyGameAction(estado, { type: "start_run", phaseId: C.phases[0].id }, C).state;
  for (let i = 0; i < 10; i += 1) estado = tickGameState(estado, 250, C).state;

  estado = applyGameAction(estado, { type: "retreat" }, C).state;

  assert.equal(estado.run?.status, "walking", "o recuo encerrou a run; o cliente conta com ela viva");
  assert.notEqual(estado.run?.status, "completed");
});

test("recuar da primeira noite mantém a party nela, sem fase abaixo", () => {
  let estado = createInitialGameState(C, "recuo");
  estado = applyGameAction(estado, { type: "start_run", phaseId: C.phases[0].id }, C).state;
  estado = applyGameAction(estado, { type: "retreat" }, C).state;

  // a noite 1 não tem `retreatPhaseId`: o fundo do poço é ela mesma
  assert.equal(estado.run?.phaseId, C.phases[0].id);
  assert.equal(estado.world.selectedFarmPhaseId, C.phases[0].id);
});

test("recuar de uma noite mais funda devolve a party à anterior", () => {
  let estado = createInitialGameState(C, "recuo");
  // abre a noite 2 vencendo a 1
  estado = applyGameAction(estado, { type: "start_run", phaseId: C.phases[0].id, seed: 42 }, C).state;
  for (let i = 0; i < 4000 && estado.run && estado.run.status !== "completed"; i += 1) {
    estado = tickGameState(estado, 250, C).state;
  }
  assert.ok(estado.world.unlockedPhaseIds.includes(C.phases[1].id), "a noite 2 não abriu");

  estado = applyGameAction(estado, { type: "start_run", phaseId: C.phases[1].id }, C).state;
  estado = applyGameAction(estado, { type: "retreat" }, C).state;

  assert.equal(estado.run?.phaseId, C.phases[0].id, "o recuo da noite 2 deveria devolver à 1");
  assert.equal(estado.run?.status, "walking");
});

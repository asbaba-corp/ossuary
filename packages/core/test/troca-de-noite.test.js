/**
 * Regressão: trocar de noite falhava calada.
 *
 * O HUD passou a deixar o jogador escolher qualquer noite já aberta. A troca
 * chamava `start_run` direto, e com uma run em andamento isso lança
 * `já existe uma run em andamento`. O erro morria num `catch` que só escrevia
 * no console: o clique simplesmente não fazia nada.
 *
 * `abandon_run` encerra a run em curso sem punição — trocar de alvo não é
 * fracassar, e por isso não pode passar pelo `retreat`, que volta uma fase.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { WORLD_0_CONTENT as C } from "../dist/world-0.js";
import { createInitialGameState, applyGameAction, tickGameState } from "../dist/game-state.js";

const N1 = C.phases[0].id;
const N2 = C.phases[1].id;

test("start_run com run em andamento continua sendo recusado", () => {
  let estado = createInitialGameState(C, "troca");
  estado = applyGameAction(estado, { type: "start_run", phaseId: N1 }, C).state;

  assert.throws(
    () => applyGameAction(estado, { type: "start_run", phaseId: N2 }, C),
    /run em andamento/,
    "a guarda contra duplo start sumiu; ela é o que evita começar duas runs por engano",
  );
});

test("abandonar encerra a run em curso e libera a próxima", () => {
  let estado = createInitialGameState(C, "troca");
  estado = applyGameAction(estado, { type: "start_run", phaseId: N1 }, C).state;
  for (let i = 0; i < 20; i += 1) estado = tickGameState(estado, 250, C).state;

  estado = applyGameAction(estado, { type: "abandon_run" }, C).state;
  assert.equal(estado.run?.status, "completed", "abandonar deveria encerrar a run");

  // e agora a troca de noite passa
  estado = applyGameAction(estado, { type: "start_run", phaseId: N1 }, C).state;
  assert.equal(estado.run?.phaseId, N1);
  assert.equal(estado.run?.status, "walking");
});

test("abandonar não conta derrota nem recua de fase", () => {
  let estado = createInitialGameState(C, "troca");
  estado = applyGameAction(estado, { type: "start_run", phaseId: N1 }, C).state;
  const faseAntes = estado.world.selectedFarmPhaseId;
  const recuosAntes = estado.run?.metrics?.retreats ?? 0;

  estado = applyGameAction(estado, { type: "abandon_run" }, C).state;

  assert.equal(estado.run?.metrics?.retreats ?? 0, recuosAntes, "abandonar virou derrota");
  assert.equal(estado.world.selectedFarmPhaseId, faseAntes, "abandonar mexeu na fase de farm");
});

test("abandonar sem run em curso é inofensivo", () => {
  const estado = createInitialGameState(C, "troca");
  const depois = applyGameAction(estado, { type: "abandon_run" }, C).state;
  assert.equal(depois.run, null);
});

test("as noites encadeiam: vencer a 1 abre a 2, vencer a 2 abre a 3", () => {
  let estado = createInitialGameState(C, "corrente");

  for (const [indice, fase] of C.phases.slice(0, 2).entries()) {
    estado = applyGameAction(estado, { type: "start_run", phaseId: fase.id, seed: 42 }, C).state;
    for (let i = 0; i < 4000 && estado.run && estado.run.status !== "completed"; i += 1) {
      estado = tickGameState(estado, 500, C).state;
    }
    const seguinte = C.phases[indice + 1].id;
    assert.ok(
      estado.world.unlockedPhaseIds.includes(seguinte),
      `vencer a noite ${indice + 1} não abriu a ${indice + 2}`,
    );
  }
});

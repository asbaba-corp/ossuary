/**
 * O save é o único módulo cujo defeito é irreversível: combate mal balanceado
 * se corrige no patch seguinte, save corrompido apaga o progresso de quem
 * jogou. Tinha zero cobertura até aqui.
 *
 * O que se exige: o que sai da serialização volta idêntico, a validação recusa
 * lixo em vez de deixar passar, e a migração é idempotente.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { WORLD_0_CONTENT } from "../dist/world-0.js";
import { createInitialGameState, applyGameAction, tickGameState } from "../dist/game-state.js";
import {
  serializeGameState,
  deserializeGameState,
  migrateSave,
  validateGameState,
  CURRENT_SAVE_SCHEMA_VERSION,
} from "../dist/save.js";

const C = WORLD_0_CONTENT;

/** Um estado já mexido: save vazio esconde erro em campo que só aparece jogando. */
function estadoJogado() {
  let state = createInitialGameState(C, "test-device");
  state = applyGameAction(state, { type: "start_run" }, C).state;
  for (let i = 0; i < 400 && state.run?.status !== "completed"; i++) {
    state = tickGameState(state, 250, C).state;
  }
  return state;
}

test("o que é serializado volta igual", () => {
  const original = estadoJogado();
  const volta = deserializeGameState(serializeGameState(original));

  assert.deepEqual(volta.economy, original.economy, "economia mudou na ida e volta");
  assert.deepEqual(volta.inventory, original.inventory, "inventário mudou na ida e volta");
  assert.deepEqual(volta.world, original.world, "progresso de mundo mudou na ida e volta");
  assert.deepEqual(volta.roster, original.roster, "roster mudou na ida e volta");
  assert.equal(volta.run?.phaseId, original.run?.phaseId);
  assert.equal(volta.run?.waveIndex, original.run?.waveIndex);
});

test("o save carrega a versão de schema corrente", () => {
  const blob = serializeGameState(createInitialGameState(C, "d"));
  assert.equal(blob.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
});

test("migrar duas vezes dá no mesmo que migrar uma", () => {
  const blob = serializeGameState(createInitialGameState(C, "d"));
  const uma = migrateSave(blob);
  const duas = migrateSave(uma);
  assert.deepEqual(duas, uma, "migração não é idempotente — reabrir o app mexeria no save");
});

test("a validação recusa lixo em vez de deixar passar", () => {
  for (const entrada of [null, undefined, 42, "save", [], {}]) {
    const erros = validateGameState(entrada);
    assert.ok(erros.length > 0, `aceitou entrada inválida: ${JSON.stringify(entrada)}`);
  }
});

test("a validação aceita um estado real", () => {
  assert.deepEqual(validateGameState(estadoJogado()), []);
});

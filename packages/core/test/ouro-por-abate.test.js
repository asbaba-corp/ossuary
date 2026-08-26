/**
 * Ouro por abate, em faixa.
 *
 * Antes o ouro só entrava na vitória da onda: matar dez bichos e cair no
 * décimo primeiro não rendia nada, e o contador ficava parado durante a luta.
 * Agora cada queda paga na hora.
 *
 * A faixa é o ponto — valor fixo faria a caça parecer planilha. Mas faixa com
 * sorteio precisa continuar determinística, senão dois carregamentos do mesmo
 * save divergem e o servidor não consegue validar o cliente.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { WORLD_0_CONTENT as C } from "../dist/world-0.js";
import { createInitialGameState, applyGameAction, tickGameState } from "../dist/game-state.js";

/** Joga a noite 1 e devolve o ouro ganho e quantos caíram. */
function cacar(seed) {
  let estado = createInitialGameState(C, "ouro");
  const antes = estado.economy.account.gold;
  estado = applyGameAction(estado, { type: "start_run", phaseId: C.phases[0].id, seed }, C).state;
  let abates = 0;
  for (let i = 0; i < 3000 && estado.run && estado.run.status !== "completed"; i += 1) {
    const passo = tickGameState(estado, 250, C);
    estado = passo.state;
    abates += passo.events.filter((e) => e.type === "combat" && e.event.type === "combatant_defeated").length;
  }
  return { ganho: estado.economy.account.gold - antes, abates };
}

test("todo inimigo do Mundo 0 tem faixa de ouro válida", () => {
  for (const inimigo of C.enemies) {
    assert.ok(inimigo.goldRange, `${inimigo.id} não tem faixa de ouro`);
    const [minimo, maximo] = inimigo.goldRange;
    assert.ok(minimo > 0, `${inimigo.id}: mínimo tem de ser positivo`);
    assert.ok(maximo >= minimo, `${inimigo.id}: máximo abaixo do mínimo`);
  }
});

test("a faixa escala com a noite", () => {
  const n1 = C.enemies.find(({ id }) => id === "w0-ignavo-f1").goldRange;
  const n10 = C.enemies.find(({ id }) => id === "w0-ignavo-f10").goldRange;
  assert.ok(n10[0] > n1[0], "o ignavo da noite 10 deveria valer mais que o da noite 1");
});

test("elite e guardião valem mais que a multidão", () => {
  const ignavo = C.enemies.find(({ id }) => id === "w0-ignavo-f10").goldRange[1];
  const marcado = C.enemies.find(({ id }) => id === "w0-marcado-f10")?.goldRange?.[1]
    ?? C.enemies.find(({ id }) => id.startsWith("w0-marcado")).goldRange[1];
  assert.ok(marcado > ignavo * 3, "o elite deveria valer bem mais que um da multidão");
});

test("matar rende ouro durante a luta, não só ao fim da onda", () => {
  const { ganho, abates } = cacar(42);
  assert.ok(abates > 0, "nada morreu; o teste não exercitou o caso");
  assert.ok(ganho > 0, "a caça não rendeu ouro nenhum");
});

test("o mesmo save rende o mesmo ouro: o sorteio é determinístico", () => {
  assert.equal(cacar(7).ganho, cacar(7).ganho, "duas runs com a mesma seed renderam ouro diferente");
});

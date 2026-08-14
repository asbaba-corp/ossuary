/**
 * Regressão de desempenho: a sessão gravava o save a cada tick.
 *
 * `pendingSync` fica ligado quase sempre, então a condição antiga gravava 4
 * vezes por segundo. Cada gravação é `serializeGameState` (que ainda clona por
 * JSON) mais o `JSON.stringify` do store mais um `localStorage.setItem`
 * síncrono — sobre um estado que cresce a cada onda. Medido no app: quadros de
 * mais de um segundo no meio de uma cena que, fora eles, corre a 60fps.
 *
 * O teste conta chamadas ao store, não mede tempo: contagem é determinística e
 * não falha por lentidão da máquina de CI.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { WORLD_0_CONTENT as C } from "../dist/world-0.js";
import { GameSession } from "../dist/session.js";

/** Store que só conta, e relógio que o teste controla. */
function montar() {
  let guardado = null;
  const store = {
    gravacoes: 0,
    load: async () => guardado,
    save: async (blob) => { store.gravacoes += 1; guardado = blob; },
    clear: async () => { guardado = null; },
  };
  const relogio = { agora: 0, nowMs: () => relogio.agora };
  const session = new GameSession({ saveStore: store, clock: relogio, content: C, deviceId: "teste" });
  return { store, relogio, session };
}

test("ticks de rotina não gravam o save a cada vez", async () => {
  const { store, relogio, session } = montar();
  await session.load();
  await session.action({ type: "start_run", phaseId: C.phases[0].id, seed: 7 });

  const antes = store.gravacoes;

  // 8 ticks dentro da mesma janela de tempo: o relógio nem anda
  for (let i = 0; i < 8; i += 1) await session.tick(250);

  const rotina = store.gravacoes - antes;
  assert.ok(rotina <= 2, `8 ticks na mesma janela geraram ${rotina} gravações; antes eram uma por tick`);
});

test("o que é progresso grava na hora, sem esperar o intervalo", async () => {
  const { store, relogio, session } = montar();
  await session.load();
  await session.action({ type: "start_run", phaseId: C.phases[0].id, seed: 7 });

  // roda até a primeira onda cair, com o relógio PARADO: se algo gravar aqui,
  // foi por ser progresso, nunca por tempo decorrido
  const antes = store.gravacoes;
  let venceu = false;
  for (let i = 0; i < 600 && !venceu; i += 1) {
    const eventos = await session.tick(250);
    venceu = eventos.some(({ type }) => type === "wave_victory");
  }

  assert.ok(venceu, "a primeira onda não caiu; o teste não exercitou o caso");
  assert.ok(store.gravacoes > antes, "a vitória de onda não gravou o save — progresso pode se perder");
});

test("passado o intervalo, a gravação de rotina volta a acontecer", async () => {
  const { store, relogio, session } = montar();
  await session.load();
  await session.action({ type: "start_run", phaseId: C.phases[0].id, seed: 7 });

  await session.tick(250);
  const antes = store.gravacoes;

  relogio.agora += 60_000;      // muito além de qualquer intervalo razoável
  await session.tick(250);

  assert.ok(store.gravacoes > antes, "o save nunca mais foi gravado: o limite virou bloqueio");
});

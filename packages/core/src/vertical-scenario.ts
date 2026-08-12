import { addFixtureStartingItems, VERTICAL_FIXTURE_CONTENT } from "./vertical-fixture.js";
import { applyGameAction, createInitialGameState, tickGameState } from "./game-state.js";
import { deserializeGameState, serializeGameState } from "./save.js";

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`vertical scenario: ${message}`);
}

let state = addFixtureStartingItems(createInitialGameState(VERTICAL_FIXTURE_CONTENT, "scenario-device"));
state = applyGameAction(state, { type: "start_run", seed: "vertical-seed" }, VERTICAL_FIXTURE_CONTENT).state;
let guard = 0;
while (state.run?.status !== "completed" && guard++ < 500) {
  state = tickGameState(state, 250, VERTICAL_FIXTURE_CONTENT).state;
}

check(state.run?.status === "completed", "a run deve terminar em vitória");
check(state.world.unlockedPhaseIds.includes("fixture-phase-1"), "a próxima fase deve ser desbloqueada");
check(state.economy.account.gold === 14, "as duas waves devem pagar ouro líquido");
check(state.inventory.items.some(({ item }) => item.kind === "equipment"), "a run deve entregar equipamento");
check(state.roster.characters[0]?.progress.xp === 65, "a run deve aplicar XP nas duas waves");

const reloaded = deserializeGameState(serializeGameState(state));
check(reloaded.run?.checkpoint.appliedRewardIds.length === 2, "o checkpoint deve ser persistido");
console.log("vertical scenario: ok");

// @ossuary/core — shared game logic (pure TypeScript, no framework).
//
// This is a stub for the multiplatform scaffold. The real simulation
// (deterministic combat, party, attributes, economy, drops — core-design
// §4) will live here and be consumed by `apps/expo` and the future server,
// so the client never decides results (core-design §4.1, §7.1).
//
// For now it only establishes the workspace package and the platform contract.

export const GAME_NAME = "Ossuary" as const;

export type Platform = "ios" | "android" | "web";

export const SUPPORTED_PLATFORMS: readonly Platform[] = ["ios", "android", "web"];

export * from "./progression/xp.js";
export * from "./progression/derived.js";
export * from "./party.js";
export * from "./character.js";
export * from "./equipment.js";
export * from "./inventory.js";
export * from "./random.js";
export * from "./spells.js";
export * from "./spell-loadout.js";
export * from "./spell-runtime.js";
export * from "./ossuary.js";
export * from "./economy.js";
export * from "./combat/index.js";
export * from "./equipment/index.js";
export * from "./auto-equip.js";
export * from "./game-content.js";
export * from "./game-state.js";
export * from "./save.js";
export * from "./stores.js";
export * from "./session.js";
export * from "./vertical-fixture.js";
export * from "./world-0.js";

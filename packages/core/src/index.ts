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
export * from "./party.js";
export * from "./equipment.js";
export * from "./inventory.js";
export * from "./random.js";
export * from "./spells.js";
export * from "./equipment/index.js";

/**
 * Fachada pública do domínio de equipamento.
 *
 * A implementação está organizada em `equipment/`. Este arquivo preserva o
 * contrato histórico de `@ossuary/core` enquanto a migração interna avança.
 */
export * from "./equipment/legacy.js";
export * from "./equipment/index.js";

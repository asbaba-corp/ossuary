import { deterministicUnit } from "../random.js";
import type { CombatRules, CombatantSnapshot } from "./types.js";

export interface CombatDamageResult {
  readonly damage: number;
  readonly critical: boolean;
  readonly healing: number;
}

export function calculateCombatDamage(
  attacker: CombatantSnapshot,
  target: CombatantSnapshot,
  rules: CombatRules,
  seed: number | string,
): CombatDamageResult {
  const criticalRoll = deterministicUnit(seed, "critical");
  const critical = criticalRoll < attacker.stats.criticalChancePercent / 100;
  const defenseAfterPenetration = Math.max(
    0,
    target.stats.defense - attacker.stats.penetration,
  );
  /* O piso existe para o combate sempre resolver. Sem ele, defesa a partir de
     `defenseConstant + penetração` zera o dano: o alvo fica imortal e a
     batalha roda até o teto de ticks sem vencedor. O Encalhado do Mundo 0 tem
     defesa 106 contra penetração inicial 6, exatamente esse caso.

     Ele não afrouxa a parede — 5% de 100 de dano ainda é uma eternidade
     contra quem não investiu em penetração. Só garante que exista saída. */
  const mitigation = Math.max(
    minimumMitigation(rules),
    1 - defenseAfterPenetration / rules.defenseConstant,
  );
  const rawDamage = attacker.stats.damage * (critical ? attacker.stats.criticalMultiplier : 1);
  const damage = Math.max(0, rawDamage * mitigation);
  return {
    damage,
    critical,
    healing: damage * attacker.stats.sustainPercent / 100,
  };
}

export const DEFAULT_MINIMUM_MITIGATION = 0.05;

function minimumMitigation(rules: CombatRules): number {
  const configured = rules.minimumMitigation;
  if (configured === undefined) return DEFAULT_MINIMUM_MITIGATION;
  if (!Number.isFinite(configured) || configured < 0 || configured > 1) {
    throw new RangeError("minimumMitigation deve estar entre 0 e 1");
  }
  return configured;
}

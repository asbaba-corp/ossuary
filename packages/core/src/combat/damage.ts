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
  const mitigation = Math.max(0, 1 - defenseAfterPenetration / rules.defenseConstant);
  const rawDamage = attacker.stats.damage * (critical ? attacker.stats.criticalMultiplier : 1);
  const damage = Math.max(0, rawDamage * mitigation);
  return {
    damage,
    critical,
    healing: damage * attacker.stats.sustainPercent / 100,
  };
}

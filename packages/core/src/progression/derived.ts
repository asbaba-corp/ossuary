import type { CharacterAttributes, PrimaryAttribute } from "./xp.js";
import {
  applyOssuaryBonuses,
  OSSUARY_DERIVED_STATS,
  type OssuaryDerivedStat,
} from "../ossuary.js";

export interface DerivedStatFormula {
  readonly base: number;
  readonly attribute: PrimaryAttribute | null;
  readonly coefficient: number;
  readonly includeWeaponBaseDamage?: boolean;
}

export type DerivedStatFormulas = Readonly<Record<OssuaryDerivedStat, DerivedStatFormula>>;

export interface CharacterDerivedStatsInput {
  readonly attributes: CharacterAttributes;
  readonly weaponBaseDamage: number;
  readonly formulas: DerivedStatFormulas;
  readonly ossuaryBonuses: Readonly<Record<OssuaryDerivedStat, number>>;
}

export interface CharacterDerivedStats {
  readonly base: Readonly<Record<OssuaryDerivedStat, number>>;
  readonly effective: Readonly<Record<OssuaryDerivedStat, number>>;
}

export function calculateCharacterDerivedStats(
  input: CharacterDerivedStatsInput,
): CharacterDerivedStats {
  if (!Number.isFinite(input.weaponBaseDamage) || input.weaponBaseDamage < 0) {
    throw new RangeError("weaponBaseDamage deve ser não negativo");
  }

  const base = Object.fromEntries(OSSUARY_DERIVED_STATS.map((stat) => {
    const formula = input.formulas[stat];
    assertFormula(formula, stat);
    const attributeValue = formula.attribute === null ? 0 : input.attributes[formula.attribute];
    if (!Number.isFinite(attributeValue) || attributeValue < 0) {
      throw new RangeError(`atributo inválido para derivado: ${stat}`);
    }
    const weaponValue = formula.includeWeaponBaseDamage ? input.weaponBaseDamage : 0;
    return [stat, formula.base + attributeValue * formula.coefficient + weaponValue];
  })) as Record<OssuaryDerivedStat, number>;

  return {
    base,
    effective: applyOssuaryBonuses(base, input.ossuaryBonuses),
  };
}

function assertFormula(formula: DerivedStatFormula, stat: OssuaryDerivedStat): void {
  if (!formula || !Number.isFinite(formula.base) || formula.base < 0) {
    throw new RangeError(`fórmula inválida: ${stat}`);
  }
  if (!Number.isFinite(formula.coefficient) || formula.coefficient < 0) {
    throw new RangeError(`coeficiente inválido: ${stat}`);
  }
}

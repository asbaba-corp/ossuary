import type { Character } from "../character.js";
import { getEffectiveCharacterAttributes, getEffectiveCharacterStats, type CharacterLoadout, type ItemEffectState } from "../equipment/legacy.js";
import { calculateCharacterDerivedStats, type CharacterDerivedStats, type DerivedStatFormulas } from "../progression/derived.js";
import type { OssuaryDerivedStat } from "../ossuary.js";
import type { SpellDefinition } from "../spells.js";
import type { SpellLoadout } from "../spell-loadout.js";
import type { CombatSide, CombatantSnapshot } from "./types.js";

export interface CharacterCombatBuild {
  readonly character: Character;
  readonly equipment: CharacterLoadout;
  readonly spells: SpellLoadout;
  readonly spellDefinitions: readonly SpellDefinition[];
  readonly itemEffects: ItemEffectState;
  readonly formulas: DerivedStatFormulas;
  readonly ossuaryBonuses: Readonly<Record<OssuaryDerivedStat, number>>;
  readonly side: CombatSide;
}

export interface CharacterCombatSnapshot extends CombatantSnapshot {
  readonly derivedStats: CharacterDerivedStats;
}

export function createCombatantFromCharacter(build: CharacterCombatBuild): CharacterCombatSnapshot {
  const attributes = getEffectiveCharacterAttributes(build.character, build.equipment, build.itemEffects);
  const equipmentStats = getEffectiveCharacterStats(build.character, build.equipment, build.itemEffects);
  const derivedStats = calculateCharacterDerivedStats({
    attributes,
    weaponBaseDamage: equipmentStats.baseDamage,
    formulas: build.formulas,
    ossuaryBonuses: build.ossuaryBonuses,
  });
  const effective = derivedStats.effective;
  const maxMana = Math.max(0, effective.mana);

  return {
    id: build.character.id,
    name: build.character.name,
    side: build.side,
    stats: {
      maxHp: Math.max(1, effective.vigor),
      damage: Math.max(1, effective.damage * (1 + equipmentStats.physicalDamagePercent / 100)),
      defense: Math.max(0, equipmentStats.baseDefense),
      penetration: Math.max(0, effective.penetration + equipmentStats.armorPenetrationPercent),
      attacksPerSecond: Math.max(0.01, effective.cadence * (1 + equipmentStats.attackSpeedPercent / 100)),
      criticalChancePercent: Math.min(100, Math.max(0, effective.critical + equipmentStats.criticalChancePercent)),
      criticalMultiplier: 2,
      sustainPercent: Math.max(0, effective.sustain + equipmentStats.lifestealPercent),
    },
    spells: {
      loadout: build.spells,
      definitions: build.spellDefinitions,
      maxMana,
      initialMana: maxMana,
      int: attributes.int,
      spellDamagePercent: Math.max(0, equipmentStats.spellDamagePercent),
    },
    derivedStats,
  };
}

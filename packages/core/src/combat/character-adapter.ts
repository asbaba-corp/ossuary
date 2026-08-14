import type { Character } from "../character.js";
import { resolvePartyBuilds, type Party, type RosterState } from "../party.js";
import { getEffectiveCharacterAttributes, getEffectiveCharacterStats, type CharacterLoadout, type ItemEffectState } from "../equipment.js";
import { calculateCharacterDerivedStats, type CharacterDerivedStats, type DerivedStatFormulas } from "../progression/derived.js";
import type { OssuaryDerivedStat } from "../ossuary.js";
import type { SpellLoadout } from "../spell-loadout.js";
import type { CombatSide, CombatantSnapshot } from "./types.js";

export interface CharacterCombatBuild {
  readonly character: Character;
  readonly equipment: CharacterLoadout;
  readonly spells: SpellLoadout;
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
      // o derivado dá a base (1) e a arma soma alvos por cima
      reach: Math.max(1, Math.floor(effective.reach + equipmentStats.reachBonus)),
    },
    spells: {
      loadout: build.spells,
      maxMana,
      initialMana: maxMana,
      int: attributes.int,
      // INT entra pelo derivado; o equipamento soma por cima
      spellDamagePercent: Math.max(0, effective.spellDamage + equipmentStats.spellDamagePercent),
    },
    derivedStats,
  };
}

export interface PartyCombatBuildOptions {
  readonly side: CombatSide;
  readonly itemEffects: ItemEffectState;
  readonly formulas: DerivedStatFormulas;
  readonly ossuaryBonuses: Readonly<Record<OssuaryDerivedStat, number>>;
}

export function createCombatantsFromParty(
  roster: RosterState,
  party: Party,
  options: PartyCombatBuildOptions,
): readonly CharacterCombatSnapshot[] {
  return resolvePartyBuilds(roster, party).map(({ character, equipment, spells }) => createCombatantFromCharacter({
    character,
    equipment,
    spells,
    itemEffects: options.itemEffects,
    formulas: options.formulas,
    ossuaryBonuses: options.ossuaryBonuses,
    side: options.side,
  }));
}

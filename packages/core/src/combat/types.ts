import type { SpellAttemptReason } from "../spells.js";
import type { SpellLoadout } from "../spell-loadout.js";

export type CombatSide = "party" | "enemy";
export type CombatOutcome = "in_progress" | "victory" | "defeat";

export interface CombatantStats {
  readonly maxHp: number;
  readonly damage: number;
  readonly defense: number;
  readonly penetration: number;
  readonly attacksPerSecond: number;
  readonly criticalChancePercent: number;
  readonly criticalMultiplier: number;
  readonly sustainPercent: number;
}

export interface CombatantSnapshot {
  readonly id: string;
  readonly name: string;
  readonly side: CombatSide;
  readonly stats: CombatantStats;
  readonly spells?: CombatSpellSetup;
}

export interface CombatSpellSetup {
  readonly loadout: SpellLoadout;
  readonly maxMana: number;
  readonly initialMana?: number;
  readonly int: number;
  readonly spellDamagePercent: number;
}

export type CombatEffectKind = "protection" | "control";

export interface CombatEffectState {
  readonly kind: CombatEffectKind;
  readonly sourceSpellId: string;
  readonly remainingSeconds: number;
}

export interface CombatantState {
  readonly snapshot: CombatantSnapshot;
  readonly hp: number;
  readonly attackCooldown: number;
  readonly mana: number;
  readonly maxMana: number;
  readonly spellCooldowns: Readonly<Record<string, number>>;
  readonly effects: readonly CombatEffectState[];
}

export interface CombatRules {
  readonly tickSeconds: number;
  readonly defenseConstant: number;
  /**
   * Fração mínima do dano que sempre passa, entre 0 e 1. Impede que defesa
   * alta zere o dano e deixe o combate sem saída. Ausente usa 5%.
   */
  readonly minimumMitigation?: number;
  readonly protectionReductionPercent?: number;
  readonly controlCadenceMultiplier?: number;
}

export interface CombatState {
  readonly seed: number | string;
  readonly tick: number;
  readonly elapsedSeconds: number;
  readonly outcome: CombatOutcome;
  readonly combatants: readonly CombatantState[];
}

export interface CombatAttackEvent {
  readonly type: "attack";
  readonly tick: number;
  readonly attackerId: string;
  readonly targetId: string;
  readonly critical: boolean;
  readonly damage: number;
  readonly healing: number;
  readonly targetHpAfter: number;
}

export interface CombatDefeatEvent {
  readonly type: "combatant_defeated";
  readonly tick: number;
  readonly combatantId: string;
}

export interface CombatOutcomeEvent {
  readonly type: "outcome";
  readonly tick: number;
  readonly outcome: Exclude<CombatOutcome, "in_progress">;
}

export interface CombatSpellEvent {
  readonly type: "spell_attempt";
  readonly tick: number;
  readonly casterId: string;
  readonly spellId: string;
  readonly reason: SpellAttemptReason;
  readonly effect: "damage" | "protection" | "control" | null;
  readonly targetId: string | null;
  readonly power: number | null;
  readonly manaAfter: number;
  readonly controlSucceeded: boolean | null;
}

export type CombatEvent = CombatAttackEvent | CombatSpellEvent | CombatDefeatEvent | CombatOutcomeEvent;

export interface CombatTickResult {
  readonly state: CombatState;
  readonly events: readonly CombatEvent[];
}

export interface CombatResolution {
  readonly state: CombatState;
  readonly events: readonly CombatEvent[];
  readonly completed: boolean;
}

/**
 * Regras de experiência e level-up.
 *
 * Padrão: Functional Core + estado imutável.
 *
 * Este módulo recebe dados, calcula uma transição e devolve novos dados. Ele
 * não altera o personagem recebido e não conhece React, banco, relógio ou
 * combate. Assim, cliente e servidor conseguem executar exatamente a mesma
 * regra e testá-la sem infraestrutura.
 */

export const XP_RULES = {
  baseXpToNextLevel: 55,
  levelCurve: 1.42,
  attributePointsPerLevel: 3,
} as const;

export const DEFAULT_CHARACTER_ATTRIBUTES = {
  cons: 5,
  str: 6,
  dex: 5,
  int: 4,
} as const;

export type PrimaryAttribute = keyof CharacterAttributes;

export interface CharacterAttributes {
  readonly cons: number;
  readonly str: number;
  readonly dex: number;
  readonly int: number;
}

export interface CharacterProgress {
  /** Nível atual. Um personagem novo começa no nível 1. */
  readonly level: number;
  /** XP acumulado dentro do nível atual, não o XP total histórico. */
  readonly xp: number;
  /** Pontos aguardando distribuição em CONS/STR/DEX/INT. */
  readonly unspentAttributePoints: number;
  /** Atributos primários do personagem. */
  readonly attributes: CharacterAttributes;
}

export interface ExperienceResult {
  /** Estado novo, sem mutar o objeto recebido. */
  readonly progress: CharacterProgress;
  readonly xpGained: number;
  readonly levelsGained: number;
}

export function createCharacterProgress(): CharacterProgress {
  return {
    level: 1,
    xp: 0,
    unspentAttributePoints: 0,
    attributes: { ...DEFAULT_CHARACTER_ATTRIBUTES },
  };
}

/** XP necessário para avançar de `level` para o nível seguinte. */
export function xpToNextLevel(level: number): number {
  assertPositiveInteger(level, "level");
  return Math.round(
    XP_RULES.baseXpToNextLevel * Math.pow(level, XP_RULES.levelCurve),
  );
}

/**
 * Aplica um ganho de XP como uma transição de estado.
 *
 * Exemplo: se a recompensa atravessar dois limiares, os dois level-ups são
 * aplicados na mesma chamada e o saldo que sobrar fica no novo nível.
 */
export function gainExperience(
  progress: CharacterProgress,
  amount: number,
): ExperienceResult {
  assertProgress(progress);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError("experience amount must be a finite non-negative number");
  }

  let level = progress.level;
  let xp = progress.xp + amount;
  let levelsGained = 0;

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    levelsGained += 1;
  }

  return {
    progress: {
      level,
      xp,
      unspentAttributePoints:
        progress.unspentAttributePoints +
        levelsGained * XP_RULES.attributePointsPerLevel,
      attributes: { ...progress.attributes },
    },
    xpGained: amount,
    levelsGained,
  };
}

/**
 * Distribui um ponto de atributo como uma nova transição de estado.
 *
 * O gasto é separado do ganho de XP: subir de nível libera pontos, mas a
 * escolha de build continua sendo uma decisão explícita do jogador.
 */
export function spendAttributePoint(
  progress: CharacterProgress,
  attribute: PrimaryAttribute,
): CharacterProgress {
  assertProgress(progress);
  assertPrimaryAttribute(attribute);
  if (progress.unspentAttributePoints === 0) {
    throw new RangeError("character has no unspent attribute points");
  }

  return {
    ...progress,
    unspentAttributePoints: progress.unspentAttributePoints - 1,
    attributes: {
      ...progress.attributes,
      [attribute]: progress.attributes[attribute] + 1,
    },
  };
}

function assertProgress(progress: CharacterProgress): void {
  assertPositiveInteger(progress.level, "progress.level");
  if (!Number.isFinite(progress.xp) || progress.xp < 0) {
    throw new RangeError("progress.xp must be a finite non-negative number");
  }
  if (
    !Number.isInteger(progress.unspentAttributePoints) ||
    progress.unspentAttributePoints < 0
  ) {
    throw new RangeError("progress.unspentAttributePoints must be a non-negative integer");
  }
  if (progress.attributes === null || typeof progress.attributes !== "object") {
    throw new RangeError("progress.attributes must be an object");
  }
  for (const attribute of Object.keys(DEFAULT_CHARACTER_ATTRIBUTES) as PrimaryAttribute[]) {
    if (!Number.isInteger(progress.attributes[attribute]) || progress.attributes[attribute] < 0) {
      throw new RangeError(`progress.attributes.${attribute} must be a non-negative integer`);
    }
  }
  if (progress.xp >= xpToNextLevel(progress.level)) {
    throw new RangeError("progress.xp must be below the current level threshold");
  }
}

function assertPrimaryAttribute(value: string): asserts value is PrimaryAttribute {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_CHARACTER_ATTRIBUTES, value)) {
    throw new RangeError(`unknown primary attribute: ${value}`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

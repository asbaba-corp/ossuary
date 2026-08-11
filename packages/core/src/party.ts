import {
  createCharacterProgress,
  gainExperience,
  spendAttributePoint,
  type CharacterAttributes,
  type CharacterProgress,
  type ExperienceResult,
  type PrimaryAttribute,
} from "./progression/xp.js";

export const PARTY_MAX_SIZE = 4 as const;
export const DEFAULT_CHARACTER_ID = "character-1" as const;
export const DEFAULT_CHARACTER_NAME = "Sem-Nome" as const;

export interface Character {
  readonly id: string;
  readonly name: string;
  readonly progress: CharacterProgress;
}

export interface Party {
  readonly characters: readonly Character[];
}

export interface PartyExperienceResult {
  readonly party: Party;
  readonly xpGained: number;
  readonly levelsGainedByCharacter: Readonly<Record<string, number>>;
}

export interface PartySummary {
  readonly characterCount: number;
  readonly totalPartyLevel: number;
  readonly aggregateAttributes: CharacterAttributes;
  readonly unspentAttributePointsByCharacter: Readonly<Record<string, number>>;
  /** Soma dos níveis; ainda não é um score de combate. */
  readonly partyPower: number;
}

export function createCharacter(
  id: string,
  name: string,
  progress: CharacterProgress = createCharacterProgress(),
): Character {
  assertCharacterIdentity(id, name);
  assertCharacterProgress(progress);
  return { id, name, progress: cloneProgress(progress) };
}

export function createParty(
  character: Character = createCharacter(DEFAULT_CHARACTER_ID, DEFAULT_CHARACTER_NAME),
): Party {
  assertCharacter(character);
  return { characters: [cloneCharacter(character)] };
}

export function addCharacter(party: Party, character: Character): Party {
  assertParty(party);
  assertCharacter(character);
  if (party.characters.some((existing) => existing.id === character.id)) {
    throw new RangeError(`party already contains character: ${character.id}`);
  }
  if (party.characters.length >= PARTY_MAX_SIZE) {
    throw new RangeError(`party cannot contain more than ${PARTY_MAX_SIZE} characters`);
  }
  return { characters: [...party.characters.map(cloneCharacter), cloneCharacter(character)] };
}

export function removeCharacter(party: Party, characterId: string): Party {
  assertParty(party);
  assertCharacterId(characterId);
  if (!party.characters.some((character) => character.id === characterId)) {
    throw new RangeError(`character is not in party: ${characterId}`);
  }
  if (party.characters.length === 1) {
    throw new RangeError("party must contain at least one character");
  }
  return {
    characters: party.characters
      .filter((character) => character.id !== characterId)
      .map(cloneCharacter),
  };
}

export function reorderCharacters(party: Party, orderedCharacterIds: readonly string[]): Party {
  assertParty(party);
  if (orderedCharacterIds.length !== party.characters.length) {
    throw new RangeError("reordered party must contain exactly the current characters");
  }
  const charactersById = new Map(party.characters.map((character) => [character.id, character]));
  const reordered = orderedCharacterIds.map((id) => {
    assertCharacterId(id);
    const character = charactersById.get(id);
    if (!character) throw new RangeError(`character is not in party: ${id}`);
    charactersById.delete(id);
    return cloneCharacter(character);
  });
  if (charactersById.size !== 0) {
    throw new RangeError("reordered party must contain every current character exactly once");
  }
  return { characters: reordered };
}

export function moveCharacter(party: Party, characterId: string, targetIndex: number): Party {
  assertParty(party);
  assertCharacterId(characterId);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= party.characters.length) {
    throw new RangeError("targetIndex must be a valid party position");
  }
  const ids = party.characters.map((character) => character.id).filter((id) => id !== characterId);
  ids.splice(targetIndex, 0, characterId);
  return reorderCharacters(party, ids);
}

export function gainPartyExperience(party: Party, amount: number): PartyExperienceResult {
  assertParty(party);
  const levelsGainedByCharacter: Record<string, number> = {};
  const characters = party.characters.map((character) => {
    const result: ExperienceResult = gainExperience(character.progress, amount);
    levelsGainedByCharacter[character.id] = result.levelsGained;
    return { ...character, progress: result.progress };
  });
  return { party: { characters }, xpGained: amount, levelsGainedByCharacter };
}

export function allocatePartyAttributePoint(
  party: Party,
  characterId: string,
  attribute: PrimaryAttribute,
): Party {
  assertParty(party);
  const character = findCharacter(party, characterId);
  const updated = { ...character, progress: spendAttributePoint(character.progress, attribute) };
  return {
    characters: party.characters.map((current) =>
      current.id === characterId ? updated : cloneCharacter(current),
    ),
  };
}

export function getPartySummary(party: Party): PartySummary {
  assertParty(party);
  const aggregateAttributes = { cons: 0, str: 0, dex: 0, int: 0 };
  const unspentAttributePointsByCharacter: Record<string, number> = {};
  let totalPartyLevel = 0;
  for (const character of party.characters) {
    totalPartyLevel += character.progress.level;
    aggregateAttributes.cons += character.progress.attributes.cons;
    aggregateAttributes.str += character.progress.attributes.str;
    aggregateAttributes.dex += character.progress.attributes.dex;
    aggregateAttributes.int += character.progress.attributes.int;
    unspentAttributePointsByCharacter[character.id] = character.progress.unspentAttributePoints;
  }
  return {
    characterCount: party.characters.length,
    totalPartyLevel,
    aggregateAttributes,
    unspentAttributePointsByCharacter,
    partyPower: totalPartyLevel,
  };
}

export const summarizeParty = getPartySummary;

function findCharacter(party: Party, characterId: string): Character {
  assertCharacterId(characterId);
  const character = party.characters.find((candidate) => candidate.id === characterId);
  if (!character) throw new RangeError(`character is not in party: ${characterId}`);
  return character;
}

function assertParty(party: Party): void {
  if (!party || !Array.isArray(party.characters)) throw new RangeError("party.characters must be an array");
  if (party.characters.length < 1 || party.characters.length > PARTY_MAX_SIZE) {
    throw new RangeError(`party must contain between 1 and ${PARTY_MAX_SIZE} characters`);
  }
  const ids = new Set<string>();
  for (const character of party.characters) {
    assertCharacter(character);
    if (ids.has(character.id)) throw new RangeError(`party contains duplicate character: ${character.id}`);
    ids.add(character.id);
  }
}

function assertCharacter(character: Character): void {
  if (!character || typeof character !== "object") throw new RangeError("character must be an object");
  assertCharacterIdentity(character.id, character.name);
  assertCharacterProgress(character.progress);
}

function assertCharacterIdentity(id: string, name: string): void {
  if (typeof id !== "string" || id.trim() === "") throw new RangeError("character id must be a non-empty string");
  if (typeof name !== "string" || name.trim() === "") throw new RangeError("character name must be a non-empty string");
}

function assertCharacterId(id: string): void {
  if (typeof id !== "string" || id.trim() === "") throw new RangeError("character id must be a non-empty string");
}

function assertCharacterProgress(progress: CharacterProgress): void {
  // gainExperience/spendAttributePoint validate all progress invariants, but
  // this call also validates progress passed to createCharacter.
  gainExperience(progress, 0);
}

function cloneProgress(progress: CharacterProgress): CharacterProgress {
  return { ...progress, attributes: { ...progress.attributes } };
}

function cloneCharacter(character: Character): Character {
  return { ...character, progress: cloneProgress(character.progress) };
}

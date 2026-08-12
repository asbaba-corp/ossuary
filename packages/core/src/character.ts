import {
  createCharacterProgress,
  gainExperience,
  type CharacterProgress,
} from "./progression/xp.js";

export interface Character {
  readonly id: string;
  readonly name: string;
  readonly progress: CharacterProgress;
}

export function createCharacter(
  id: string,
  name: string,
  progress: CharacterProgress = createCharacterProgress(),
): Character {
  assertCharacterIdentity(id, name);
  assertCharacterProgress(progress);
  return { id, name, progress: cloneCharacterProgress(progress) };
}

export function cloneCharacter(character: Character): Character {
  assertCharacter(character);
  return { ...character, progress: cloneCharacterProgress(character.progress) };
}

export function assertCharacter(character: Character): void {
  if (!character || typeof character !== "object") throw new RangeError("character must be an object");
  assertCharacterIdentity(character.id, character.name);
  assertCharacterProgress(character.progress);
}

function assertCharacterProgress(progress: CharacterProgress): void {
  gainExperience(progress, 0);
}

function assertCharacterIdentity(id: string, name: string): void {
  if (typeof id !== "string" || id.trim() === "") throw new RangeError("character id must be a non-empty string");
  if (typeof name !== "string" || name.trim() === "") throw new RangeError("character name must be a non-empty string");
}

function cloneCharacterProgress(progress: CharacterProgress): CharacterProgress {
  return { ...progress, attributes: { ...progress.attributes } };
}

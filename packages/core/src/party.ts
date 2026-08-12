import {
  gainExperience,
  spendAttributePoint,
  type CharacterAttributes,
  type ExperienceResult,
  type PrimaryAttribute,
} from "./progression/xp.js";
import {
  assertCharacter,
  createCharacter,
  type Character,
} from "./character.js";
import type { CharacterLoadout } from "./equipment/legacy.js";
import { createSpellLoadout, type SpellLoadout } from "./spell-loadout.js";

export { createCharacter } from "./character.js";
export type { Character } from "./character.js";

export const PARTY_MAX_SIZE = 4 as const;
export const DEFAULT_CHARACTER_ID = "character-1" as const;
export const DEFAULT_CHARACTER_NAME = "Sem-Nome" as const;

/** A persisted party is only the ordered selection of roster identities. */
export interface Party {
  readonly characterIds: readonly string[];
}

export interface PartyExperienceResult {
  readonly party: Party;
  readonly roster: RosterState;
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

export interface RosterState {
  readonly characters: readonly Character[];
  readonly equipmentLoadouts: Readonly<Record<string, CharacterLoadout>>;
  readonly spellLoadouts: Readonly<Record<string, SpellLoadout>>;
}

export interface CharacterBuild {
  readonly character: Character;
  readonly equipment: CharacterLoadout;
  readonly spells: SpellLoadout;
}

export function createRoster(
  character: Character = createCharacter(DEFAULT_CHARACTER_ID, DEFAULT_CHARACTER_NAME),
  equipment: Readonly<Record<string, CharacterLoadout>> = { [character.id]: createDefaultCharacterLoadout(character.id) },
  spells: Readonly<Record<string, SpellLoadout>> = { [character.id]: createSpellLoadout(2) },
): RosterState {
  assertCharacter(character);
  return {
    characters: [cloneCharacter(character)],
    equipmentLoadouts: { ...equipment },
    spellLoadouts: { ...spells },
  };
}

export function createParty(characterId: string = DEFAULT_CHARACTER_ID): Party {
  assertCharacterId(characterId);
  return { characterIds: [characterId] };
}

export function createCharacterBuild(roster: RosterState, characterId: string): CharacterBuild {
  assertRoster(roster);
  assertCharacterId(characterId);
  const character = roster.characters.find((candidate) => candidate.id === characterId);
  if (!character) throw new RangeError(`character not found in roster: ${characterId}`);
  const equipment = roster.equipmentLoadouts[characterId];
  const spells = roster.spellLoadouts[characterId];
  if (!equipment) throw new RangeError(`equipment loadout not found: ${characterId}`);
  if (!spells) throw new RangeError(`spell loadout not found: ${characterId}`);
  return { character: cloneCharacter(character), equipment, spells };
}

export function resolvePartyBuilds(roster: RosterState, party: Party): readonly CharacterBuild[] {
  assertRoster(roster);
  assertParty(party);
  return party.characterIds.map((characterId) => createCharacterBuild(roster, characterId));
}

export function addCharacter(roster: RosterState, party: Party, character: Character, equipment: CharacterLoadout = createDefaultCharacterLoadout(character.id), spells: SpellLoadout = createSpellLoadout(2)): { readonly roster: RosterState; readonly party: Party } {
  assertRoster(roster);
  assertParty(party);
  assertCharacter(character);
  if (roster.characters.some((existing) => existing.id === character.id)) {
    throw new RangeError(`roster already contains character: ${character.id}`);
  }
  if (party.characterIds.length >= PARTY_MAX_SIZE) {
    throw new RangeError(`party cannot contain more than ${PARTY_MAX_SIZE} characters`);
  }
  if (equipment.characterId !== character.id) throw new RangeError(`equipment loadout belongs to another character: ${character.id}`);
  const nextRoster: RosterState = {
    characters: [...roster.characters.map(cloneCharacter), cloneCharacter(character)],
    equipmentLoadouts: { ...roster.equipmentLoadouts, [character.id]: equipment },
    spellLoadouts: { ...roster.spellLoadouts, [character.id]: spells },
  };
  return { roster: nextRoster, party: { characterIds: [...party.characterIds, character.id] } };
}

export function removeCharacter(party: Party, characterId: string): Party {
  assertParty(party);
  assertCharacterId(characterId);
  if (!party.characterIds.includes(characterId)) throw new RangeError(`character is not in party: ${characterId}`);
  if (party.characterIds.length === 1) throw new RangeError("party must contain at least one character");
  return { characterIds: party.characterIds.filter((id) => id !== characterId) };
}

export function reorderCharacters(party: Party, orderedCharacterIds: readonly string[]): Party {
  assertParty(party);
  if (orderedCharacterIds.length !== party.characterIds.length) throw new RangeError("reordered party must contain exactly the current characters");
  const current = new Set(party.characterIds);
  const next = new Set<string>();
  for (const id of orderedCharacterIds) {
    assertCharacterId(id);
    if (!current.has(id) || next.has(id)) throw new RangeError(`reordered party contains invalid character: ${id}`);
    next.add(id);
  }
  return { characterIds: [...orderedCharacterIds] };
}

export function moveCharacter(party: Party, characterId: string, targetIndex: number): Party {
  assertParty(party);
  assertCharacterId(characterId);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= party.characterIds.length) throw new RangeError("targetIndex must be a valid party position");
  const ids = party.characterIds.filter((id) => id !== characterId);
  if (ids.length === party.characterIds.length) throw new RangeError(`character is not in party: ${characterId}`);
  ids.splice(targetIndex, 0, characterId);
  return reorderCharacters(party, ids);
}

export function gainPartyExperience(roster: RosterState, party: Party, amount: number): PartyExperienceResult {
  assertRoster(roster);
  assertParty(party);
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError("experience amount must be non-negative");
  const levelsGainedByCharacter: Record<string, number> = {};
  const active = new Set(party.characterIds);
  const characters = roster.characters.map((character) => {
    if (!active.has(character.id)) return cloneCharacter(character);
    const result: ExperienceResult = gainExperience(character.progress, amount);
    levelsGainedByCharacter[character.id] = result.levelsGained;
    return { ...character, progress: result.progress };
  });
  return { roster: { ...roster, characters }, party, xpGained: amount, levelsGainedByCharacter };
}

export function allocatePartyAttributePoint(roster: RosterState, party: Party, characterId: string, attribute: PrimaryAttribute): RosterState {
  assertRoster(roster);
  resolvePartyBuilds(roster, party);
  const character = roster.characters.find((candidate) => candidate.id === characterId);
  if (!character) throw new RangeError(`character is not in roster: ${characterId}`);
  const updated = { ...character, progress: spendAttributePoint(character.progress, attribute) };
  return { ...roster, characters: roster.characters.map((current) => current.id === characterId ? updated : cloneCharacter(current)) };
}

export function getPartySummary(roster: RosterState, party: Party): PartySummary {
  assertRoster(roster);
  const builds = resolvePartyBuilds(roster, party);
  const aggregateAttributes = { cons: 0, str: 0, dex: 0, int: 0 };
  const unspentAttributePointsByCharacter: Record<string, number> = {};
  let totalPartyLevel = 0;
  for (const { character } of builds) {
    totalPartyLevel += character.progress.level;
    aggregateAttributes.cons += character.progress.attributes.cons;
    aggregateAttributes.str += character.progress.attributes.str;
    aggregateAttributes.dex += character.progress.attributes.dex;
    aggregateAttributes.int += character.progress.attributes.int;
    unspentAttributePointsByCharacter[character.id] = character.progress.unspentAttributePoints;
  }
  return { characterCount: builds.length, totalPartyLevel, aggregateAttributes, unspentAttributePointsByCharacter, partyPower: totalPartyLevel };
}

export const summarizeParty = getPartySummary;

function assertRoster(roster: RosterState): void {
  if (!roster || !Array.isArray(roster.characters)) throw new RangeError("roster.characters must be an array");
  const ids = new Set<string>();
  for (const character of roster.characters) {
    assertCharacter(character);
    if (ids.has(character.id)) throw new RangeError(`roster contains duplicate character: ${character.id}`);
    ids.add(character.id);
    if (!roster.equipmentLoadouts[character.id]) throw new RangeError(`equipment loadout not found: ${character.id}`);
    if (!roster.spellLoadouts[character.id]) throw new RangeError(`spell loadout not found: ${character.id}`);
  }
  for (const id of Object.keys(roster.equipmentLoadouts)) if (!ids.has(id)) throw new RangeError(`equipment loadout references unknown character: ${id}`);
  for (const id of Object.keys(roster.spellLoadouts)) if (!ids.has(id)) throw new RangeError(`spell loadout references unknown character: ${id}`);
}

function assertParty(party: Party): void {
  if (!party || !Array.isArray(party.characterIds)) throw new RangeError("party.characterIds must be an array");
  if (party.characterIds.length < 1 || party.characterIds.length > PARTY_MAX_SIZE) throw new RangeError(`party must contain between 1 and ${PARTY_MAX_SIZE} characters`);
  const ids = new Set<string>();
  for (const id of party.characterIds) {
    assertCharacterId(id);
    if (ids.has(id)) throw new RangeError(`party contains duplicate character: ${id}`);
    ids.add(id);
  }
}

function assertCharacterId(id: string): void {
  if (typeof id !== "string" || id.trim() === "") throw new RangeError("character id must be a non-empty string");
}

function createDefaultCharacterLoadout(characterId: string): CharacterLoadout {
  return {
    characterId,
    equipped: {
      weapon: null,
      helmet: null,
      chest: null,
      gloves: null,
      boots: null,
      shield: null,
    },
  };
}

function cloneCharacter(character: Character): Character {
  return { ...character, progress: { ...character.progress, attributes: { ...character.progress.attributes } } };
}

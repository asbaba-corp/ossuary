import { useRef, useState } from 'react';
import type {
  CharacterAttributes,
  CharacterLoadout,
  EffectiveCharacterStats,
  EquipmentReplacementPreview,
  Equipment,
  EquipmentSlot,
  Inventory,
  InventorySummary,
  Item,
  ItemEffectState,
  ItemStack,
  Party,
  PartySummary,
  PrimaryAttribute,
  SpellAutoCastEvent,
  SpellRuntimeState,
  SpellLoadout,
} from '@ossuary/core';
import {
  addCharacter,
  addItem,
  allocatePartyAttributePoint,
  createCharacter,
  createCharacterLoadout,
  createInventory,
  createItemEffectState,
  createItemStack,
  createParty,
  findItemStack,
  gainPartyExperience,
  getEffectiveCharacterAttributes,
  getPartySummary,
  getInventorySummary,
  removeItem,
  removeItemEffect,
  useItem,
  advanceSpellCooldown,
  advanceSpellRuntime,
  createSpellRuntimeState,
  resolveAutoCastOpportunity,
  resolveSpellAttempt,
  createSpellLoadout,
  equipSpell,
  getEnabledSpellDefinitions,
  moveSpellPriority,
  setSpellEnabled,
  unequipSpell,
  xpToNextLevel,
} from '@ossuary/core';
import { TEST_CONSUMABLE, TEST_CONSUMABLE_STACK, TEST_EQUIPMENT, TEST_SPELLS } from './lab-fixtures';
import { equipFromInventory, getCharacterEquipmentStats, getReplacementPreview, rollTestDrop, unequipToInventory } from './lab-equipment-commands';

const MONSTER_XP = 15;
const MIN_TEST_XP = 0;
const MAX_TEST_XP = 500;

export interface MechanicsLabViewModel {
  readonly party: Party;
  readonly loadouts: readonly CharacterLoadout[];
  readonly summary: PartySummary;
  readonly selectedCharacterId: string;
  readonly selectedCharacter: Party['characters'][number];
  readonly selectedLoadout: CharacterLoadout;
  readonly effectiveAttributes: CharacterAttributes;
  readonly effectiveStats: EffectiveCharacterStats;
  readonly replacementPreview: EquipmentReplacementPreview | null;
  readonly testEquipment: readonly Equipment[];
  readonly testConsumable: ItemStack;
  readonly inventory: Inventory;
  readonly inventorySummary: InventorySummary;
  readonly inventoryCandidates: readonly Item[];
  readonly activeItemEffects: ItemEffectState;
  readonly canRemoveTestConsumable: boolean;
  readonly nextLevelXp: number;
  readonly xpPercent: number;
  readonly selectedXp: number;
  readonly lastEvent: string;
  readonly canApplySelectedXp: boolean;
  readonly setSelectedXp: (amount: number) => void;
  readonly defeatIgnavo: () => void;
  readonly applySelectedXp: () => void;
  readonly allocate: (attribute: PrimaryAttribute) => void;
  readonly selectCharacter: (id: string) => void;
  readonly recruitCharacter: () => void;
  readonly equipTestEquipment: (instanceId: string) => void;
  readonly unequipSlot: (slot: EquipmentSlot) => void;
  readonly useTestConsumable: () => void;
  readonly removeTestConsumable: () => void;
  readonly addTestItem: (itemId: string) => void;
  readonly removeTestItem: (itemId: string) => void;
  readonly generateTestDrop: () => void;
  readonly dropChancePercent: number;
  readonly setDropChancePercent: (amount: number) => void;
  readonly testSpells: readonly typeof TEST_SPELLS[number][];
  readonly selectedSpellId: string;
  readonly selectedSpell: typeof TEST_SPELLS[number];
  readonly selectedSpellLoadout: SpellLoadout;
  readonly enabledSpells: readonly typeof TEST_SPELLS[number][];
  readonly spellConfigEvent: string;
  readonly spellHpPercent: number;
  readonly spellMana: number;
  readonly spellEnemyCount: number;
  readonly spellCooldownRemaining: number;
  readonly spellEvent: string;
  readonly spellAttempt: ReturnType<typeof resolveSpellAttempt> | null;
  readonly autoCastEvents: readonly SpellAutoCastEvent[];
  readonly selectSpell: (id: string) => void;
  readonly setSpellHpPercent: (amount: number) => void;
  readonly setSpellMana: (amount: number) => void;
  readonly setSpellEnemyCount: (amount: number) => void;
  readonly attemptSpell: () => void;
  readonly advanceSpellTime: () => void;
  readonly evaluateAutoCast: () => void;
  readonly equipSpell: (spellId: string) => void;
  readonly unequipSpell: (spellId: string) => void;
  readonly setSpellEnabled: (spellId: string, enabled: boolean) => void;
  readonly moveSpellPriority: (spellId: string, direction: 'up' | 'down') => void;
  readonly reset: () => void;
}

/**
 * ViewModel do laboratório.
 *
 * Ele adapta o Functional Core para a tela: mantém o estado local do preview,
 * calcula valores derivados e expõe comandos nomeados. A View não conhece
 * `useState` nem chama regras do core diretamente.
 */
export function useMechanicsLabViewModel(): MechanicsLabViewModel {
  const [party, setParty] = useState<Party>(() => createParty());
  const [loadouts, setLoadouts] = useState<readonly CharacterLoadout[]>(() => [
    createCharacterLoadout('character-1'),
  ]);
  const [spellLoadouts, setSpellLoadouts] = useState<readonly { characterId: string; loadout: SpellLoadout }[]>(() => [
    { characterId: 'character-1', loadout: createSpellLoadout(2) },
  ]);
  const [testConsumable, setTestConsumable] = useState<ItemStack>(() =>
    TEST_CONSUMABLE_STACK,
  );
  const [inventory, setInventory] = useState<Inventory>(() => createInventory(4));
  const [activeItemEffects, setActiveItemEffects] = useState<ItemEffectState>(() =>
    createItemEffectState(),
  );
  const [selectedCharacterId, setSelectedCharacterId] = useState('character-1');
  const [selectedXp, setSelectedXpState] = useState(MONSTER_XP);
  const [lastEvent, setLastEvent] = useState('Nenhum evento ainda.');
  const [dropChancePercent, setDropChancePercentState] = useState(75);
  const [selectedSpellId, setSelectedSpellId] = useState(TEST_SPELLS[0].id);
  const [spellHpPercent, setSpellHpPercentState] = useState(35);
  const [spellMana, setSpellManaState] = useState(50);
  const [spellEnemyCount, setSpellEnemyCountState] = useState(3);
  const [spellCooldownRemaining, setSpellCooldownRemaining] = useState(0);
  const [spellEvent, setSpellEvent] = useState('Nenhuma tentativa de spell.');
  const [spellConfigEvent, setSpellConfigEvent] = useState('Nenhuma configuração alterada.');
  const [spellAttempt, setSpellAttempt] = useState<ReturnType<typeof resolveSpellAttempt> | null>(null);
  const [spellRuntime, setSpellRuntime] = useState<SpellRuntimeState>(() => createSpellRuntimeState(100, 50));
  const [autoCastEvents, setAutoCastEvents] = useState<readonly SpellAutoCastEvent[]>([]);
  const dropRoll = useRef(0);

  const selectedCharacter = party.characters.find(({ id }) => id === selectedCharacterId) ?? party.characters[0];
  const selectedLoadout = loadouts.find(({ characterId }) => characterId === selectedCharacter.id) ?? createCharacterLoadout(selectedCharacter.id);
  const effectiveAttributes = getEffectiveCharacterAttributes(
    selectedCharacter,
    selectedLoadout,
    activeItemEffects,
  );
  const effectiveStats = getCharacterEquipmentStats(selectedCharacter, selectedLoadout, activeItemEffects);
  const replacementPreview = inventory.items
    .map(({ item }) => item)
    .find((item): item is Equipment => item.kind === 'equipment' && item.slot === 'weapon')
      ? getReplacementPreview(
        selectedCharacter,
        selectedLoadout,
        inventory.items.map(({ item }) => item).find((item): item is Equipment => item.kind === 'equipment' && item.slot === 'weapon')!,
        activeItemEffects,
      )
    : null;
  const summary = getPartySummary(party);
  const inventorySummary = getInventorySummary(inventory);
  const nextLevelXp = xpToNextLevel(selectedCharacter.progress.level);
  const xpPercent = Math.min(100, (selectedCharacter.progress.xp / nextLevelXp) * 100);
  const selectedSpell = TEST_SPELLS.find(({ id }) => id === selectedSpellId) ?? TEST_SPELLS[0];
  const availableSpellIds = TEST_SPELLS.map(({ id }) => id);
  const selectedSpellLoadout = spellLoadouts.find(({ characterId }) => characterId === selectedCharacter.id)?.loadout
    ?? createSpellLoadout(2);
  const enabledSpells = getEnabledSpellDefinitions(selectedSpellLoadout, TEST_SPELLS);

  function applyExperience(amount: number, source: string) {
    const result = gainPartyExperience(party, amount);
    setParty(result.party);
    const levelsGained = result.levelsGainedByCharacter[selectedCharacterId];
    setLastEvent(
      levelsGained > 0
        ? `${source} · party ganhou XP; personagem selecionado subiu ${levelsGained} nível(is)`
        : `${source} · +${amount} XP`,
    );
  }

  function setSelectedXp(amount: number) {
    setSelectedXpState(Math.max(MIN_TEST_XP, Math.min(MAX_TEST_XP, amount)));
  }

  function defeatIgnavo() {
    applyExperience(MONSTER_XP, 'Ignavo derrotado');
  }

  function applySelectedXp() {
    if (selectedXp > 0) {
      applyExperience(selectedXp, 'Recompensa de teste');
    }
  }

  function allocate(attribute: PrimaryAttribute) {
    if (selectedCharacter.progress.unspentAttributePoints === 0) return;
    setParty(allocatePartyAttributePoint(party, selectedCharacterId, attribute));
    setLastEvent(`Ponto distribuído · ${attribute.toUpperCase()} +1`);
  }

  function selectCharacter(id: string) {
    if (party.characters.some((character) => character.id === id)) setSelectedCharacterId(id);
  }

  function recruitCharacter() {
    const id = `character-${party.characters.length + 1}`;
    setParty(addCharacter(party, createCharacter(id, `Personagem ${party.characters.length + 1}`)));
    setLoadouts((current) => [...current, createCharacterLoadout(id)]);
    setSpellLoadouts((current) => [...current, { characterId: id, loadout: createSpellLoadout(2) }]);
    setSelectedCharacterId(id);
    setLastEvent('Novo personagem recrutado no nível 1.');
  }

  function equipTestEquipment(instanceId: string) {
    try {
      const equipment = TEST_EQUIPMENT.find((candidate) => candidate.instanceId === instanceId);
      if (!equipment) throw new RangeError(`equipment fixture not found: ${instanceId}`);
      const inventoryWithCandidate = findItemStack(inventory, instanceId)
        ? inventory
        : addItem(inventory, createItemStack(equipment, 1));
      const result = equipFromInventory(inventoryWithCandidate, selectedLoadout, instanceId);
      setInventory(result.inventory);
      setLoadouts((current) => current.map((loadout) => loadout.characterId === selectedCharacter.id ? result.loadout : loadout));
      setLastEvent(`${result.loadout.equipped[result.loadout.equipped[candidateSlot(result.loadout, instanceId)]?.slot ?? 'weapon']?.name ?? 'Equipamento'} equipado em ${selectedCharacter.name}.`);
    } catch (error) {
      setLastEvent(error instanceof Error ? error.message : 'Não foi possível equipar o equipamento.');
    }
  }

  function unequipSlot(slot: EquipmentSlot) {
    try {
      const result = unequipToInventory(inventory, selectedLoadout, slot);
      setInventory(result.inventory);
      setLoadouts((current) => current.map((loadout) => loadout.characterId === selectedCharacter.id ? result.loadout : loadout));
      setLastEvent(`Slot ${slot} liberado em ${selectedCharacter.name}.`);
    } catch (error) {
      setLastEvent(error instanceof Error ? error.message : 'Não foi possível desequipar.');
    }
  }

  function useTestConsumable() {
    const result = useItem(testConsumable, selectedCharacter.id, activeItemEffects);
    setTestConsumable(result.itemStack);
    setActiveItemEffects(result.effectState);
    setLastEvent(`${TEST_CONSUMABLE.name} ativado em ${selectedCharacter.name}.`);
  }

  function removeTestConsumable() {
    setActiveItemEffects(
      removeItemEffect(activeItemEffects, TEST_CONSUMABLE.id, selectedCharacter.id),
    );
    setLastEvent(`${TEST_CONSUMABLE.name} removido de ${selectedCharacter.name}.`);
  }

  function addTestItem(itemId: string) {
    const item = [...TEST_EQUIPMENT, TEST_CONSUMABLE].find((candidate) =>
      candidate.kind === 'equipment'
        ? candidate.instanceId === itemId
        : candidate.id === itemId,
    );
    if (!item) return;
    try {
      const nextInventory = addItem(inventory, createItemStack(item, 1));
      setInventory(nextInventory);
      setLastEvent(`${item.name} adicionado ao inventário.`);
    } catch (error) {
      setLastEvent(error instanceof Error ? error.message : 'Não foi possível adicionar o item.');
    }
  }

  function removeTestItem(itemId: string) {
    try {
      const nextInventory = removeItem(inventory, itemId);
      setInventory(nextInventory);
      setLastEvent('Item removido do inventário.');
    } catch (error) {
      setLastEvent(error instanceof Error ? error.message : 'Não foi possível remover o item.');
    }
  }

  function generateTestDrop() {
    dropRoll.current += 1;
    const commonWeight = dropChancePercent;
    const rareWeight = 100 - dropChancePercent;
    const drop = rollTestDrop(`lab-drop-${dropRoll.current}`, `lab-seed-${dropRoll.current}`, commonWeight, rareWeight);
    try {
      setInventory(addItem(inventory, createItemStack(drop, 1)));
      setLastEvent(`${drop.name} (${drop.rarity}) gerado deterministicamente e adicionado.`);
    } catch (error) {
      setLastEvent(error instanceof Error ? error.message : 'Não foi possível adicionar o drop.');
    }
  }

  function setDropChancePercent(amount: number) {
    setDropChancePercentState(Math.max(0, Math.min(100, Math.round(amount))));
  }

  function selectSpell(id: string) {
    if (TEST_SPELLS.some((spell) => spell.id === id)) {
      setSelectedSpellId(id);
      setSpellCooldownRemaining(0);
      setSpellAttempt(null);
      setSpellRuntime((current) => ({
        ...current,
        cooldowns: { ...current.cooldowns, [id]: 0 },
      }));
      setSpellEvent('Spell selecionada; cooldown liberado para o teste.');
    }
  }

  function updateSelectedSpellLoadout(update: (loadout: SpellLoadout) => SpellLoadout, event: string) {
    setSpellLoadouts((current) => current.map((entry) => entry.characterId === selectedCharacter.id
      ? { ...entry, loadout: update(entry.loadout) }
      : entry));
    setSpellConfigEvent(event);
  }

  function equipSpellCommand(spellId: string) {
    try {
      updateSelectedSpellLoadout(
        (loadout) => equipSpell(loadout, availableSpellIds, spellId),
        `${TEST_SPELLS.find((spell) => spell.id === spellId)?.name ?? spellId} equipada.`,
      );
    } catch (error) {
      setSpellConfigEvent(error instanceof Error ? error.message : 'Não foi possível equipar a spell.');
    }
  }

  function unequipSpellCommand(spellId: string) {
    try {
      updateSelectedSpellLoadout(
        (loadout) => unequipSpell(loadout, spellId),
        `${TEST_SPELLS.find((spell) => spell.id === spellId)?.name ?? spellId} removida.`,
      );
    } catch (error) {
      setSpellConfigEvent(error instanceof Error ? error.message : 'Não foi possível remover a spell.');
    }
  }

  function setSpellEnabledCommand(spellId: string, enabled: boolean) {
    try {
      updateSelectedSpellLoadout(
        (loadout) => setSpellEnabled(loadout, spellId, enabled),
        `${TEST_SPELLS.find((spell) => spell.id === spellId)?.name ?? spellId} ${enabled ? 'ativada' : 'desativada'}.`,
      );
    } catch (error) {
      setSpellConfigEvent(error instanceof Error ? error.message : 'Não foi possível alterar a spell.');
    }
  }

  function moveSpellPriorityCommand(spellId: string, direction: 'up' | 'down') {
    try {
      updateSelectedSpellLoadout(
        (loadout) => moveSpellPriority(loadout, spellId, direction),
        'Prioridade do auto-cast atualizada.',
      );
    } catch (error) {
      setSpellConfigEvent(error instanceof Error ? error.message : 'Não foi possível alterar a prioridade.');
    }
  }

  function setSpellHpPercent(amount: number) {
    setSpellHpPercentState(Math.max(0, Math.min(100, Math.round(amount))));
  }

  function setSpellMana(amount: number) {
    const nextMana = Math.max(0, Math.min(100, Math.round(amount)));
    setSpellManaState(nextMana);
    setSpellRuntime((current) => ({ ...current, mana: nextMana }));
  }

  function setSpellEnemyCount(amount: number) {
    setSpellEnemyCountState(Math.max(0, Math.min(10, Math.round(amount))));
  }

  function attemptSpell() {
    const result = resolveSpellAttempt(selectedSpell, {
      hpPercent: spellHpPercent,
      manaPercent: spellMana,
      mana: spellMana,
      enemyCount: spellEnemyCount,
      int: effectiveAttributes.int,
      spellDamagePercent: effectiveStats.spellDamagePercent,
      cooldownRemaining: spellCooldownRemaining,
      seed: 'spell-lab-seed',
    });
    setSpellAttempt(result);
    setSpellManaState(result.manaAfter);
    setSpellCooldownRemaining(result.cooldownAfter);
    setSpellRuntime((current) => ({
      ...current,
      mana: result.manaAfter,
      cooldowns: { ...current.cooldowns, [selectedSpell.id]: result.cooldownAfter },
    }));
    setSpellEvent(`${selectedSpell.name} · ${result.reason}${result.controlChanceSucceeded === false ? ' · chance falhou' : ''}`);
  }

  function advanceSpellTime() {
    setSpellCooldownRemaining((current) => advanceSpellCooldown(current, 1));
    setSpellRuntime((current) => advanceSpellRuntime(current, 1));
    setSpellEvent('Tempo de teste avançou 1s; nenhum efeito de combate foi aplicado.');
  }

  function evaluateAutoCast() {
    try {
      const result = resolveAutoCastOpportunity(selectedSpellLoadout, TEST_SPELLS, spellRuntime, {
        hpPercent: spellHpPercent,
        enemyCount: spellEnemyCount,
        int: effectiveAttributes.int,
        spellDamagePercent: effectiveStats.spellDamagePercent,
        seed: 'spell-lab-seed',
      });
      setSpellRuntime(result.runtime);
      setSpellManaState(result.runtime.mana);
      setAutoCastEvents(result.events);
      setSpellEvent(result.events.length === 0
        ? 'Nenhuma spell equipada para avaliar.'
        : result.events.map(({ spellId, result: attempt }) => `${spellId} · ${attempt.reason}`).join(' → '));
    } catch (error) {
      setAutoCastEvents([]);
      setSpellEvent(error instanceof Error ? error.message : 'Não foi possível avaliar o auto-cast.');
    }
  }

  function reset() {
    setParty(createParty());
    setLoadouts([createCharacterLoadout('character-1')]);
    setSpellLoadouts([{ characterId: 'character-1', loadout: createSpellLoadout(2) }]);
    setTestConsumable(TEST_CONSUMABLE_STACK);
    setInventory(createInventory(4));
    setActiveItemEffects(createItemEffectState());
    setSelectedCharacterId('character-1');
    setSelectedXpState(MONSTER_XP);
    setSelectedSpellId(TEST_SPELLS[0].id);
    setSpellHpPercentState(35);
    setSpellManaState(50);
    setSpellEnemyCountState(3);
    setSpellCooldownRemaining(0);
    setSpellEvent('Nenhuma tentativa de spell.');
    setSpellConfigEvent('Nenhuma configuração alterada.');
    setSpellAttempt(null);
    setSpellRuntime(createSpellRuntimeState(100, 50));
    setAutoCastEvents([]);
    setLastEvent('Laboratório reiniciado.');
  }

  return {
    party,
    loadouts,
    summary,
    selectedCharacterId,
    selectedCharacter,
    selectedLoadout,
    effectiveAttributes,
    effectiveStats,
    replacementPreview,
    testEquipment: TEST_EQUIPMENT,
    testConsumable,
    inventory,
    inventorySummary,
    inventoryCandidates: [...TEST_EQUIPMENT, TEST_CONSUMABLE],
    activeItemEffects,
    canRemoveTestConsumable: activeItemEffects.activeEffects.some(
      (active) => active.itemId === TEST_CONSUMABLE.id && active.targetCharacterId === selectedCharacter.id,
    ),
    nextLevelXp,
    xpPercent,
    selectedXp,
    lastEvent,
    canApplySelectedXp: selectedXp > 0,
    setSelectedXp,
    defeatIgnavo,
    applySelectedXp,
    allocate,
    selectCharacter,
    recruitCharacter,
    equipTestEquipment,
    unequipSlot,
    useTestConsumable,
    removeTestConsumable,
    addTestItem,
    removeTestItem,
    generateTestDrop,
    dropChancePercent,
    setDropChancePercent,
    testSpells: TEST_SPELLS,
    selectedSpellId,
    selectedSpell,
    selectedSpellLoadout,
    enabledSpells,
    spellConfigEvent,
    spellHpPercent,
    spellMana,
    spellEnemyCount,
    spellCooldownRemaining,
    spellEvent,
    spellAttempt,
    autoCastEvents,
    selectSpell,
    setSpellHpPercent,
    setSpellMana,
    setSpellEnemyCount,
    attemptSpell,
    advanceSpellTime,
    evaluateAutoCast,
    equipSpell: equipSpellCommand,
    unequipSpell: unequipSpellCommand,
    setSpellEnabled: setSpellEnabledCommand,
    moveSpellPriority: moveSpellPriorityCommand,
    reset,
  };
}

function candidateSlot(loadout: CharacterLoadout, instanceId: string): EquipmentSlot {
  return (Object.values(loadout.equipped).find((item) => item?.instanceId === instanceId)?.slot ?? 'weapon') as EquipmentSlot;
}

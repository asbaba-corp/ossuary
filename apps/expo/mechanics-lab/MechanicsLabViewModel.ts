import { useRef, useState } from 'react';
import type {
  CharacterAttributes,
  CharacterLoadout,
  EffectiveCharacterStats,
  EquipmentReplacementPreview,
  Equipment,
  EquipmentDropEntry,
  EquipmentSlot,
  Inventory,
  InventorySummary,
  Item,
  ItemEffectState,
  ItemStack,
  Party,
  PartySummary,
  PrimaryAttribute,
} from '@ossuary/core';
import {
  addCharacter,
  addItem,
  allocatePartyAttributePoint,
  createCharacter,
  createCharacterLoadout,
  createAttributeBonusEffect,
  createConsumable,
  createEquipment,
  createInventory,
  createItemEffectState,
  createItemStack,
  createParty,
  equipEquipmentFromInventory,
  gainPartyExperience,
  getEffectiveCharacterAttributes,
  getEffectiveCharacterStats,
  getPartySummary,
  getInventorySummary,
  removeItem,
  removeItemEffect,
  previewEquipmentReplacement,
  createEquipmentFromDropTable,
  unequipEquipmentToInventory,
  useItem,
  xpToNextLevel,
} from '@ossuary/core';

const MONSTER_XP = 15;
const MIN_TEST_XP = 0;
const MAX_TEST_XP = 500;

const TEST_EQUIPMENT: readonly Equipment[] = [
  createEquipment('test-iron-sword', 'Espada de ferro', 'weapon', { str: 2 }, { rarity: 'common', instanceId: 'test-sword-a', stats: { baseDamage: 8 } }),
  createEquipment('test-bone-shield', 'Escudo de osso', 'shield', { cons: 2 }, { rarity: 'rare' }),
  createEquipment('test-leather-boots', 'Botas de couro', 'boots', { dex: 1 }, { rarity: 'epic' }),
];

const TEST_CONSUMABLE = createConsumable(
  'test-strength-tonic',
  'Tônico de força',
  [createAttributeBonusEffect('test-strength-effect', { str: 1 })],
  { rarity: 'rare' },
);

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
  const [testConsumable, setTestConsumable] = useState<ItemStack>(() =>
    createItemStack(TEST_CONSUMABLE, 2),
  );
  const [inventory, setInventory] = useState<Inventory>(() => createInventory(4));
  const [activeItemEffects, setActiveItemEffects] = useState<ItemEffectState>(() =>
    createItemEffectState(),
  );
  const [selectedCharacterId, setSelectedCharacterId] = useState('character-1');
  const [selectedXp, setSelectedXpState] = useState(MONSTER_XP);
  const [lastEvent, setLastEvent] = useState('Nenhum evento ainda.');
  const [dropChancePercent, setDropChancePercentState] = useState(75);
  const dropRoll = useRef(0);

  const selectedCharacter = party.characters.find(({ id }) => id === selectedCharacterId) ?? party.characters[0];
  const selectedLoadout = loadouts.find(({ characterId }) => characterId === selectedCharacter.id) ?? createCharacterLoadout(selectedCharacter.id);
  const effectiveAttributes = getEffectiveCharacterAttributes(
    selectedCharacter,
    selectedLoadout,
    activeItemEffects,
  );
  const effectiveStats = getEffectiveCharacterStats(selectedCharacter, selectedLoadout, activeItemEffects);
  const replacementPreview = inventory.items
    .map(({ item }) => item)
    .find((item): item is Equipment => item.kind === 'equipment' && item.slot === 'weapon')
    ? previewEquipmentReplacement(
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
    setSelectedCharacterId(id);
    setLastEvent('Novo personagem recrutado no nível 1.');
  }

  function equipTestEquipment(instanceId: string) {
    try {
      const result = equipEquipmentFromInventory(inventory, selectedLoadout, instanceId);
      setInventory(result.inventory);
      setLoadouts((current) => current.map((loadout) => loadout.characterId === selectedCharacter.id ? result.loadout : loadout));
      setLastEvent(`${result.loadout.equipped[result.loadout.equipped[candidateSlot(result.loadout, instanceId)]?.slot ?? 'weapon']?.name ?? 'Equipamento'} equipado em ${selectedCharacter.name}.`);
    } catch (error) {
      setLastEvent(error instanceof Error ? error.message : 'Não foi possível equipar o equipamento.');
    }
  }

  function unequipSlot(slot: EquipmentSlot) {
    try {
      const result = unequipEquipmentToInventory(inventory, selectedLoadout, slot);
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
    const item = [...TEST_EQUIPMENT, TEST_CONSUMABLE].find((candidate) => candidate.id === itemId);
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
    const entries: EquipmentDropEntry[] = [];
    if (commonWeight > 0) entries.push({ equipment: TEST_EQUIPMENT[0], rarity: 'common', weight: commonWeight, attributeRollPools: { str: [1, 2, 3] } });
    if (rareWeight > 0) entries.push({ equipment: TEST_EQUIPMENT[1], rarity: 'rare', weight: rareWeight, attributeRollPools: { cons: [2, 3, 4] } });
    const drop = createEquipmentFromDropTable(`lab-drop-${dropRoll.current}`, `lab-seed-${dropRoll.current}`, entries);
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

  function reset() {
    setParty(createParty());
    setLoadouts([createCharacterLoadout('character-1')]);
    setTestConsumable(createItemStack(TEST_CONSUMABLE, 2));
    setInventory(createInventory(4));
    setActiveItemEffects(createItemEffectState());
    setSelectedCharacterId('character-1');
    setSelectedXpState(MONSTER_XP);
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
    reset,
  };
}

function candidateSlot(loadout: CharacterLoadout, instanceId: string): EquipmentSlot {
  return (Object.values(loadout.equipped).find((item) => item?.instanceId === instanceId)?.slot ?? 'weapon') as EquipmentSlot;
}

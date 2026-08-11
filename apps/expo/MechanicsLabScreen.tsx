import {
  EQUIPMENT_SLOTS,
  PARTY_MAX_SIZE,
  type PrimaryAttribute,
} from '@ossuary/core';
import Slider from '@react-native-community/slider';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMechanicsLabViewModel } from './mechanics-lab/MechanicsLabViewModel';

const ATTRIBUTE_ROWS: readonly {
  readonly key: PrimaryAttribute;
  readonly label: string;
  readonly name: string;
}[] = [
  { key: 'cons', label: 'CONS', name: 'Constituição' },
  { key: 'str', label: 'STR', name: 'Força' },
  { key: 'dex', label: 'DEX', name: 'Destreza' },
  { key: 'int', label: 'INT', name: 'Inteligência' },
];

export function MechanicsLabScreen() {
  const {
    party,
    summary,
    selectedCharacterId,
    selectedCharacter,
    selectedLoadout,
    effectiveAttributes,
    effectiveStats,
    replacementPreview,
    testEquipment,
    testConsumable,
    canRemoveTestConsumable,
    inventory,
    inventorySummary,
    inventoryCandidates,
    nextLevelXp,
    xpPercent,
    selectedXp,
    lastEvent,
    canApplySelectedXp,
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
    testSpells,
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
    selectSpell,
    setSpellHpPercent,
    setSpellMana,
    setSpellEnemyCount,
    attemptSpell,
    advanceSpellTime,
    equipSpell,
    unequipSpell,
    setSpellEnabled,
    moveSpellPriority,
    reset,
  } = useMechanicsLabViewModel();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="mechanics-lab"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>OSSUARY · PREVIEW</Text>
          <Text style={styles.title}>Laboratório de mecânicas</Text>
        </View>
        <View style={styles.testBadge}>
          <Text style={styles.testBadgeText}>TESTE</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Área experimental</Text>
        <Text style={styles.noticeText}>
          Esta tela existe para validar XP, level-up e atributos. Ela não é a
          tela final do jogo e os controles abaixo não representam o combate.
        </Text>
      </View>

      <LabSection title="01 · Spells (teste isolado)">
        <Text style={styles.helper}>
          Este painel testa apenas a mecânica pura de auto-cast: gatilho, mana,
          cooldown, escala e seed. Não há combate, alvo ou aplicação de efeito.
        </Text>
        <View style={styles.spellStatusCard}>
          <Text style={styles.pointsTitle}>
            Configuração do personagem · {selectedSpellLoadout.entries.length}/{selectedSpellLoadout.maxSlots} slots
          </Text>
          <Text style={styles.muted}>
            As spells abaixo são fixtures disponíveis. A ordem define a prioridade do auto-cast.
          </Text>
          <Text style={styles.muted}>
            Ativas na prioridade: {enabledSpells.map((spell) => spell.name).join(' → ') || 'nenhuma'}
          </Text>
        </View>
        {testSpells.map((spell) => {
          const entryIndex = selectedSpellLoadout.entries.findIndex((entry) => entry.spellId === spell.id);
          const entry = selectedSpellLoadout.entries[entryIndex];
          return (
            <View key={`config-${spell.id}`} style={styles.spellConfigRow}>
              <View style={styles.equipmentIdentity}>
                <Text style={styles.equipmentName}>
                  {entryIndex >= 0 ? `${entryIndex + 1}. ` : ''}{spell.name}
                </Text>
                <Text style={styles.muted}>
                  {entry ? (entry.enabled ? 'auto-cast ativo' : 'auto-cast desligado') : 'fora do loadout'}
                </Text>
              </View>
              <View style={styles.spellConfigActions}>
                {entry ? (
                  <>
                    <LabButton label={entry.enabled ? 'Desativar' : 'Ativar'} onPress={() => setSpellEnabled(spell.id, !entry.enabled)} />
                    <LabButton label="↑" onPress={() => moveSpellPriority(spell.id, 'up')} />
                    <LabButton label="↓" onPress={() => moveSpellPriority(spell.id, 'down')} />
                    <LabButton label="Remover" onPress={() => unequipSpell(spell.id)} />
                  </>
                ) : (
                  <LabButton label="Equipar" onPress={() => equipSpell(spell.id)} />
                )}
              </View>
            </View>
          );
        })}
        <Text style={styles.event}>{spellConfigEvent}</Text>
        <View style={styles.roster}>
          {testSpells.map((spell) => (
            <Pressable
              key={spell.id}
              onPress={() => selectSpell(spell.id)}
              style={[styles.rosterButton, spell.id === selectedSpellId && styles.rosterSelected]}
            >
              <Text style={styles.rosterName}>{spell.name}</Text>
              <Text style={styles.muted}>{spell.archetype} · {spell.manaCost} mana · {spell.cooldown}s</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helper}>
          Gatilho: {selectedSpell.trigger.kind} · INT {effectiveAttributes.int} · dano de spell {effectiveStats.spellDamagePercent}%
        </Text>
        <Text style={styles.label}>CONTEXTO DO TESTE</Text>
        <View style={styles.spellContextRow}>
          <Text style={styles.muted}>HP {spellHpPercent}%</Text>
          {[20, 35, 80].map((value) => (
            <LabButton key={`hp-${value}`} label={`${value}%`} onPress={() => setSpellHpPercent(value)} />
          ))}
        </View>
        <View style={styles.spellContextRow}>
          <Text style={styles.muted}>Mana {spellMana}/100</Text>
          {[0, 20, 50, 100].map((value) => (
            <LabButton key={`mana-${value}`} label={`${value}`} onPress={() => setSpellMana(value)} />
          ))}
        </View>
        <View style={styles.spellContextRow}>
          <Text style={styles.muted}>Inimigos {spellEnemyCount}</Text>
          {[0, 3, 5].map((value) => (
            <LabButton key={`enemy-${value}`} label={`${value}`} onPress={() => setSpellEnemyCount(value)} />
          ))}
        </View>
        <View style={styles.spellStatusCard}>
          <Text style={styles.pointsTitle}>Cooldown restante: {spellCooldownRemaining}s</Text>
          <Text style={styles.muted}>Seed fixa: spell-lab-seed (repetições são reproduzíveis)</Text>
        </View>
        <View style={styles.spellActions}>
          <LabButton label="Avançar 1s" onPress={advanceSpellTime} />
          <LabButton label="Tentar auto-cast" onPress={attemptSpell} />
        </View>
        <Text style={styles.event}>{spellEvent}</Text>
        {spellAttempt && (
          <Text style={styles.debugNote}>
            mana depois {spellAttempt.manaAfter} · cooldown depois {spellAttempt.cooldownAfter}
            {spellAttempt.power === null ? '' : ` · potência ${spellAttempt.power.toFixed(1)}`}
            {spellAttempt.controlChanceSucceeded === null ? '' : ` · chance ${spellAttempt.controlChanceSucceeded ? 'passou' : 'falhou'}`}
          </Text>
        )}
      </LabSection>

      <LabSection title="02 · Personagem">
        <Text style={styles.helper}>
          Party ativa: {summary.characterCount}/{PARTY_MAX_SIZE}. XP é
          concedido integralmente a todos os personagens ativos.
        </Text>
        <View style={styles.roster}>
          {party.characters.map((character) => (
            <Pressable
              key={character.id}
              onPress={() => selectCharacter(character.id)}
              style={[styles.rosterButton, character.id === selectedCharacterId && styles.rosterSelected]}
            >
              <Text style={styles.rosterName}>{character.name}</Text>
              <Text style={styles.muted}>Nv. {character.progress.level}</Text>
            </Pressable>
          ))}
        </View>
        {party.characters.length < 4 && (
          <LabButton label="Recrutar personagem nível 1" onPress={recruitCharacter} />
        )}
        <View style={styles.characterHeader}>
          <View>
            <Text style={styles.characterName}>{selectedCharacter.name}</Text>
            <Text style={styles.muted}>Progressão local de teste</Text>
          </View>
          <Text style={styles.level}>NÍVEL {selectedCharacter.progress.level}</Text>
        </View>

        <View style={styles.xpLabels}>
          <Text style={styles.label}>EXPERIÊNCIA</Text>
          <Text style={styles.xpValue}>
            {Math.floor(selectedCharacter.progress.xp)} / {nextLevelXp} XP
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${xpPercent}%` }]} />
        </View>
        <Text style={styles.event}>{lastEvent}</Text>

        <View style={styles.pointsCard}>
          <Text style={styles.pointsValue}>{selectedCharacter.progress.unspentAttributePoints}</Text>
          <View>
            <Text style={styles.pointsTitle}>pontos disponíveis</Text>
            <Text style={styles.muted}>Distribua depois de subir de nível</Text>
          </View>
        </View>
      </LabSection>

      <LabSection title="03 · Controles de teste">
        <Text style={styles.helper}>
          O botão principal imita o caminho futuro: derrotar um monstro gera
          XP através do `packages/core`.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Simular derrota de Ignavo"
          onPress={defeatIgnavo}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>⚔ Derrotar Ignavo · +15 XP</Text>
        </Pressable>

        <View style={styles.sliderLabels}>
          <Text style={styles.label}>XP DA RECOMPENSA DE TESTE</Text>
          <Text style={styles.xpValue}>{selectedXp} XP</Text>
        </View>
        <Slider
          accessibilityLabel="Quantidade de XP da recompensa de teste"
          maximumTrackTintColor="#3a353d"
          maximumValue={500}
          minimumTrackTintColor="#6b8f4f"
          minimumValue={0}
          onValueChange={setSelectedXp}
          step={5}
          style={styles.slider}
          thumbTintColor="#b8cf9b"
          value={selectedXp}
        />
        <LabButton
          label={`Aplicar +${selectedXp} XP`}
          onPress={applySelectedXp}
          disabled={!canApplySelectedXp}
        />
        <Text style={styles.debugNote}>
          O slider e o botão de aplicar são ferramentas de inspeção. No jogo
          real, o XP virá de recompensas de combate.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reiniciar laboratório"
          onPress={reset}
          style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
        >
          <Text style={styles.resetText}>Reiniciar cenário</Text>
        </Pressable>
      </LabSection>

      <LabSection title="04 · Atributos">
        <Text style={styles.helper}>
          Level-up libera pontos; a escolha do atributo é manual e permanente.
          Os derivados de combate ainda não estão conectados.
        </Text>
        {ATTRIBUTE_ROWS.map((row) => (
          <View key={row.key} style={styles.attributeRow}>
            <View style={styles.attributeIdentity}>
              <Text style={styles.attributeLabel}>{row.label}</Text>
              <Text style={styles.muted}>{row.name}</Text>
            </View>
              <Text style={styles.attributeValue}>
                {selectedCharacter.progress.attributes[row.key]} → {effectiveAttributes[row.key]}
              </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Aumentar ${row.name}`}
              disabled={selectedCharacter.progress.unspentAttributePoints === 0}
              onPress={() => allocate(row.key)}
              style={({ pressed }) => [
                styles.plusButton,
                selectedCharacter.progress.unspentAttributePoints === 0 && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.plusText}>+</Text>
            </Pressable>
          </View>
        ))}
      </LabSection>

      <LabSection title="05 · Equipamento (teste)">
        <Text style={styles.helper}>
          Equipamento pertence ao inventário e é movido atomicamente para o
          loadout. Este laboratório usa a mesma transição do jogo.
        </Text>
        {testEquipment.map((equipment) => {
          const equipped = selectedLoadout.equipped[equipment.slot]?.instanceId === equipment.instanceId;
          return (
            <View key={equipment.instanceId} style={styles.equipmentRow}>
              <View style={styles.equipmentIdentity}>
                <Text style={styles.equipmentName}>{equipment.name}</Text>
                <Text style={styles.muted}>
                  {equipment.slot} · {equipment.rarity} · {equipment.instanceId} · dano {equipment.stats.baseDamage}
                </Text>
              </View>
              <LabButton
                label={equipped ? 'Desequipar' : 'Equipar'}
                onPress={() => equipped ? unequipSlot(equipment.slot) : equipTestEquipment(equipment.instanceId)}
              />
            </View>
          );
        })}
        <Text style={styles.label}>SLOTS</Text>
        <View style={styles.slotGrid}>
          {EQUIPMENT_SLOTS.map((slot) => (
            <Pressable
              key={slot}
              accessibilityRole="button"
              accessibilityLabel={`Liberar slot ${slot}`}
              onPress={() => unequipSlot(slot)}
              style={styles.slotButton}
            >
              <Text style={styles.slotName}>{slot}</Text>
              <Text style={styles.muted}>{selectedLoadout.equipped[slot]?.name ?? 'vazio'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helper}>Stats efetivos: dano {effectiveStats.baseDamage} · defesa {effectiveStats.baseDefense} · dano físico {effectiveStats.physicalDamagePercent}% · crítico {effectiveStats.criticalChancePercent}%</Text>
        {replacementPreview && <Text style={styles.helper}>Preview da candidata: {replacementPreview.deltas.filter(({ delta }) => delta !== 0).map(({ stat, delta }) => `${String(stat)} ${delta > 0 ? '+' : ''}${delta}`).join(' · ') || 'sem delta'}</Text>}
      </LabSection>

      <LabSection title="06 · Consumível (teste)">
        <Text style={styles.helper}>
          Usar consome uma unidade e ativa o bônus no personagem selecionado.
          O efeito pode ser removido explicitamente; não há duração automática.
        </Text>
        <View style={styles.consumableCard}>
          <View style={styles.equipmentIdentity}>
            <Text style={styles.equipmentName}>{testConsumable.item.name}</Text>
            <Text style={styles.muted}>
              {testConsumable.item.rarity} · {testConsumable.quantity} unidade(s)
            </Text>
          </View>
          <LabButton
            label="Usar"
            onPress={useTestConsumable}
            disabled={testConsumable.quantity === 0 || canRemoveTestConsumable}
          />
        </View>
        <LabButton
          label="Remover efeito"
          onPress={removeTestConsumable}
          disabled={!canRemoveTestConsumable}
        />
      </LabSection>

      <LabSection title="07 · Inventário (teste)">
        <Text style={styles.helper}>
          Capacidade de teste: {inventorySummary.usedSlots}/{inventorySummary.capacity} slots.
          Consumíveis empilham; equipamentos ocupam um slot individual. Cheio,
          o inventário rejeita a adição sem descartar itens.
        </Text>
        <View style={styles.sliderLabels}>
          <Text style={styles.label}>CHANCE DA TABELA</Text>
          <Text style={styles.xpValue}>Espada {dropChancePercent}% · Escudo {100 - dropChancePercent}%</Text>
        </View>
        <Slider
          accessibilityLabel="Chance percentual de espada no drop"
          maximumTrackTintColor="#3a353d"
          maximumValue={100}
          minimumTrackTintColor="#6b8f4f"
          minimumValue={0}
          onValueChange={setDropChancePercent}
          step={5}
          style={styles.slider}
          thumbTintColor="#b8cf9b"
          value={dropChancePercent}
        />
        <View style={styles.inventorySummary}>
          <Text style={styles.pointsValue}>{inventorySummary.availableSlots}</Text>
          <Text style={styles.pointsTitle}>slots disponíveis</Text>
        </View>
        {inventoryCandidates.map((item) => (
          <View key={item.kind === 'equipment' ? item.instanceId : item.id} style={styles.inventoryRow}>
            <View style={styles.equipmentIdentity}>
              <Text style={styles.equipmentName}>{item.name}</Text>
              <Text style={styles.muted}>{item.kind} · {item.rarity}</Text>
            </View>
            <LabButton label="Adicionar" onPress={() => addTestItem(item.kind === 'equipment' ? item.instanceId : item.id)} />
          </View>
        ))}
        <LabButton label="Gerar drop determinístico" onPress={generateTestDrop} />
        {inventory.items.map((stack, index) => (
          <View key={`${stack.item.kind === 'equipment' ? stack.item.instanceId : stack.item.id}-${index}`} style={styles.inventoryRow}>
            <View style={styles.equipmentIdentity}>
              <Text style={styles.equipmentName}>{stack.item.name}</Text>
              <Text style={styles.muted}>quantidade: {stack.quantity}</Text>
            </View>
            <LabButton label="Remover 1" onPress={() => removeTestItem(stack.item.kind === 'equipment' ? stack.item.instanceId : stack.item.id)} />
          </View>
        ))}
      </LabSection>
    </ScrollView>
  );
}

function formatBonuses(bonuses: Readonly<Partial<Record<PrimaryAttribute, number>>>): string {
  return Object.entries(bonuses)
    .map(([attribute, amount]) => `${attribute.toUpperCase()} +${amount}`)
    .join(' · ');
}

function LabSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LabButton({
  label,
  disabled = false,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0e0e12',
  },
  content: {
    padding: 20,
    paddingTop: 42,
    gap: 14,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    color: '#8f7657',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#e1d1b6',
    fontSize: 23,
    fontWeight: '700',
    marginTop: 4,
  },
  testBadge: {
    backgroundColor: '#50351f',
    borderColor: '#b97a3d',
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  testBadgeText: {
    color: '#e6aa67',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  notice: {
    backgroundColor: '#1d1814',
    borderLeftColor: '#b97a3d',
    borderLeftWidth: 3,
    padding: 12,
  },
  noticeTitle: {
    color: '#e6aa67',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  noticeText: {
    color: '#b9a891',
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#17151a',
    borderColor: '#2e2930',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  sectionTitle: {
    color: '#9f8c70',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
  },
  characterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  rosterButton: {
    backgroundColor: '#211d20',
    borderColor: '#403a41',
    borderRadius: 5,
    borderWidth: 1,
    minWidth: 100,
    padding: 8,
  },
  rosterSelected: {
    backgroundColor: '#2b3b29',
    borderColor: '#6e925b',
  },
  rosterName: {
    color: '#d8c5a5',
    fontSize: 11,
    fontWeight: '700',
  },
  equipmentRow: {
    alignItems: 'center',
    borderTopColor: '#2c2830',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
  },
  equipmentIdentity: {
    flex: 1,
  },
  equipmentName: {
    color: '#d8c5a5',
    fontSize: 12,
    fontWeight: '700',
  },
  consumableCard: {
    alignItems: 'center',
    backgroundColor: '#211d16',
    borderColor: '#45351f',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 10,
  },
  inventorySummary: {
    alignItems: 'center',
    backgroundColor: '#211d16',
    borderColor: '#45351f',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    padding: 10,
  },
  inventoryRow: {
    alignItems: 'center',
    borderTopColor: '#2c2830',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  slotButton: {
    backgroundColor: '#211d20',
    borderColor: '#403a41',
    borderRadius: 5,
    borderWidth: 1,
    padding: 8,
    width: '48%',
  },
  slotName: {
    color: '#9f8c70',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  characterName: {
    color: '#e1d1b6',
    fontSize: 17,
    fontWeight: '700',
  },
  level: {
    color: '#d39a55',
    fontSize: 14,
    fontWeight: '800',
  },
  muted: {
    color: '#766b61',
    fontSize: 11,
  },
  label: {
    color: '#766b61',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  xpLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  xpValue: {
    color: '#c8b99e',
    fontSize: 11,
  },
  progressTrack: {
    backgroundColor: '#2b292c',
    borderRadius: 4,
    height: 8,
    marginTop: 7,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#6b8f4f',
    height: '100%',
  },
  event: {
    color: '#a9bd80',
    fontSize: 11,
    marginTop: 8,
    minHeight: 16,
  },
  pointsCard: {
    alignItems: 'center',
    backgroundColor: '#211d16',
    borderColor: '#45351f',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    padding: 10,
  },
  pointsValue: {
    color: '#e6aa67',
    fontSize: 24,
    fontWeight: '800',
  },
  pointsTitle: {
    color: '#d4bd96',
    fontSize: 12,
    fontWeight: '700',
  },
  helper: {
    color: '#9d9389',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  spellContextRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 48,
  },
  spellStatusCard: {
    backgroundColor: '#211d16',
    borderColor: '#45351f',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  spellActions: {
    flexDirection: 'row',
    gap: 8,
  },
  spellConfigRow: {
    borderBottomColor: '#2e2930',
    borderBottomWidth: 1,
    gap: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
  spellConfigActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#674021',
    borderColor: '#b97a3d',
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#f0d2a5',
    fontSize: 12,
    fontWeight: '800',
  },
  sliderLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  slider: {
    height: 36,
    marginHorizontal: -6,
    marginVertical: 2,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#2b3b29',
    borderColor: '#57764a',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    color: '#b8cf9b',
    fontSize: 11,
    fontWeight: '700',
  },
  debugNote: {
    color: '#766b61',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
  },
  resetButton: {
    alignItems: 'center',
    borderColor: '#403a41',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 38,
    justifyContent: 'center',
  },
  resetText: {
    color: '#aa9ca6',
    fontSize: 11,
    fontWeight: '700',
  },
  attributeRow: {
    alignItems: 'center',
    borderTopColor: '#2c2830',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
  },
  attributeIdentity: {
    flex: 1,
  },
  attributeLabel: {
    color: '#d8c5a5',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  attributeValue: {
    color: '#e1d1b6',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 12,
    minWidth: 28,
    textAlign: 'right',
  },
  plusButton: {
    alignItems: 'center',
    backgroundColor: '#35472f',
    borderColor: '#6e925b',
    borderRadius: 5,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 36,
  },
  plusText: {
    color: '#d5e7bb',
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 24,
  },
  disabled: {
    backgroundColor: '#27252a',
    borderColor: '#3e3941',
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
});

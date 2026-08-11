import { useState } from 'react';
import {
  CharacterProgress,
  PrimaryAttribute,
  createCharacterProgress,
  gainExperience,
  spendAttributePoint,
  xpToNextLevel,
} from '@ossuary/core';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const MONSTER_XP = 15;
const TEST_XP_STEP = 10;

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
  const [progress, setProgress] = useState<CharacterProgress>(() =>
    createCharacterProgress(),
  );
  const [lastEvent, setLastEvent] = useState('Nenhum evento ainda.');

  const nextLevelXp = xpToNextLevel(progress.level);
  const xpPercent = Math.min(100, (progress.xp / nextLevelXp) * 100);

  function applyXp(amount: number, source: string) {
    setProgress((current) => {
      const result = gainExperience(current, amount);
      setLastEvent(
        result.levelsGained > 0
          ? `${source} · subiu ${result.levelsGained} nível(is)`
          : `${source} · +${amount} XP`,
      );
      return result.progress;
    });
  }

  function removeTestXp() {
    setProgress((current) => {
      const nextXp = Math.max(0, current.xp - TEST_XP_STEP);
      setLastEvent(`Controle de teste · −${current.xp - nextXp} XP`);
      return { ...current, xp: nextXp };
    });
  }

  function allocate(attribute: PrimaryAttribute) {
    setProgress((current) => {
      if (current.unspentAttributePoints === 0) return current;
      const next = spendAttributePoint(current, attribute);
      setLastEvent(`Ponto distribuído · ${attribute.toUpperCase()} +1`);
      return next;
    });
  }

  function reset() {
    setProgress(createCharacterProgress());
    setLastEvent('Laboratório reiniciado.');
  }

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

      <LabSection title="01 · Personagem">
        <View style={styles.characterHeader}>
          <View>
            <Text style={styles.characterName}>Sem-Nome</Text>
            <Text style={styles.muted}>Progressão local de teste</Text>
          </View>
          <Text style={styles.level}>NÍVEL {progress.level}</Text>
        </View>

        <View style={styles.xpLabels}>
          <Text style={styles.label}>EXPERIÊNCIA</Text>
          <Text style={styles.xpValue}>
            {Math.floor(progress.xp)} / {nextLevelXp} XP
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${xpPercent}%` }]} />
        </View>
        <Text style={styles.event}>{lastEvent}</Text>

        <View style={styles.pointsCard}>
          <Text style={styles.pointsValue}>{progress.unspentAttributePoints}</Text>
          <View>
            <Text style={styles.pointsTitle}>pontos disponíveis</Text>
            <Text style={styles.muted}>Distribua depois de subir de nível</Text>
          </View>
        </View>
      </LabSection>

      <LabSection title="02 · Controles de teste">
        <Text style={styles.helper}>
          O botão principal imita o caminho futuro: derrotar um monstro gera
          XP através do `packages/core`.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Simular derrota de Ignavo"
          onPress={() => applyXp(MONSTER_XP, 'Ignavo derrotado')}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>⚔ Derrotar Ignavo · +{MONSTER_XP} XP</Text>
        </Pressable>

        <View style={styles.buttonRow}>
          <LabButton
            label={`+${TEST_XP_STEP} XP`}
            onPress={() => applyXp(TEST_XP_STEP, 'Ajuste de teste')}
          />
          <LabButton
            label={`−${TEST_XP_STEP} XP · teste`}
            onPress={removeTestXp}
            muted
          />
        </View>
        <Text style={styles.debugNote}>
          O botão de remover XP é somente um controle visual. No jogo real, XP
          não é perdido.
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

      <LabSection title="03 · Atributos">
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
            <Text style={styles.attributeValue}>{progress.attributes[row.key]}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Aumentar ${row.name}`}
              disabled={progress.unspentAttributePoints === 0}
              onPress={() => allocate(row.key)}
              style={({ pressed }) => [
                styles.plusButton,
                progress.unspentAttributePoints === 0 && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.plusText}>+</Text>
            </Pressable>
          </View>
        ))}
      </LabSection>
    </ScrollView>
  );
}

function LabSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LabButton({
  label,
  muted = false,
  onPress,
}: {
  label: string;
  muted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        muted && styles.mutedButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.secondaryButtonText, muted && styles.mutedButtonText]}>
        {label}
      </Text>
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
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
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
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    color: '#b8cf9b',
    fontSize: 11,
    fontWeight: '700',
  },
  mutedButton: {
    backgroundColor: '#252329',
    borderColor: '#5b535a',
  },
  mutedButtonText: {
    color: '#b2a8af',
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

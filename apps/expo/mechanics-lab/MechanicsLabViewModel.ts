import { useState } from 'react';
import type { CharacterProgress, PrimaryAttribute } from '@ossuary/core';
import {
  createCharacterProgress,
  gainExperience,
  spendAttributePoint,
  xpToNextLevel,
} from '@ossuary/core';

const MONSTER_XP = 15;
const MIN_TEST_XP = 0;
const MAX_TEST_XP = 500;

export interface MechanicsLabViewModel {
  readonly progress: CharacterProgress;
  readonly nextLevelXp: number;
  readonly xpPercent: number;
  readonly selectedXp: number;
  readonly lastEvent: string;
  readonly canApplySelectedXp: boolean;
  readonly setSelectedXp: (amount: number) => void;
  readonly defeatIgnavo: () => void;
  readonly applySelectedXp: () => void;
  readonly allocate: (attribute: PrimaryAttribute) => void;
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
  const [progress, setProgress] = useState<CharacterProgress>(() =>
    createCharacterProgress(),
  );
  const [selectedXp, setSelectedXpState] = useState(MONSTER_XP);
  const [lastEvent, setLastEvent] = useState('Nenhum evento ainda.');

  const nextLevelXp = xpToNextLevel(progress.level);
  const xpPercent = Math.min(100, (progress.xp / nextLevelXp) * 100);

  function applyExperience(amount: number, source: string) {
    const result = gainExperience(progress, amount);
    setProgress(result.progress);
    setLastEvent(
      result.levelsGained > 0
        ? `${source} · subiu ${result.levelsGained} nível(is)`
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
    if (progress.unspentAttributePoints === 0) return;
    setProgress(spendAttributePoint(progress, attribute));
    setLastEvent(`Ponto distribuído · ${attribute.toUpperCase()} +1`);
  }

  function reset() {
    setProgress(createCharacterProgress());
    setSelectedXpState(MONSTER_XP);
    setLastEvent('Laboratório reiniciado.');
  }

  return {
    progress,
    nextLevelXp,
    xpPercent,
    selectedXp,
    lastEvent,
    canApplySelectedXp: selectedXp > 0,
    setSelectedXp,
    defeatIgnavo,
    applySelectedXp,
    allocate,
    reset,
  };
}

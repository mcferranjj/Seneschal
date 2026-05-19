/**
 * useStatblockSelection
 *
 * Manages which creature is currently displayed in the StatblockDrawer and
 * where that selection came from ('results' | 'encounter').  Keeping source
 * alongside the creature lets the two columns show a highlight independently:
 * selecting from the encounter tracker clears the results-list highlight, and
 * vice versa.
 *
 * Also restores the last-viewed creature from the persisted ID on mount.
 */

import { useCallback, useEffect, useState } from 'react';
import type { CreatureRecord } from '../db/schema';
import { creatureRepository } from '../db/repositories/CreatureRepository';

export type SelectionSource = 'results' | 'encounter' | null;

export interface StatblockSelection {
  /** The creature whose statblock is currently shown, or null. */
  selected: CreatureRecord | null;
  /** The encounter creature uid whose card should be highlighted, or null. */
  selectedEncounterUid: string | null;
  /**
   * Which column originated the selection.  Consumers use this to decide
   * whether to pass a non-null selectedId / selectedEncounterUid to each column:
   *   - ResultsList gets a selectedId only when source === 'results'
   *   - EncounterManager gets a selectedEncounterUid only when source === 'encounter'
   */
  selectionSource: SelectionSource;
  /** Select a DB creature by id.  Pass encounterUid when clicking from the encounter tracker. */
  selectCreatureById: (id: string, encounterUid?: string) => Promise<void>;
  /** Select a creature directly (e.g. after a wizard save). Source defaults to 'results'. */
  selectCreature: (creature: CreatureRecord | null, source?: SelectionSource) => void;
  /** Toggle a results-row selection: deselects if the same creature is already selected from results. */
  toggleResultsSelection: (creature: CreatureRecord) => void;
  /** Clear the selection entirely (close button, wizard open, etc.). */
  clearSelection: () => void;
}

export function useStatblockSelection(
  persistedCreatureId: string | null,
  onPersist: (id: string | null) => void,
): StatblockSelection {
  const [selected, setSelected] = useState<CreatureRecord | null>(null);
  const [selectedEncounterUid, setSelectedEncounterUid] = useState<string | null>(null);
  const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);

  // Restore last-viewed creature from persisted ID on mount.
  // Sets selected state only — source stays null so neither column highlights,
  // which is the correct behaviour after a page refresh.
  useEffect(() => {
    if (!persistedCreatureId) return;
    creatureRepository.get(persistedCreatureId)
      .then(c => { if (c) setSelected(c); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCreatureById = useCallback(async (id: string, encounterUid?: string) => {
    const creature = await creatureRepository.get(id);
    if (!creature) return;
    setSelected(creature);
    setSelectedEncounterUid(encounterUid ?? null);
    setSelectionSource(encounterUid ? 'encounter' : 'results');
    onPersist(creature.id);
  }, [onPersist]);

  const selectCreature = useCallback((creature: CreatureRecord | null, source: SelectionSource = 'results') => {
    setSelected(creature);
    setSelectedEncounterUid(null);
    setSelectionSource(creature ? source : null);
    onPersist(creature?.id ?? null);
  }, [onPersist]);

  const toggleResultsSelection = useCallback((creature: CreatureRecord) => {
    setSelected(prev => {
      const deselecting = prev?.id === creature.id && selectionSource === 'results';
      const next = deselecting ? null : creature;
      onPersist(next?.id ?? null);
      return next;
    });
    setSelectedEncounterUid(null);
    setSelectionSource(prev =>
      prev === 'results' && selected?.id === creature.id ? null : 'results'
    );
  }, [selected, selectionSource, onPersist]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setSelectedEncounterUid(null);
    setSelectionSource(null);
    onPersist(null);
  }, [onPersist]);

  return {
    selected,
    selectedEncounterUid,
    selectionSource,
    selectCreatureById,
    selectCreature,
    toggleResultsSelection,
    clearSelection,
  };
}

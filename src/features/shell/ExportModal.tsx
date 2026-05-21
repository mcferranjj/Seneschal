import { useEffect, useReducer, useState } from 'react';
import { useBackable } from '../../nav/useBackable';
import { downloadJson, makeExportFileSelective } from '../../utils/exportImport';
import { loadEncounterState, saveEncounterState } from '../../db/db';
import { creatureRepository } from '../../db/repositories/CreatureRepository';
import { characterRepository } from '../../db/repositories/CharacterRepository';
import { partyRepository } from '../../db/repositories/PartyRepository';
import { partyMemberRepository } from '../../db/repositories/PartyMemberRepository';
import type { CreatureRecord, CharacterRecord, PartyRecord } from '../../db/schema';
import type { Encounter } from '../../types/encounter';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  onClose: () => void;
}

type Category = 'encounters' | 'customCreatures' | 'characters' | 'parties';

interface ExportItem {
  id: string;
  label: string;
  sublabel?: string;
}

// All modal state in one reducer so every update is atomic — no partial renders
// where items and selected are temporarily out of sync.
interface ModalState {
  loading: boolean;
  items: Record<Category, ExportItem[]>;
  selected: Record<Category, Set<string>>;
}

type ModalAction =
  | { type: 'loaded'; items: Record<Category, ExportItem[]> }
  | { type: 'toggle'; cat: Category; id: string }
  | { type: 'toggleAll'; cat: Category }
  | { type: 'deleteItem'; cat: Category; id: string };

const INITIAL_STATE: ModalState = {
  loading: true,
  items: { encounters: [], customCreatures: [], characters: [], parties: [] },
  selected: { encounters: new Set(), customCreatures: new Set(), characters: new Set(), parties: new Set() },
};

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'loaded': {
      const selected: Record<Category, Set<string>> = {
        encounters:      new Set(action.items.encounters.map(i => i.id)),
        customCreatures: new Set(action.items.customCreatures.map(i => i.id)),
        characters:      new Set(action.items.characters.map(i => i.id)),
        parties:         new Set(action.items.parties.map(i => i.id)),
      };
      return { loading: false, items: action.items, selected };
    }
    case 'toggle': {
      const next = new Set(state.selected[action.cat]);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, selected: { ...state.selected, [action.cat]: next } };
    }
    case 'toggleAll': {
      const items = state.items[action.cat];
      const allSelected = items.every(i => state.selected[action.cat].has(i.id));
      const next = allSelected ? new Set<string>() : new Set(items.map(i => i.id));
      return { ...state, selected: { ...state.selected, [action.cat]: next } };
    }
    case 'deleteItem': {
      const nextItems = state.items[action.cat].filter(i => i.id !== action.id);
      const nextSelected = new Set(state.selected[action.cat]);
      nextSelected.delete(action.id);
      return {
        ...state,
        items: { ...state.items, [action.cat]: nextItems },
        selected: { ...state.selected, [action.cat]: nextSelected },
      };
    }
  }
}

const CATEGORIES: { id: Category; icon: string; label: string; emptyLabel: string }[] = [
  { id: 'encounters',      icon: '⚔',  label: 'Encounters',      emptyLabel: 'No encounters saved' },
  { id: 'customCreatures', icon: '🧙', label: 'Custom Creatures', emptyLabel: 'No custom creatures' },
  { id: 'characters',      icon: '✦',  label: 'Characters',       emptyLabel: 'No characters saved' },
  { id: 'parties',         icon: '👥', label: 'Parties',          emptyLabel: 'No parties saved' },
];

export function ExportModal({ onClose }: ExportModalProps) {
  useBackable(true, onClose, 'Close export', { escClosable: true });

  const [activeCategory, setActiveCategory] = useState<Category>('encounters');
  const [state, dispatch] = useReducer(modalReducer, INITIAL_STATE);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ cat: Category; id: string } | null>(null);

  // ── Load all data once on mount ─────────────────────────────────────────────
  useEffect(() => {
    const token = { cancelled: false };

    async function load() {
      const [encState, creatures, chars, parties] = await Promise.all([
        loadEncounterState(),
        creatureRepository.getAllCustom(),
        characterRepository.getAll(),
        partyRepository.getAll(),
      ]);

      if (token.cancelled) return;

      const encounters: ExportItem[] = (encState?.encounters ?? []).map((e: Encounter) => ({
        id: String(e.id),
        label: e.name,
        sublabel: `${e.creatures.length} creature${e.creatures.length !== 1 ? 's' : ''}`,
      }));

      const customCreatures: ExportItem[] = (creatures as CreatureRecord[]).map(c => ({
        id: c.id,
        label: c.name,
        sublabel: `Level ${c.level}${c.entityType === 'hazard' ? ' · Hazard' : ''}`,
      }));

      const characters: ExportItem[] = (chars as CharacterRecord[]).map(c => ({
        id: c.id,
        label: c.name,
        sublabel: [
          c.class?.name,
          `Level ${c.level}`,
          c.playerName ? `· ${c.playerName}` : null,
        ].filter(Boolean).join(' '),
      }));

      const partiesItems: ExportItem[] = (parties as PartyRecord[]).map(p => ({
        id: p.id,
        label: p.name,
        sublabel: `${p.memberIds.length} member${p.memberIds.length !== 1 ? 's' : ''} · Level ${p.level}`,
      }));

      dispatch({ type: 'loaded', items: { encounters, customCreatures, characters, parties: partiesItems } });
    }

    load();
    return () => { token.cancelled = true; };
  }, []);

  // ── Delete an item from the DB via repositories ──────────────────────────────
  async function handleDelete(cat: Category, id: string) {
    try {
      if (cat === 'encounters') {
        const encState = await loadEncounterState();
        if (encState) {
          const numId = parseInt(id, 10);
          await saveEncounterState({
            ...encState,
            encounters: encState.encounters.filter(e => e.id !== numId),
          });
        }
      } else if (cat === 'customCreatures') {
        await creatureRepository.delete(id);
      } else if (cat === 'characters') {
        await characterRepository.delete(id);
      } else if (cat === 'parties') {
        const party = await partyRepository.getById(id);
        if (party) await partyMemberRepository.bulkDelete(party.memberIds);
        await partyRepository.delete(id);
      }
      dispatch({ type: 'deleteItem', cat, id });
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setConfirmDelete(null);
  }

  // ── Export selected items ────────────────────────────────────────────────────
  async function handleExport() {
    if (totalSelected === 0) return;
    setExporting(true);
    setExportError(null);

    try {
      const encState = await loadEncounterState();
      const allEncounters: Encounter[] = encState?.encounters ?? [];

      const selectedEncounters = allEncounters.filter(e =>
        selected.encounters.has(String(e.id))
      );

      // Collect custom creature IDs: explicitly selected + encounter dependencies
      const referencedCreatureIds = new Set<string>(selected.customCreatures);
      for (const enc of selectedEncounters) {
        for (const creature of enc.creatures) {
          if (creature.creatureId) {
            const record = await creatureRepository.get(creature.creatureId);
            if (record?.packSource === 'custom') referencedCreatureIds.add(creature.creatureId);
          }
        }
      }

      const allCustomCreatures = await creatureRepository.getAllCustom();
      const selectedCreatures = allCustomCreatures.filter(c => referencedCreatureIds.has(c.id));

      const allChars = await characterRepository.getAll();
      const selectedCharacters = allChars.filter(c => selected.characters.has(c.id));

      const allParties = await partyRepository.getAll();
      const selectedParties = allParties.filter(p => selected.parties.has(p.id));

      const memberIds = new Set<string>(selectedParties.flatMap(p => p.memberIds));
      const allMembers = await partyMemberRepository.getAll();
      const selectedMembers = allMembers.filter(m => memberIds.has(m.id));

      const file = makeExportFileSelective({
        encounters:      selectedEncounters.length > 0 ? selectedEncounters : undefined,
        customCreatures: selectedCreatures.length > 0  ? selectedCreatures  : undefined,
        characters:      selectedCharacters.length > 0 ? selectedCharacters : undefined,
        parties:         selectedParties.length > 0    ? selectedParties    : undefined,
        partyMembers:    selectedMembers.length > 0    ? selectedMembers    : undefined,
      });

      const dateStr = new Date().toISOString().split('T')[0];
      downloadJson(`seneschal-export-${dateStr}.json`, file);
      onClose();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  }

  // ── Derived render values ────────────────────────────────────────────────────
  const { loading, items: allItems, selected } = state;
  const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;
  const items = allItems[activeCategory];
  const selSet = selected[activeCategory];
  const allChecked = items.length > 0 && items.every(i => selSet.has(i.id));
  const totalSelected =
    selected.encounters.size + selected.customCreatures.size +
    selected.characters.size + selected.parties.size;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>💾 Export Data</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close export">✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Category sidebar */}
          <nav className={styles.sidebar}>
            {CATEGORIES.map(cat => {
              const count = selected[cat.id].size;
              const total = allItems[cat.id].length;
              return (
                <button
                  key={cat.id}
                  className={`${styles.navItem} ${cat.id === activeCategory ? styles.navItemActive : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span className={styles.navIcon}>{cat.icon}</span>
                  <span className={styles.navLabel}>{cat.label}</span>
                  {total > 0 && (
                    <span className={`${styles.navBadge} ${
                      count === 0 ? styles.navBadgeNone :
                      count === total ? styles.navBadgeAll : styles.navBadgeSome
                    }`}>
                      {count}/{total}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Item list */}
          <div className={styles.listPane}>
            <div className={styles.listHeader}>
              <span className={styles.listTitle}>{activeCat.icon} {activeCat.label}</span>
              {items.length > 0 && (
                <button
                  className={styles.toggleAllBtn}
                  onClick={() => dispatch({ type: 'toggleAll', cat: activeCategory })}
                >
                  {allChecked ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            <div className={styles.itemList}>
              {loading ? (
                <div className={styles.emptyState}>Loading…</div>
              ) : items.length === 0 ? (
                <div className={styles.emptyState}>{activeCat.emptyLabel}</div>
              ) : (
                items.map(item => {
                  const checked = selSet.has(item.id);
                  const isConfirmingDelete = confirmDelete?.cat === activeCategory && confirmDelete.id === item.id;
                  return (
                    <div
                      key={`${activeCategory}:${item.id}`}
                      className={`${styles.itemRow} ${checked ? styles.itemRowChecked : ''}`}
                    >
                      <label className={styles.itemLabelWrap}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={checked}
                          onChange={() => dispatch({ type: 'toggle', cat: activeCategory, id: item.id })}
                        />
                        <div className={styles.itemInfo}>
                          <span className={styles.itemLabel}>{item.label}</span>
                          {item.sublabel && (
                            <span className={styles.itemSublabel}>{item.sublabel}</span>
                          )}
                        </div>
                      </label>
                      {isConfirmingDelete ? (
                        <span className={styles.deleteConfirm}>
                          <span className={styles.deleteConfirmText}>Delete?</span>
                          <button
                            className={styles.deleteConfirmYes}
                            onClick={() => handleDelete(activeCategory, item.id)}
                          >✓</button>
                          <button
                            className={styles.deleteConfirmNo}
                            onClick={() => setConfirmDelete(null)}
                          >✕</button>
                        </span>
                      ) : (
                        <button
                          className={styles.deleteBtn}
                          title={`Delete ${activeCat.label.toLowerCase().replace(/s$/, '')}`}
                          onClick={e => { e.stopPropagation(); setConfirmDelete({ cat: activeCategory, id: item.id }); }}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {exportError && (
            <span className={styles.errorMsg}>Export failed: {exportError}</span>
          )}
          <span className={styles.selectionSummary}>
            {totalSelected === 0
              ? 'Nothing selected'
              : `${totalSelected} item${totalSelected !== 1 ? 's' : ''} selected`}
          </span>
          <button className={styles.cancelBtn} onClick={onClose} disabled={exporting}>
            Cancel
          </button>
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={totalSelected === 0 || exporting}
          >
            {exporting ? 'Exporting…' : '💾 Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

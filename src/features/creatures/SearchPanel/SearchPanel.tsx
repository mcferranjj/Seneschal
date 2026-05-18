import { useEffect, useRef, useState } from 'react';
import type { SearchFilters, PublicationInfo } from '../../../search/search';
import { getAllTraits, getAllPublicationsWithMeta } from '../../../search/search';
import type { PublicationEra, PublicationCategory } from '../../../sync/publicationRegistry';
import { CREATURE_TYPES, SIZES, RARITIES, HAZARD_TYPES } from '../../../data/pf2eConstants';
import styles from './SearchPanel.module.css';
import { rankSuggestions } from '../../../utils/suggestions';

/**
 * Strips the "Pathfinder " prefix from publication titles for compact display.
 * e.g. "Pathfinder GM Core" → "GM Core", "Pathfinder Adventure Path: Age of Ashes" → "Adventure Path: Age of Ashes"
 */
function publicationDisplayName(title: string): string {
  return title.startsWith('Pathfinder ') ? title.slice('Pathfinder '.length) : title;
}

const ERAS: PublicationEra[] = ['remaster', 'legacy', 'sf2e'];
const CATEGORIES: PublicationCategory[] = ['core', 'supplemental', 'ap', 'adventure', 'society', 'misc'];

const ERA_LABELS: Record<PublicationEra, string> = {
  remaster: 'Remaster',
  legacy: 'Legacy',
  sf2e: 'Starfinder 2E',
};

const CATEGORY_LABELS: Record<PublicationCategory, string> = {
  core: 'Core',
  supplemental: 'Supplemental',
  ap: 'Adventure Paths',
  adventure: 'Adventures',
  society: 'Society',
  misc: 'Misc',
};

type EraGroups = Record<PublicationEra, Record<PublicationCategory, PublicationInfo[]>>;

function groupPublications(publications: PublicationInfo[]): EraGroups {
  const empty = (): Record<PublicationCategory, PublicationInfo[]> =>
    ({ core: [], supplemental: [], ap: [], adventure: [], society: [], misc: [] });
  const result: EraGroups = {
    remaster: empty(),
    legacy:   empty(),
    sf2e:     empty(),
  };
  for (const p of publications) {
    result[p.era][p.category].push(p);
  }
  return result;
}

function checkState(publications: PublicationInfo[], selected: string[]): 'all' | 'none' | 'some' {
  if (publications.length === 0) return 'none';
  const n = publications.filter(p => selected.includes(p.name)).length;
  if (n === 0) return 'none';
  if (n === publications.length) return 'all';
  return 'some';
}

function TristateCheckbox({
  state,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  state: 'all' | 'none' | 'some';
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'some';
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === 'all'}
      onChange={e => onChange(e.target.checked)}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  );
}

interface SearchPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  disabled: boolean;
  partyLevel: number;
}

export function SearchPanel({ filters, onChange, disabled, partyLevel }: SearchPanelProps) {
  const [allTraits, setAllTraits] = useState<string[]>([]);
  const [allPublicationsWithMeta, setAllPublicationsWithMeta] = useState<PublicationInfo[]>([]);
  const [traitInput, setTraitInput] = useState('');
  const [collapsedEras, setCollapsedEras] = useState<Set<string>>(new Set(['legacy', 'sf2e']));
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set([
    'remaster/ap', 'remaster/adventure', 'remaster/society', 'remaster/misc',
    'legacy/core', 'legacy/supplemental', 'legacy/ap', 'legacy/adventure', 'legacy/society', 'legacy/misc',
    'sf2e/core', 'sf2e/supplemental', 'sf2e/ap', 'sf2e/adventure', 'sf2e/society', 'sf2e/misc',
  ]));
  const publicationsInitialized = useRef(false);

  useEffect(() => {
    if (!disabled) {
      getAllTraits().then(setAllTraits).catch(() => {});
      getAllPublicationsWithMeta().then(pubs => {
        setAllPublicationsWithMeta(pubs);
        if (!publicationsInitialized.current) {
          publicationsInitialized.current = true;
          if (filters.publications.length === 0) {
            const remaster = pubs.filter(p => p.era === 'remaster' && (p.category === 'core' || p.category === 'supplemental')).map(p => p.name);
            // Always include 'Custom' in the default selection
            const defaults = pubs.some(p => p.name === 'Custom') ? [...remaster, 'Custom'] : remaster;
            if (defaults.length > 0) onChange({ ...filters, publications: defaults });
          }
        }
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  function set(partial: Partial<SearchFilters>) {
    onChange({ ...filters, ...partial });
  }

  function addTrait(trait: string, mode: 'include' | 'exclude' = 'include') {
    const t = trait.trim().toLowerCase();
    if (!t) return setTraitInput('');
    if (mode === 'include') {
      if (!filters.traits.includes(t)) {
        set({ traits: [...filters.traits, t], excludeTraits: filters.excludeTraits.filter(x => x !== t) });
      }
    } else {
      if (!filters.excludeTraits.includes(t)) {
        set({ excludeTraits: [...filters.excludeTraits, t], traits: filters.traits.filter(x => x !== t) });
      }
    }
    setTraitInput('');
  }

  function removeTrait(trait: string) {
    set({ traits: filters.traits.filter(t => t !== trait), excludeTraits: filters.excludeTraits.filter(t => t !== trait) });
  }

  function toggleTraitMode(trait: string) {
    if (filters.traits.includes(trait)) {
      set({ traits: filters.traits.filter(t => t !== trait), excludeTraits: [...filters.excludeTraits, trait] });
    } else {
      set({ excludeTraits: filters.excludeTraits.filter(t => t !== trait), traits: [...filters.traits, trait] });
    }
  }

  function toggleEntityType(value: string, checked: boolean) {
    set({ entityTypes: checked ? [...filters.entityTypes, value] : filters.entityTypes.filter(x => x !== value) });
  }

  function toggleHazardType(value: string, checked: boolean) {
    set({ hazardTypes: checked ? [...filters.hazardTypes, value] : filters.hazardTypes.filter(x => x !== value) });
  }

  function toggleCreatureType(value: string, checked: boolean) {
    const lower = value.toLowerCase();
    set({ creatureTypes: checked ? [...filters.creatureTypes, lower] : filters.creatureTypes.filter(x => x !== lower) });
  }

  function toggleSize(value: string, checked: boolean) {
    set({ sizes: checked ? [...filters.sizes, value] : filters.sizes.filter(x => x !== value) });
  }

  function toggleRarity(value: string, checked: boolean) {
    set({ rarities: checked ? [...filters.rarities, value] : filters.rarities.filter(x => x !== value) });
  }

  function togglePublication(value: string, checked: boolean) {
    set({ publications: checked ? [...filters.publications, value] : filters.publications.filter(x => x !== value) });
  }

  function toggleEra(era: PublicationEra, checked: boolean) {
    const eraPubs = CATEGORIES.flatMap(cat => groups[era][cat]).map(p => p.name);
    set({
      publications: checked
        ? [...new Set([...filters.publications, ...eraPubs])]
        : filters.publications.filter(s => !eraPubs.includes(s)),
    });
  }

  function toggleCategory(era: PublicationEra, cat: PublicationCategory, checked: boolean) {
    const catPubs = groups[era][cat].map(p => p.name);
    set({
      publications: checked
        ? [...new Set([...filters.publications, ...catPubs])]
        : filters.publications.filter(s => !catPubs.includes(s)),
    });
  }

  function toggleCollapseEra(era: string) {
    setCollapsedEras(prev => {
      const next = new Set(prev);
      if (next.has(era)) next.delete(era); else next.add(era);
      return next;
    });
  }

  function toggleCollapseCategory(key: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const groups = groupPublications(allPublicationsWithMeta);

  const allActiveTraits = [...filters.traits, ...filters.excludeTraits];
  const filteredTraits = rankSuggestions(allTraits, traitInput)
    .filter(t => !allActiveTraits.includes(t))
    .slice(0, 12);

  return (
    <aside className={styles.panel}>
      <div className={styles.section}>
        <label className={styles.label} htmlFor="name-search">
          Name
        </label>
        <input
          id="name-search"
          className={styles.input}
          type="text"
          placeholder="Search by name…"
          value={filters.name}
          onChange={e => set({ name: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.levelHeader}>
          <label className={styles.label}>Level Range</label>
          <button
            className={styles.partyLevelBtn}
            onClick={() => set({ levelMin: Math.max(-1, partyLevel - 4), levelMax: Math.min(25, partyLevel + 4) })}
            disabled={disabled}
            type="button"
          >
            Use party level
          </button>
        </div>
        <div className={styles.levelRow}>
          <input
            className={styles.levelInput}
            type="number"
            min={-1}
            max={25}
            value={filters.levelMin}
            onChange={e => set({ levelMin: Number(e.target.value) })}
            disabled={disabled}
          />
          <span className={styles.levelSep}>–</span>
          <input
            className={styles.levelInput}
            type="number"
            min={-1}
            max={25}
            value={filters.levelMax}
            onChange={e => set({ levelMax: Number(e.target.value) })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Traits</label>
        <div className={styles.traitChips}>
          {filters.traits.map(t => (
            <span
              key={t}
              className={`${styles.traitChip} ${styles.traitChipInclude}`}
              onContextMenu={e => { e.preventDefault(); toggleTraitMode(t); }}
              title="Right-click to exclude instead"
            >
              {t}
              <button
                className={styles.removeBtn}
                onClick={() => removeTrait(t)}
                aria-label={`Remove trait ${t}`}
              >
                ×
              </button>
            </span>
          ))}
          {filters.excludeTraits.map(t => (
            <span
              key={t}
              className={`${styles.traitChip} ${styles.traitChipExclude}`}
              onContextMenu={e => { e.preventDefault(); toggleTraitMode(t); }}
              title="Right-click to include instead"
            >
              {t}
              <button
                className={styles.removeBtn}
                onClick={() => removeTrait(t)}
                aria-label={`Remove trait ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className={styles.traitInputWrap}>
          <input
            className={styles.input}
            type="text"
            placeholder="Add trait…"
            value={traitInput}
            onChange={e => setTraitInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addTrait(traitInput, 'include');
              if (e.key === 'Tab' && filteredTraits.length > 0 && traitInput.length > 0) {
                e.preventDefault();
                addTrait(filteredTraits[0], 'include');
              }
            }}
            onBlur={() => setTraitInput('')}
            disabled={disabled}
          />
          <button
            className={styles.traitAddBtn}
            style={{ background: 'var(--trait-include)' }}
            onMouseDown={e => { e.preventDefault(); addTrait(traitInput, 'include'); }}
            disabled={disabled || !traitInput.trim()}
            title="Filter in (include)"
            type="button"
          >
            +
          </button>
          <button
            className={styles.traitAddBtn}
            style={{ background: 'var(--trait-exclude)' }}
            onMouseDown={e => { e.preventDefault(); addTrait(traitInput, 'exclude'); }}
            disabled={disabled || !traitInput.trim()}
            title="Filter out (exclude)"
            type="button"
          >
            −
          </button>
          {filteredTraits.length > 0 && traitInput.length > 0 && (
            <ul className={styles.traitSuggestions}>
              {filteredTraits.map(t => (
                <li
                  key={t}
                  className={styles.traitSuggestion}
                  onMouseDown={e => { e.preventDefault(); addTrait(t, 'include'); }}
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Entity Type</span>
        <div className={styles.checkGroup}>
          {[{ value: 'npc', label: 'Creature' }, { value: 'hazard', label: 'Hazard' }].map(e => (
            <label key={e.value} className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={filters.entityTypes.includes(e.value)}
                onChange={ev => toggleEntityType(e.value, ev.target.checked)}
                disabled={disabled}
              />
              {e.label}
            </label>
          ))}
        </div>
      </div>

      {(!(filters.entityTypes.includes('hazard') && !filters.entityTypes.includes('npc')) || filters.creatureTypes.length > 0) && (
        <div className={styles.section}>
          <span className={styles.label}>Creature Type</span>
          <div className={styles.checkGroup}>
            {CREATURE_TYPES.map(t => (
              <label key={t} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={filters.creatureTypes.includes(t.toLowerCase())}
                  onChange={e => toggleCreatureType(t, e.target.checked)}
                  disabled={disabled}
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      )}

      {(filters.entityTypes.length === 0 || filters.entityTypes.includes('hazard') || filters.hazardTypes.length > 0) && (
        <div className={styles.section}>
          <span className={styles.label}>Hazard Type</span>
          <div className={styles.checkGroup}>
            {HAZARD_TYPES.map(h => (
              <label key={h.value} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={filters.hazardTypes.includes(h.value)}
                  onChange={e => toggleHazardType(h.value, e.target.checked)}
                  disabled={disabled}
                />
                {h.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <span className={styles.label}>Size</span>
        <div className={styles.checkGroup}>
          {SIZES.map(s => (
            <label key={s.value} className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={filters.sizes.includes(s.value)}
                onChange={e => toggleSize(s.value, e.target.checked)}
                disabled={disabled}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Rarity</span>
        <div className={styles.checkGroup}>
          {RARITIES.map(r => (
            <label key={r.value} className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={filters.rarities.includes(r.value)}
                onChange={e => toggleRarity(r.value, e.target.checked)}
                disabled={disabled}
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Source</span>
        <div className={styles.sourceTree}>
          {ERAS.map(era => {
            const eraPubsList = CATEGORIES.flatMap(cat => groups[era][cat]);
            if (eraPubsList.length === 0) return null;
            const eraState = checkState(eraPubsList, filters.publications);
            const isEraCollapsed = collapsedEras.has(era);

            return (
              <div key={era} className={styles.eraSection}>
                <div className={styles.eraHeader}>
                  <button
                    className={styles.collapseBtn}
                    onClick={() => toggleCollapseEra(era)}
                    aria-label={isEraCollapsed ? `Expand ${ERA_LABELS[era]}` : `Collapse ${ERA_LABELS[era]}`}
                    disabled={disabled}
                    type="button"
                  >
                    {isEraCollapsed ? '▸' : '▾'}
                  </button>
                  <label className={styles.eraLabel}>
                    <TristateCheckbox
                      state={eraState}
                      onChange={checked => toggleEra(era, checked)}
                      disabled={disabled}
                      aria-label={ERA_LABELS[era]}
                    />
                    {ERA_LABELS[era]}
                  </label>
                </div>

                {!isEraCollapsed && (
                  <div className={styles.eraBody}>
                    {CATEGORIES.map(cat => {
                      const catPubs = groups[era][cat];
                      if (catPubs.length === 0) return null;
                      const catState = checkState(catPubs, filters.publications);
                      const catKey = `${era}/${cat}`;
                      const isCatCollapsed = collapsedCategories.has(catKey);

                      return (
                        <div key={cat} className={styles.categorySection}>
                          <div className={styles.categoryHeader}>
                            <button
                              className={styles.collapseBtn}
                              onClick={() => toggleCollapseCategory(catKey)}
                              aria-label={isCatCollapsed ? `Expand ${CATEGORY_LABELS[cat]}` : `Collapse ${CATEGORY_LABELS[cat]}`}
                              disabled={disabled}
                              type="button"
                            >
                              {isCatCollapsed ? '▸' : '▾'}
                            </button>
                            <label className={styles.categoryLabel}>
                              <TristateCheckbox
                                state={catState}
                                onChange={checked => toggleCategory(era, cat, checked)}
                                disabled={disabled}
                                aria-label={CATEGORY_LABELS[cat]}
                              />
                              {CATEGORY_LABELS[cat]}
                            </label>
                          </div>

                          {!isCatCollapsed && (
                            <div className={styles.publicationItems}>
                              {catPubs.map(p => (
                                <label key={p.name} className={styles.checkLabel}>
                                  <input
                                    type="checkbox"
                                    checked={filters.publications.includes(p.name)}
                                    onChange={e => togglePublication(p.name, e.target.checked)}
                                    disabled={disabled}
                                  />
                                  {publicationDisplayName(p.name)}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        className={styles.clearBtn}
        onClick={() =>
          onChange({
            name: '',
            traits: [],
            excludeTraits: [],
            levelMin: -1,
            levelMax: 25,
            entityTypes: [],
            creatureTypes: [],
            hazardTypes: [],
            sizes: [],
            rarities: [],
            publications: [],
            sortBy: filters.sortBy,
            sortDir: filters.sortDir,
          })
        }
        disabled={disabled}
      >
        Clear filters
      </button>
    </aside>
  );
}

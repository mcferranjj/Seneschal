import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { CharacterBackgroundRef, BackgroundRecord } from '../../../../db/schema';
import { useBackgroundData } from '../../hooks/useBackgroundData';
import { PickerLayout } from '../shared/PickerLayout';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import { FoundryHtml } from '../shared/FoundryHtml';
import { RARITY_ORDER } from '../shared/groupByRarity';
import { useColumnResize } from '../shared/useColumnResize';
import { useTableFilters } from '../shared/useTableFilters';
import { OFFICIAL_SKILLS } from '../../../../data/pf2eConstants';
import styles from './WizardStepBackground.module.css';

interface WizardStepBackgroundProps {
  selected: CharacterBackgroundRef | null;
  onSelect: (background: CharacterBackgroundRef | null) => void;
  onConfirm?: () => void;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ColKey = 'rarity' | 'name' | 'ability' | 'skill' | 'feat' | 'lore';

// ── Constants ─────────────────────────────────────────────────────────────────

const COLS: { key: ColKey; label: string; cls: string }[] = [
  { key: 'rarity',  label: 'Rarity',     cls: styles.thRarity },
  { key: 'name',    label: 'Name',        cls: styles.thName },
  { key: 'ability', label: 'Abilities',   cls: styles.thAbility },
  { key: 'skill',   label: 'Skill',       cls: styles.thSkill },
  { key: 'feat',    label: 'Skill Feat',  cls: styles.thFeat },
  { key: 'lore',    label: 'Lore',        cls: styles.thLore },
];

const RARITY_RANK: Record<string, number> = Object.fromEntries(
  RARITY_ORDER.map((r, i) => [r, i]),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getColValue(b: BackgroundRecord, col: ColKey): string {
  switch (col) {
    case 'rarity':  return b.rarity.charAt(0).toUpperCase() + b.rarity.slice(1);
    case 'name':    return b.name;
    case 'ability': return formatBoosts(b);
    case 'skill':   return b.trainedSkills.join(', ') || '—';
    case 'feat':    return b.grantedFeat?.name ?? '—';
    case 'lore':    return b.trainedLoreSkills.join(', ') || '—';
  }
}

function formatBoosts(b: BackgroundRecord): string {
  const parts = b.boostOptions.map(opt =>
    opt.choices.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' or '),
  );
  return parts.join(', ') || '—';
}

function sortAndFilter(
  items: BackgroundRecord[],
  sort: { col: ColKey; dir: 'asc' | 'desc' },
  checkFilters: Partial<Record<ColKey, Set<string>>>,
  checkModes: Partial<Record<ColKey, 'or' | 'and'>>,
  textFilters: Partial<Record<ColKey, string>>,
): BackgroundRecord[] {
  let result = items;

  // Checkbox filters
  for (const [col, allowed] of Object.entries(checkFilters) as [ColKey, Set<string>][]) {
    if (!allowed || allowed.size === 0) continue;
    const mode   = checkModes[col] ?? 'or';
    const values = [...allowed];
    result = result.filter(b => {
      const val = getColValue(b, col).toLowerCase();
      return mode === 'and'
        ? values.every(a  => val.includes(a.toLowerCase()))
        : values.some(a   => val.includes(a.toLowerCase()));
    });
  }

  // Text filters: always substring match
  for (const [col, text] of Object.entries(textFilters) as [ColKey, string][]) {
    const q = text.trim().toLowerCase();
    if (!q) continue;
    result = result.filter(b => getColValue(b, col).toLowerCase().includes(q));
  }

  // Sort
  result = [...result].sort((a, b) => {
    const ra = RARITY_RANK[a.rarity] ?? 99;
    const rb = RARITY_RANK[b.rarity] ?? 99;

    if (sort.col === 'rarity') {
      if (ra !== rb) return sort.dir === 'asc' ? ra - rb : rb - ra;
      return a.name.localeCompare(b.name);
    }

    if (sort.col === 'name') {
      if (ra !== rb) return ra - rb;
      const cmp = a.name.localeCompare(b.name);
      return sort.dir === 'asc' ? cmp : -cmp;
    }

    const va  = getColValue(a, sort.col);
    const vb  = getColValue(b, sort.col);
    const cmp = va.localeCompare(vb);
    if (cmp !== 0) return sort.dir === 'asc' ? cmp : -cmp;
    if (ra  !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });

  return result;
}

/**
 * Filterable values for a column, optionally narrowed by a search string.
 *
 * - rarity: fixed canonical order
 * - skill:  fixed canonical PF2e skill list
 * - ability: exploded from compound strings ("Strength or Intelligence" → individual entries)
 * - lore:   exploded on commas
 * - others: unique values found in the data
 */
function uniqueValues(items: BackgroundRecord[], col: ColKey, search: string): string[] {
  let values: string[];

  if (col === 'rarity') {
    values = RARITY_ORDER.map(r => r.charAt(0).toUpperCase() + r.slice(1));
  } else if (col === 'skill') {
    values = [...OFFICIAL_SKILLS];
  } else {
    const set = new Set<string>();
    for (const b of items) {
      const raw = getColValue(b, col);
      if (col === 'ability') {
        for (const part of raw.split(/,\s*|\s+or\s+/i)) {
          const t = part.trim();
          if (t && t !== '—') set.add(t);
        }
      } else if (col === 'lore') {
        for (const part of raw.split(/,\s*/)) {
          const t = part.trim();
          if (t && t !== '—') set.add(t);
        }
      } else {
        if (raw !== '—') set.add(raw);
      }
    }
    values = [...set].sort((a, b) => a.localeCompare(b));
  }

  const q = search.trim().toLowerCase();
  return q ? values.filter(v => v.toLowerCase().includes(q)) : values;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WizardStepBackground({ selected, onSelect, onConfirm }: WizardStepBackgroundProps) {
  const { backgrounds, loading } = useBackgroundData();

  const {
    sort, checkFilters, checkModes, textFilters, hasAnyFilter,
    handleHeaderClick, toggleCheckValue, setCheckMode,
    setTextFilter, clearColumnFilter, clearAllFilters,
  } = useTableFilters<ColKey>({ col: 'rarity', dir: 'asc' });

  const { tableRef, colWidths, startResize } = useColumnResize(COLS.length);

  // ── Dropdown state ─────────────────────────────────────────────────────────
  const [dropdown, setDropdown] = useState<{
    col: ColKey;
    x: number;
    y: number;
    listSearch: string;
  } | null>(null);
  const dropdownRef    = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the text input when a dropdown opens
  useEffect(() => {
    if (dropdown) requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [dropdown?.col]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdown) return;
    function onPointerDown(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(null);
      }
    }
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, [dropdown]);

  const handleHeaderRightClick = useCallback((e: React.MouseEvent, col: ColKey) => {
    e.preventDefault();
    setDropdown(prev =>
      prev?.col === col
        ? null
        : { col, x: e.clientX, y: e.clientY, listSearch: '' },
    );
  }, []);

  const handleSortClick = useCallback((col: ColKey) => {
    setDropdown(null);
    handleHeaderClick(col);
  }, [handleHeaderClick]);

  function selectBackground(b: BackgroundRecord) {
    const slug = b.slug ?? b.name.toLowerCase().replace(/\s+/g, '-');
    onSelect({
      id: b.id,
      name: b.name,
      slug,
      boostOptions: b.boostOptions.map(opt => opt.choices),
      freeBoostCount: b.freeBoostCount,
      trainedSkills: b.trainedSkills,
      trainedLoreSkills: b.trainedLoreSkills,
      grantedFeatId: b.grantedFeat?.uuid ?? null,
      grantedFeatName: b.grantedFeat?.name ?? null,
    });
  }

  const rows = sortAndFilter(backgrounds, sort, checkFilters, checkModes, textFilters);

  const selectedRecord = selected
    ? backgrounds.find(b => b.id === selected.id) ?? null
    : null;

  const dropdownValues        = dropdown ? uniqueValues(backgrounds, dropdown.col, dropdown.listSearch) : [];
  const dropdownCheckedCount  = dropdown ? (checkFilters[dropdown.col]?.size ?? 0) : 0;
  const dropdownMode          = dropdown ? (checkModes[dropdown.col] ?? 'or') : 'or';
  const dropdownHasActive     = dropdown
    ? dropdownCheckedCount > 0 || !!(textFilters[dropdown.col]?.trim())
    : false;

  const detailContent = selectedRecord && (
    <DetailPanel name={selectedRecord.name} className={styles.detailPanel}>
      {selectedRecord.description && (
        <FoundryHtml html={selectedRecord.description} />
      )}
      <DetailSection label="Trained Skills">
        <div className={styles.skillList}>
          {selectedRecord.trainedSkills.map(s => (
            <span key={s} className={styles.skillBadge}>{s}</span>
          ))}
          {selectedRecord.trainedLoreSkills.map(s => (
            <span key={s} className={`${styles.skillBadge} ${styles.loreBadge}`}>{s}</span>
          ))}
        </div>
      </DetailSection>
      <DetailSection label="Ability Boosts">
        <div className={styles.boostList}>
          {selectedRecord.boostOptions.map((opt, i) => (
            <span key={i} className={styles.boostOpt}>
              {opt.choices.map(k => k.toUpperCase()).join(' or ')}
            </span>
          ))}
        </div>
      </DetailSection>
      {selectedRecord.grantedFeat && (
        <DetailSection label="Granted Feat">
          <span className={styles.grantedFeat}>{selectedRecord.grantedFeat.name}</span>
        </DetailSection>
      )}
      {selectedRecord.publication && (
        <DetailSection label="Source">
          <div className={styles.source}>{selectedRecord.publication}</div>
        </DetailSection>
      )}
    </DetailPanel>
  );

  return (
    <>
      <PickerLayout
        title="Choose Background"
        sub="Your background describes your life before adventuring."
        loading={loading}
        detail={detailContent}
        suppressSearch
        suppressListScroll
      >
        {hasAnyFilter && (
          <div className={styles.filterBar}>
            <span className={styles.filterBarLabel}>Filters:</span>
            {COLS.flatMap(c => {
              const checks = checkFilters[c.key];
              const mode   = checkModes[c.key] ?? 'or';
              const text   = textFilters[c.key]?.trim();
              const chips: React.ReactNode[] = [];

              if (checks?.size) {
                [...checks].forEach((val, i) => {
                  if (i > 0) {
                    chips.push(
                      <span key={`${c.key}-sep-${i}`} className={styles.filterModeBadge}>
                        {mode.toUpperCase()}
                      </span>,
                    );
                  }
                  chips.push(
                    <span key={`${c.key}-check-${val}`} className={styles.filterChip}>
                      <span className={styles.filterChipCol}>{c.label}:</span>
                      <span className={styles.filterChipVal}>{val}</span>
                      <button
                        type="button"
                        className={styles.filterChipClear}
                        onClick={() => toggleCheckValue(c.key, val)}
                        aria-label={`Remove ${val} filter`}
                      >×</button>
                    </span>,
                  );
                });
              }

              if (text) {
                chips.push(
                  <span key={`${c.key}-text`} className={`${styles.filterChip} ${styles.filterChipText}`}>
                    <span className={styles.filterChipCol}>{c.label}:</span>
                    <span className={styles.filterChipVal}>"{text}"</span>
                    <button
                      type="button"
                      className={styles.filterChipClear}
                      onClick={() => setTextFilter(c.key, '')}
                      aria-label={`Remove ${c.label} text filter`}
                    >×</button>
                  </span>,
                );
              }

              return chips;
            })}
            <button type="button" className={styles.filterClearAll} onClick={clearAllFilters}>
              Clear all
            </button>
          </div>
        )}

        <table
          ref={tableRef}
          className={styles.table}
          style={colWidths.length > 0 ? { tableLayout: 'fixed' } : undefined}
        >
          {colWidths.length > 0 && (
            <colgroup>
              {COLS.map((_, i) => (
                <col key={i} style={{ width: colWidths[i] }} />
              ))}
            </colgroup>
          )}
          <thead>
            <tr>
              {COLS.map(({ key, label, cls }, colIndex) => {
                const isSort    = sort.col === key;
                const hasFilter = !!(checkFilters[key]?.size) || !!(textFilters[key]?.trim());
                const isOpen    = dropdown?.col === key;
                const isLast    = colIndex === COLS.length - 1;
                return (
                  <th
                    key={key}
                    className={[
                      colWidths.length === 0 ? cls : '',
                      isSort    ? styles.thSorted   : '',
                      hasFilter ? styles.thFiltered : '',
                      isOpen    ? styles.thOpen     : '',
                    ].join(' ')}
                    onClick={() => handleSortClick(key)}
                    onContextMenu={e => handleHeaderRightClick(e, key)}
                    title="Click to sort · Right-click to filter"
                  >
                    <span className={styles.thInner}>
                      <span className={styles.thLabel}>{label}</span>
                      <span className={styles.thIcons}>
                        {hasFilter && <span className={styles.filterIcon}>▼</span>}
                        {isSort && <span className={styles.sortArrow}>{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                      </span>
                    </span>
                    {!isLast && (
                      <span
                        className={styles.resizeHandle}
                        onPointerDown={e => startResize(e, colIndex)}
                        onClick={e => e.stopPropagation()}
                        title="Drag to resize"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(b => {
              const isSel = selected?.id === b.id;
              return (
                <tr
                  key={b.id}
                  className={`${styles.row} ${isSel ? styles.rowSelected : ''}`}
                  onClick={() => selectBackground(b)}
                  onDoubleClick={e => { e.preventDefault(); selectBackground(b); onConfirm?.(); }}
                >
                  <td className={`${styles.tdRarity} ${styles[`rarity_${b.rarity}`]}`}>
                    {b.rarity.charAt(0).toUpperCase() + b.rarity.slice(1)}
                  </td>
                  <td className={styles.tdName}>{b.name}</td>
                  <td>{formatBoosts(b)}</td>
                  <td>{b.trainedSkills.join(', ') || '—'}</td>
                  <td>{b.grantedFeat?.name ?? '—'}</td>
                  <td>{b.trainedLoreSkills.join(', ') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {selected && rows.some(b => b.id === selected.id) && onConfirm && (
          <div className={styles.confirmRow}>
            <button type="button" className={styles.confirmBtn} onClick={() => onConfirm()}>
              Select {selectedRecord?.name}
            </button>
          </div>
        )}
      </PickerLayout>

      {dropdown && (
        <div
          ref={dropdownRef}
          className={styles.dropdown}
          style={{ left: dropdown.x, top: dropdown.y }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className={styles.dropdownHeader}>
            Filter: {COLS.find(c => c.key === dropdown.col)?.label}
          </div>

          <div className={styles.dropdownTextRow}>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.dropdownTextInput}
              placeholder="Type to search…"
              value={textFilters[dropdown.col] ?? ''}
              onChange={e => setTextFilter(dropdown.col, e.target.value)}
            />
            {textFilters[dropdown.col] && (
              <button
                type="button"
                className={styles.dropdownTextClear}
                onClick={() => setTextFilter(dropdown.col, '')}
                aria-label="Clear text filter"
              >×</button>
            )}
          </div>

          <div className={styles.dropdownDivider} />

          {dropdownCheckedCount >= 2 && (
            <>
              <div className={styles.modeRow}>
                <span className={styles.modeLabel}>Match:</span>
                <div className={styles.modePills}>
                  <button
                    type="button"
                    className={`${styles.modePill} ${dropdownMode === 'or' ? styles.modePillActive : ''}`}
                    onClick={() => setCheckMode(dropdown.col, 'or')}
                  >Any (OR)</button>
                  <button
                    type="button"
                    className={`${styles.modePill} ${dropdownMode === 'and' ? styles.modePillActive : ''}`}
                    onClick={() => setCheckMode(dropdown.col, 'and')}
                  >All (AND)</button>
                </div>
              </div>
              <div className={styles.dropdownDivider} />
            </>
          )}

          <div className={styles.dropdownScroll}>
            {dropdownValues.length === 0 ? (
              <div className={styles.dropdownEmpty}>No matches</div>
            ) : (
              dropdownValues.map(val => {
                const checked = checkFilters[dropdown.col]?.has(val) ?? false;
                return (
                  <label key={val} className={styles.dropdownItem}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCheckValue(dropdown.col, val)}
                    />
                    <span>{val}</span>
                  </label>
                );
              })
            )}
          </div>

          {dropdownHasActive && (
            <button
              type="button"
              className={styles.dropdownClear}
              onClick={() => { clearColumnFilter(dropdown.col); setDropdown(null); }}
            >Clear filter</button>
          )}
        </div>
      )}
    </>
  );
}

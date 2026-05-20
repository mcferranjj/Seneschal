import { useEffect, useRef, useState } from 'react';
import type { CharacterAncestryRef, AncestryRecord } from '../../../../db/schema';
import { useAncestryData } from '../../hooks/useAncestryData';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { RaritySection } from '../shared/RaritySection';
import { groupByRarity, RARITY_ORDER } from '../shared/groupByRarity';
import { usePickerSearch } from '../shared/usePickerSearch';
import { useScrollSelectedIntoView } from '../shared/useScrollSelectedIntoView';
import { stripMechanicsSection } from '../../../../utils/foundryMacros';
import { SIZE_LABELS } from '../../../../data/pf2eConstants';
import { AncestryDetail } from './AncestryDetail';
import styles from './WizardStepAncestry.module.css';

interface WizardStepAncestryProps {
  selected: CharacterAncestryRef | null;
  onSelect: (ancestry: CharacterAncestryRef | null) => void;
  hideHeading?: boolean;
  suppressDetailPanel?: boolean;
  /** When true, only the selected ancestry card is rendered and its action becomes "Deselect". */
  confirmed?: boolean;
  /** Called when the user clicks "Select" on the currently highlighted card (or double-clicks). */
  onConfirm?: () => void;
  /** Called when the user clicks "Deselect" on the confirmed card. */
  onDeconfirm?: () => void;
}

export function WizardStepAncestry({
  selected, onSelect, hideHeading, suppressDetailPanel,
  confirmed = false, onConfirm, onDeconfirm,
}: WizardStepAncestryProps) {
  const { ancestries, loading } = useAncestryData();

  const { search, setSearch, filtered: filteredUnsorted } = usePickerSearch({
    items: ancestries,
    getName: a => a.name,
    getKeywords: a => a.traits,
  });
  const filtered = filteredUnsorted
    .slice()
    .sort((a, b) => {
      const rarityDiff =
        RARITY_ORDER.indexOf(a.rarity as typeof RARITY_ORDER[number]) -
        RARITY_ORDER.indexOf(b.rarity as typeof RARITY_ORDER[number]);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name);
    });
  // Keep every ancestry mounted regardless of `confirmed` so the non-selected
  // cards can animate (fade + collapse) instead of vanishing instantly.
  const groupedByRarity = groupByRarity(filtered);

  // Briefly mark the grid as "deconfirming" right after the user deselects so
  // we can run a one-shot reverse animation on the cards (a small fade/scale
  // entry) while they expand back out from zero-size to their natural size.
  const [deconfirming, setDeconfirming] = useState(false);
  const prevConfirmedRef = useRef(confirmed);
  useEffect(() => {
    const wasConfirmed = prevConfirmedRef.current;
    prevConfirmedRef.current = confirmed;
    if (wasConfirmed && !confirmed) {
      setDeconfirming(true);
      const t = setTimeout(() => setDeconfirming(false), 360);
      return () => clearTimeout(t);
    }
  }, [confirmed]);

  // Scroll the selected card to the top of the picker's scroll container
  // whenever the user confirms or deselects. See useScrollSelectedIntoView
  // for the rAF-driven re-target logic that keeps the scroll aligned with
  // the in-progress collapse/expand animation.
  const selectedCardRef = useRef<HTMLDivElement | null>(null);
  useScrollSelectedIntoView(selectedCardRef, confirmed);

  function selectAncestry(a: AncestryRecord) {
    onSelect({
      id: a.id,
      name: a.name,
      slug: a.slug,
      hp: a.hp,
      speed: a.speed,
      size: a.size,
      vision: a.vision,
      traits: a.traits,
      languages: a.languages,
      fixedBoosts: a.boosts.fixed,
      freeBoostCount: a.boosts.freeCount,
      flaw: a.boosts.flaw,
    });
  }

  const selectedRecord = selected
    ? ancestries.find(a => a.id === selected.id) ?? null
    : null;

  const detailContent = selectedRecord && (
    <AncestryDetail
      record={selectedRecord}
      descriptionTransform={stripMechanicsSection}
    />
  );

  return (
    <PickerLayout
      title={hideHeading ? undefined : 'Choose Ancestry'}
      sub={hideHeading ? undefined : 'Your ancestry determines your heritage options and some ability adjustments.'}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search ancestries…"
      loading={loading}
      emptyMessage={
        !loading && ancestries.length === 0
          ? 'No ancestry data found. Use the "Sync Now" banner above to download character builder data.'
          : undefined
      }
      detail={detailContent}
      suppressDetailPanel={suppressDetailPanel}
    >
      {groupedByRarity.map(({ rarity, items }) => {
        const containsSelected = confirmed && selected
          ? items.some(a => a.id === selected.id)
          : false;
        return (
          <RaritySection
            key={rarity}
            rarity={rarity}
            hideHeader={confirmed && !containsSelected}
          >
            <div className={`${styles.grid} ${confirmed ? styles.gridConfirmed : ''} ${deconfirming ? styles.gridDeconfirming : ''}`}>
              {items.map(a => {
                const isSelected = selected?.id === a.id;
                // Show the Select/Deselect button only on the highlighted
                // card. While confirmed, only the chosen card is visible at
                // all, and its button becomes Deselect.
                const action = isSelected
                  ? confirmed
                    ? { label: 'Deselect', onClick: () => onDeconfirm?.(), variant: 'secondary' as const }
                    : onConfirm
                      ? { label: 'Select', onClick: () => onConfirm(), variant: 'primary' as const }
                      : undefined
                  : undefined;
                return (
                  <EntityCard
                    key={a.id}
                    name={a.name}
                    selected={isSelected}
                    stats={
                      <>
                        <span>HP {a.hp}</span>
                        <span>Speed {a.speed}</span>
                        <span>{SIZE_LABELS[a.size] ?? a.size}</span>
                      </>
                    }
                    traits={a.traits}
                    onClick={() => selectAncestry(a)}
                    onDoubleClick={() => {
                      // Double-click toggles: if this ancestry is already
                      // confirmed, deselect it; otherwise select+confirm it.
                      if (confirmed && isSelected) {
                        onDeconfirm?.();
                      } else {
                        selectAncestry(a);
                        onConfirm?.();
                      }
                    }}
                    action={action}
                    collapsed={confirmed && !isSelected}
                    domRef={isSelected ? selectedCardRef : undefined}
                  />
                );
              })}
            </div>
          </RaritySection>
        );
      })}
    </PickerLayout>
  );
}

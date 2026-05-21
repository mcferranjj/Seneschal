
import { useState, useCallback, useEffect } from 'react';
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature } from '../../types/pf2e';
import type { RollHistoryEntry } from '../../types/diceHistory';
import type { Condition, CustomSpellcastingEntry } from '../../types/encounter';
import { computePenalties } from '../../utils/conditionEffects';
import { DiceRoller, MultiDamageRoller } from '../dice/DiceRoller';
import { ManualRollInput } from '../dice/ManualRollInput';
import { CustomCreatureWizard } from '../custom-creature/CustomCreatureWizard';
import {
  getLevel,
  getSize,
  getLanguages,
  formatMod,
  getSkills,
  getSenses,
  getSpeedString,
  getSpeedStringWithPenalty,
  getImmResWeak,
  getAttacks,
  getActions,
  getPassives,
  getHazardDetails,
  applyEliteWeakToHtml,
  processFoundryHtml,
  getSneakAttackDamage,
  withSneakAttack,
} from './statblockHelpers';
import { getRecallKnowledge } from '../encounter/EncounterManager';
import { importSpellcasting } from '../../utils/importCreature';
import { buildScaledCreature, buildScaledHazard, scaleAbilityHtml, scaleHazardHtml, eliteWeakHpDelta, eliteWeakLevel } from '../../utils/levelScaling';
import type { ScaledCreatureStats, ScaledHazardStats } from '../../utils/levelScaling';
import { useRollState } from '../../hooks/useRollState';
import { AttackBlock } from './AttackBlock';
import { AttackLine } from './AttackLine';
import { ItemBlock } from './ItemBlock';
import { CustomAbilityBlock } from './CustomAbilityBlock';
import { SpellcastingBlock } from './SpellcastingBlock';
import { TraitChip } from './TraitChip';
import { NotesPanel } from './NotesPanel';
import { useContainerTraitTooltip } from '../../hooks/useContainerTraitTooltip';
import { TraitHoverPopup, TraitPinnedPopup } from './TraitPopup';
import { getAonUrl } from '../../utils/aonSearch';
import styles from './StatblockDrawer.module.css';

function skillDisplayName(raw: string): string {
  return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface DrawerProps {
  creature: CreatureRecord | null;
  onClose: () => void;
  onAddToEncounter: (creature: CreatureRecord, scaledLevel?: number) => void;
  wizardOpen?: boolean;
  /** If set, the wizard opens in edit mode for this creature */
  wizardEditCreature?: CreatureRecord;
  partyLevel?: number;
  onWizardSave?: (creature: CreatureRecord) => void;
  onWizardCancel?: () => void;
  onDeleteCreature?: (id: string) => void;
  onEditCreature?: (creature: CreatureRecord) => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
  /** Active conditions on the currently-selected creature in the encounter */
  activeConditions?: Condition[];
  /** Elite/Weak adjustment applied to this creature instance in the encounter */
  activeEliteWeak?: 'elite' | 'weak';
  /** Custom level scaling applied to this creature instance in the encounter */
  activeScaledLevel?: number;
  /** Callback to set or clear custom level scaling on the current encounter instance */
  onSetScaledLevel?: (level: number | undefined) => void;
  onCopyAsCustom?: (creature: CreatureRecord) => void;
  /** Custom name given to this encounter creature instance (may differ from the creature's canonical name) */
  encounterName?: string;
  /** GM notes for the currently-selected encounter creature instance */
  activeNotes?: string;
  /** Callback to persist note changes for the current encounter instance */
  onSetNotes?: (notes: string) => void;
  /** UID of the currently-selected encounter creature instance (used to key notes state) */
  encounterUid?: string;
}

export function StatblockDrawer({
  creature,
  onClose,
  onAddToEncounter,
  wizardOpen,
  wizardEditCreature,
  partyLevel = 1,
  onWizardSave,
  onWizardCancel,
  onDeleteCreature,
  onEditCreature,
  onRoll,
  activeConditions,
  activeEliteWeak,
  activeScaledLevel,
  onSetScaledLevel,
  onCopyAsCustom,
  encounterName,
  activeNotes,
  onSetNotes,
  encounterUid,
}: DrawerProps) {
  return (
    <aside className={styles.drawer} aria-label="Creature statblock">
      {wizardOpen ? (
        <CustomCreatureWizard
          partyLevel={partyLevel}
          onSave={onWizardSave ?? (() => {})}
          onCancel={onWizardCancel ?? (() => {})}
          editCreature={wizardEditCreature}
        />
      ) : creature ? (
        <StatblockContent
          creature={creature}
          onClose={onClose}
          onAddToEncounter={(c, scaledLevel) => onAddToEncounter(c, scaledLevel)}
          onRoll={onRoll}
          activeConditions={activeConditions}
          activeEliteWeak={activeEliteWeak}
          activeScaledLevel={activeScaledLevel}
          onSetScaledLevel={onSetScaledLevel}
          onDelete={onDeleteCreature}
          onEdit={onEditCreature}
          onCopyAsCustom={onCopyAsCustom}
          encounterName={encounterName}
          activeNotes={activeNotes}
          onSetNotes={onSetNotes}
          encounterUid={encounterUid}
        />
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚔</span>
          <span className={styles.emptyTitle}>Select a creature</span>
          <span className={styles.emptyHint}>Click any result to view its statblock</span>
        </div>
      )}
    </aside>
  );
}

function StatblockContent({
  creature,
  onClose,
  onAddToEncounter,
  onRoll,
  activeConditions,
  activeEliteWeak,
  activeScaledLevel,
  onSetScaledLevel,
  onDelete,
  onEdit,
  onCopyAsCustom,
  encounterName,
  activeNotes,
  onSetNotes,
  encounterUid,
}: {
  creature: CreatureRecord;
  onClose: () => void;
  onAddToEncounter: (creature: CreatureRecord, scaledLevel?: number) => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
  activeConditions?: Condition[];
  activeEliteWeak?: 'elite' | 'weak';
  activeScaledLevel?: number;
  onSetScaledLevel?: (level: number | undefined) => void;
  onDelete?: (id: string) => void;
  onEdit?: (creature: CreatureRecord) => void;
  onCopyAsCustom?: (creature: CreatureRecord) => void;
  encounterName?: string;
  activeNotes?: string;
  onSetNotes?: (notes: string) => void;
  encounterUid?: string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scaleDropdownOpen, setScaleDropdownOpen] = useState(false);
  // Local preview level — used when onSetScaledLevel is not provided (not in encounter yet)
  const [previewScaledLevel, setPreviewScaledLevel] = useState<number | undefined>(undefined);
  const [sneakAttackActive, setSneakAttackActive] = useState(false);

  // Notes panel open/closed state — owned here so the header button can toggle it
  const [notesOpen, setNotesOpen] = useState(() => !!(activeNotes));

  // Trait popups inside flavour / description prose are distracting — the
  // dedicated trait chip row already exposes that information. Ability and
  // item descriptions, however, keep popups so condition/skill keywords
  // remain explorable (e.g. clicking "frightened" shows the condition text).
  const descriptionPopupsEnabled = false;
  const abilityPopupsEnabled = true;

  // Wrappers for the two contexts. Description text strips .pf2kw spans
  // entirely; ability text keeps them so the listener can pop tooltips.
  const descriptionHtml = (raw: string) =>
    processFoundryHtml(raw, { interactive: descriptionPopupsEnabled });
  const abilityHtml = (raw: string) =>
    processFoundryHtml(raw, { interactive: abilityPopupsEnabled });

  const {
    containerRef: pf2kwRef,
    popupRef:     pf2kwPopupRef,
    hover:        pf2kwHover,
    pinned:       pf2kwPinned,
    closePin:     pf2kwClosePin,
  } = useContainerTraitTooltip({ enabled: abilityPopupsEnabled });

  const {
    diceRoll, multiDamageRoll, manualRoll,
    clearRolls,
    roll, rollAttack, rollDamage, rollExpr,
    manualRoll1d20, manualRollExpr, manualRollAttack, manualRollDamage,
    setCreatureName,
  } = useRollState();

  const handleBodyClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('pf2roll')) {
      const expr = target.dataset.expr ?? '';
      const label = target.dataset.label ?? undefined;
      if (expr) rollExpr(expr, label, e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBodyContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Suppress the browser context menu for any rollable element (use closest() to
    // handle clicks on child nodes like <strong> inside the span).
    const rollMod = target.closest(`.${styles.rollMod}, .${styles.mapRoll}, .pf2roll`);
    if (rollMod) {
      e.preventDefault();
      if (rollMod.classList.contains('pf2roll')) {
        const expr = (rollMod as HTMLElement).dataset.expr ?? '';
        const label = (rollMod as HTMLElement).dataset.label ?? undefined;
        if (expr) manualRollExpr(expr, label, e);
      }
      // For .rollMod / .mapRoll the individual onContextMenu on each span handles the action
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualRollExpr]);

  // Close scale dropdown on outside click
  useEffect(() => {
    if (!scaleDropdownOpen) return;
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.' + styles.scaleWrap)) {
        setScaleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [scaleDropdownOpen]);

  const activeConditionList = activeConditions ?? [];
  const pen = computePenalties(activeConditionList);
  const debuffStyle = { color: '#c0392b', fontWeight: 700 } as const;

  // Elite/Weak adjustment modifiers
  const ewMod = activeEliteWeak === 'elite' ? 2 : activeEliteWeak === 'weak' ? -2 : 0;
  const ewStyle = ewMod > 0
    ? { color: '#8a6a18', fontWeight: 700 } as const
    : ewMod < 0
      ? { color: '#2a5a8a', fontWeight: 700 } as const
      : undefined;

  const c = creature.data as PF2ECreature;

  // Keep the roll state hook aware of which creature's statblock is open
  useEffect(() => {
    setCreatureName(c.name);
  }, [c.name, setCreatureName]);

  // Clear local preview scaling and sneak attack toggle when the creature changes
  useEffect(() => {
    setPreviewScaledLevel(undefined);
    setSneakAttackActive(false);
  }, [creature.id]);

  // Reset notesOpen when the creature changes — open automatically if notes exist
  useEffect(() => {
    setNotesOpen(!!(activeNotes));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creature.id]);

  const level = getLevel(c);

  const size = getSize(c);
  const rarity = c.system?.traits?.rarity ?? 'common';
  const traits = c.system?.traits?.value ?? [];
  const isHazard = creature.entityType === 'hazard';
  const hazard = isHazard ? getHazardDetails(c) : null;

  // Effective scaled level: prefer the encounter-bound prop, fall back to local preview
  const effectiveScaledLevel = activeScaledLevel ?? previewScaledLevel;

  // Compute scaled stats (separate paths for creatures vs hazards)
  const scaledCreatureStats: ScaledCreatureStats | null =
    !isHazard && effectiveScaledLevel != null ? buildScaledCreature(creature, effectiveScaledLevel) : null;
  const scaledHazardStats: ScaledHazardStats | null =
    isHazard && effectiveScaledLevel != null ? buildScaledHazard(creature, effectiveScaledLevel) : null;
  // Unified creature-side reference
  const scaledStats = scaledCreatureStats;
  const allTraits = [
    ...(rarity !== 'common' ? [rarity] : []),
    ...(!isHazard ? [size] : []),
    ...traits,
    // Inject synthetic 'complex' trait so it displays in the traits row and is filterable
    ...(hazard?.isComplex && !traits.includes('complex') ? ['complex'] : []),
  ];

  // Get URL
  // Only works for hazards and creatures right now. If needs to expand, needs to become a switch.
  const aonType = creature.entityType === 'hazard' ? 'Hazard' : 'Creature';
  const [aonURL, setAonURL] = useState<string | null>(null);
  useEffect(() => {
    getAonUrl({ name: c.name, type: aonType }).then(url => {
      if (url) setAonURL(url);
    });
  }, [c.name, c.type]);

  const ac = scaledStats ? scaledStats.ac
    : scaledHazardStats?.ac != null ? scaledHazardStats.ac
    : (c.system?.attributes?.ac?.value ?? '—');
  const acDetail = (scaledStats || scaledHazardStats) ? undefined : c.system?.attributes?.ac?.details;
  const hp = scaledStats ? scaledStats.hp
    : scaledHazardStats?.hp != null ? scaledHazardStats.hp
    : (c.system?.attributes?.hp?.max ?? '—');
  const hpDetail = (scaledStats || scaledHazardStats) ? undefined : c.system?.attributes?.hp?.details;
  const allSaves = c.system?.attributes?.allSaves?.value;

  const fort = scaledStats ? scaledStats.fort
    : scaledHazardStats?.fort != null ? scaledHazardStats.fort
    : c.system?.saves?.fortitude?.value;
  const ref  = scaledStats ? scaledStats.ref
    : scaledHazardStats?.ref != null ? scaledHazardStats.ref
    : c.system?.saves?.reflex?.value;
  const will = scaledStats ? scaledStats.will
    : scaledHazardStats?.will != null ? scaledHazardStats.will
    : c.system?.saves?.will?.value;
  const fortDetail = (scaledStats || scaledHazardStats) ? undefined : c.system?.saves?.fortitude?.saveDetail;
  const refDetail  = (scaledStats || scaledHazardStats) ? undefined : c.system?.saves?.reflex?.saveDetail;
  const willDetail = (scaledStats || scaledHazardStats) ? undefined : c.system?.saves?.will?.saveDetail;

  const str  = scaledStats ? scaledStats.str : c.system?.abilities?.str?.mod;
  const dex  = scaledStats ? scaledStats.dex : c.system?.abilities?.dex?.mod;
  const con  = scaledStats ? scaledStats.con : c.system?.abilities?.con?.mod;
  const int_ = scaledStats ? scaledStats.int : c.system?.abilities?.int?.mod;
  const wis  = scaledStats ? scaledStats.wis : c.system?.abilities?.wis?.mod;
  const cha  = scaledStats ? scaledStats.cha : c.system?.abilities?.cha?.mod;

  // Unified languages: custom creatures store them in customData; official creatures in the system blob
  const langs = creature.publication === 'Custom'
    ? (creature.customData?.languages ?? []).join(', ')
    : getLanguages(c);

  // Unified skills: custom creatures store them in customData; official creatures in the system blob.
  // Both shapes are normalized to { name: string; mod: number } for rendering.
  const rawSkills = scaledStats
    ? scaledStats.skills
    : creature.publication === 'Custom'
      ? (creature.customData?.skills ?? []).map(sk => ({ name: sk.name, mod: sk.mod }))
      : getSkills(c);
  const senses = getSenses(c);
  const rawImmResWeak = getImmResWeak(c);
  const immunities = rawImmResWeak.immunities;
  const activeScaledResistances = scaledStats?.resistances ?? scaledHazardStats?.resistances;
  const activeScaledWeaknesses = scaledStats?.weaknesses ?? scaledHazardStats?.weaknesses;
  const resistances = activeScaledResistances
    ? activeScaledResistances.map(r => `${r.type} ${r.value}${r.exceptions ? ` (except ${r.exceptions})` : ''}`).join(', ')
    : rawImmResWeak.resistances;
  const weaknesses = activeScaledWeaknesses
    ? activeScaledWeaknesses.map(w => `${w.type} ${w.value}${w.exceptions ? ` (except ${w.exceptions})` : ''}`).join(', ')
    : rawImmResWeak.weaknesses;

  // When scaling is active, attacks come from the scaled snapshot (not raw items)
  const attacks = (scaledStats || scaledHazardStats) ? [] : getAttacks(c);
  const allActions = getActions(c);
  const reactions = allActions.filter(i => i.system?.actionType?.value === 'reaction');
  const offenseActions = allActions.filter(i => i.system?.actionType?.value !== 'reaction');
  const passives = getPassives(c);

  // Unified spellcasting: for official creatures, convert items → CustomSpellcastingEntry[]
  // so both official and custom creatures use the same SpellcastingBlock component.
  const spellcastingEntries: CustomSpellcastingEntry[] =
    scaledStats ? scaledStats.spellcasting
    : scaledHazardStats ? scaledHazardStats.spellcasting
    : creature.publication === 'Custom'
      ? (creature.customData?.spellcasting ?? [])
      : importSpellcasting(creature);
  const publicNotes = c.system?.details?.publicNotes ?? '';
  const publication = c.system?.details?.publication?.title;

  // Sneak Attack detection
  const sneakAttackExpr = getSneakAttackDamage(creature);

  // Construct GitHub raw URL for creature image; skip generic default icons
  const imgPath = c.img;
  const isDefaultIcon = !imgPath || imgPath.includes('default-icons') || imgPath.endsWith('mystery-man.webp');
  const imageUrl = isDefaultIcon
    ? null
    : `https://raw.githubusercontent.com/foundryvtt/pf2e/v14-dev/static/${imgPath.replace('systems/pf2e/', '')}`;

  return (
    <div className={`${styles.content}${abilityPopupsEnabled ? ' pf2kwInteractive' : ''}`} ref={pf2kwRef} onClick={handleBodyClick} onContextMenu={handleBodyContextMenu}>
      {pf2kwHover && !pf2kwPinned && <TraitHoverPopup {...pf2kwHover} />}
      {pf2kwPinned && <TraitPinnedPopup {...pf2kwPinned} popupRef={pf2kwPopupRef} onClose={pf2kwClosePin} />}
      {/* Header */}
      {(() => {
        const hasCustomName = encounterName && encounterName !== c.name;
        const displayName = hasCustomName ? encounterName! : c.name;
        return (
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.creatureName}>
            {displayName}{activeEliteWeak === 'elite' ? ' (Elite)' : activeEliteWeak === 'weak' ? ' (Weak)' : ''}
            {effectiveScaledLevel != null && (
              <span className={styles.scaledBadge}> ⇅ Lv {effectiveScaledLevel}</span>
            )}
          </span>
          <span className={styles.creatureLevel}>
            {creature.entityType === 'hazard'
              ? (hazard?.isComplex ? 'Complex Hazard' : 'Simple Hazard')
              : 'Creature'}{' '}
            {effectiveScaledLevel != null
              ? activeEliteWeak ? eliteWeakLevel(effectiveScaledLevel, activeEliteWeak) : effectiveScaledLevel
              : activeEliteWeak ? eliteWeakLevel(level, activeEliteWeak) : level}
            {activeEliteWeak && ` (base ${effectiveScaledLevel ?? level})`}
            {effectiveScaledLevel != null && !activeEliteWeak && ` (base ${level})`}
            {creature.entityType !== 'hazard' && ` · ${size}`}
            {hasCustomName && (
              <span className={styles.creatureOriginalName}> · {c.name}</span>
            )}
          </span>
        </div>
        <div className={styles.headerActions}>
          {creature.publication !== 'Custom' && (
            <a
              className={styles.aonLink}
              href={aonURL ?? undefined}
              target="_blank"
              rel="noreferrer"
              title="View on Archives of Nethys"
            >
              AoN ↗
            </a>
          )}
          {creature.publication === 'Custom' && onEdit && (
            <button className={styles.editBtn} onClick={() => onEdit(creature)} title="Edit custom creature">
              ✎
            </button>
          )}
          {onCopyAsCustom && (
            <button className={styles.copyBtn} onClick={() => onCopyAsCustom(creature)} title="Copy and edit as custom creature">
              ⧉
            </button>
          )}
          {/* Notes toggle — only shown when an encounter creature is selected */}
          {onSetNotes && (
            <button
              className={`${styles.notesBtn} ${notesOpen ? styles.notesBtnActive : ''} ${activeNotes ? styles.notesBtnHasContent : ''}`}
              title={notesOpen ? 'Hide notes' : 'Add GM notes'}
              onClick={() => setNotesOpen(o => !o)}
            >
              📝
            </button>
          )}
          {/* Level scaling button — shown whenever the callback is available or as a preview */}
          <div className={styles.scaleWrap}>
            <button
              className={`${styles.scaleBtn} ${effectiveScaledLevel != null ? styles.scaleBtnActive : ''}`}
              title={isHazard ? 'Scale hazard to a different level' : 'Scale creature to a different level'}
              onClick={e => { e.stopPropagation(); setScaleDropdownOpen(o => !o); }}
            >
              ⇅
            </button>
            {scaleDropdownOpen && (
              <div className={styles.scaleDropdown}>
                <div className={styles.scaleDropdownHeader}>Scale to level</div>
                {effectiveScaledLevel != null && (
                  <button
                    className={styles.scaleDropdownRemove}
                    onClick={() => {
                      if (onSetScaledLevel) onSetScaledLevel(undefined);
                      else setPreviewScaledLevel(undefined);
                      setScaleDropdownOpen(false);
                    }}
                  >
                    ✕ Remove scaling
                  </button>
                )}
                <div className={styles.scaleDropdownList}>
                  {Array.from({ length: 27 }, (_, i) => i - 1).filter(l => l !== level).map(l => (
                    <button
                      key={l}
                      className={`${styles.scaleDropdownItem} ${effectiveScaledLevel === l ? styles.scaleDropdownItemActive : ''}`}
                      onClick={() => {
                        if (onSetScaledLevel) onSetScaledLevel(l);
                        else setPreviewScaledLevel(l);
                        setScaleDropdownOpen(false);
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close statblock">
            ✕
          </button>
        </div>
      </div>
        );
      })()}

      {/* Traits */}
      <div className={styles.traitsRow}>
        {allTraits.map(t => (
          <TraitChip key={t} trait={t} rarity={rarity} />
        ))}
      </div>

      {/* GM Notes panel — shown when notesOpen; state managed inside NotesPanel */}
      {onSetNotes && (
        <NotesPanel
          key={encounterUid}
          activeNotes={activeNotes ?? ''}
          onSetNotes={onSetNotes}
          open={notesOpen}
        />
      )}

      {imageUrl && (
        <div className={styles.imageContainer}>
          <img
            src={imageUrl}
            alt={c.name}
            className={styles.creatureImage}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className={styles.body}>
        {/* Recall Knowledge DC — top of body (creatures only, not hazards) */}
        {creature.entityType !== 'hazard' && (() => {
          // Use the effective level: scaled level if active, then elite/weak on top
          const effectiveLevel = effectiveScaledLevel != null
            ? (activeEliteWeak ? eliteWeakLevel(effectiveScaledLevel, activeEliteWeak) : effectiveScaledLevel)
            : (activeEliteWeak ? eliteWeakLevel(level, activeEliteWeak) : level);
          const rk = getRecallKnowledge(effectiveLevel, traits, rarity);
          return (
            <p className={styles.rkLine}>
              <span className={styles.rkLineLabel}>Recall Knowledge DC </span>
              <span
                className={styles.rkLineDc}
                style={(effectiveScaledLevel != null || activeEliteWeak) ? { color: '#2a7a6a', fontWeight: 700 } : undefined}
              >{rk.dc}</span>
              {rk.skills.length > 0 && (
                <span className={styles.rkLineSkills}> ({rk.skills.join(' / ')})</span>
              )}
            </p>
          );
        })()}

        {/* Level scaling banner */}
        {effectiveScaledLevel != null && (
          <p className={styles.eliteWeakBanner} style={{ borderColor: '#2a7a6a', background: 'rgba(42,122,106,0.08)' }}>
            <strong style={{ color: '#2a7a6a' }}>⇅ Scaled to Level {effectiveScaledLevel}</strong>
            {' '}
            <span style={{ color: 'var(--text-mute)' }}>
              All stats recalculated from base level {level}.
              {previewScaledLevel != null && !onSetScaledLevel && ' Preview only — "Add to Encounter" will include this scaling.'}
            </span>
          </p>
        )}

        {/* Elite/Weak adjustment banner */}
        {activeEliteWeak && (
          <p className={styles.eliteWeakBanner} style={activeEliteWeak === 'elite' ? { borderColor: '#8a6a18', background: 'rgba(138,106,24,0.08)' } : { borderColor: '#2a5a8a', background: 'rgba(42,90,138,0.08)' }}>
            <strong style={{ color: activeEliteWeak === 'elite' ? '#8a6a18' : '#2a5a8a' }}>
              {activeEliteWeak === 'elite' ? '★ Elite' : '▽ Weak'}
            </strong>
            {' '}
            <span style={{ color: 'var(--text-mute)' }}>
              {activeEliteWeak === 'elite'
                ? '+2 AC, saves, perception & skills · +2/+4 damage · +HP'
                : '−2 AC, saves, perception & skills · −2/−4 damage · −HP'}
            </span>
          </p>
        )}

        {/* Active conditions banner */}
        {activeConditions && activeConditions.length > 0 && (
          <p className={styles.sourceLine} style={{ color: '#c0392b', fontStyle: 'normal' }}>
            <strong>Conditions:</strong>{' '}
            {activeConditions.map(cond => `${cond.name}${cond.value != null ? ` ${cond.value}` : ''}`).join(', ')}
          </p>
        )}

        {/* Hazard description — shown before defenses for hazards */}
        {isHazard && hazard!.description && (
          <div
            className={styles.itemDesc}
            style={{ marginBottom: 6 }}
            dangerouslySetInnerHTML={{ __html: descriptionHtml(hazard!.description) }}
          />
        )}

        {/* Stealth (hazards) or Perception / Senses (creatures) */}
        {isHazard ? (
          hazard!.stealth != null && (() => {
            // Determine raw DC and modifier, normalising both official (+mod) and custom (DC) storage
            const customDC = creature.customData?.stealthDC;
            let rawDC: number | undefined;
            let rawMod: number | undefined;
            if (customDC != null) {
              rawDC = customDC; rawMod = customDC - 10;
            } else if (hazard!.stealth!.value != null) {
              rawMod = hazard!.stealth!.value; rawDC = rawMod + 10;
            }
            // Prefer scaled values when available
            const displayDC  = scaledHazardStats?.stealthDC  ?? rawDC;
            const displayMod = scaledHazardStats?.stealthMod ?? rawMod;
            const stealthStyle = scaledHazardStats ? { color: '#2a7a6a', fontWeight: 700 } as const : undefined;
            return (
              <p className={styles.infoLine}>
                <strong>Stealth</strong>{' '}
                {displayDC != null ? (
                  <span style={stealthStyle}>
                    DC {displayDC}{displayMod != null ? ` (+${displayMod})` : ''}
                  </span>
                ) : '—'}
                {hazard!.stealth!.details
                  ? <> <span dangerouslySetInnerHTML={{ __html: abilityHtml(hazard!.stealth!.details) }} /></>
                  : null}
              </p>
            );
          })()
        ) : (
          <p className={styles.infoLine}>
            {(() => {
              const percMod = scaledStats ? scaledStats.perception : (c.system?.perception?.mod ?? c.system?.perception?.value);
              const effPercMod = percMod != null ? percMod + pen.perception + ewMod : percMod;
              const rest = senses.replace(/^Perception [+-]?\d+;?\s*/, '').replace(/^Perception [+-]?\d+$/, '');
              const percStyle = pen.perception !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
              return (
                <>
                  <span
                    className={styles.rollMod}
                    title="Roll Perception (right-click to input)"
                    onClick={e => roll(effPercMod, 'Perception', e)}
                    onContextMenu={e => manualRoll1d20(effPercMod, 'Perception', e)}
                    style={percStyle}
                  >
                    <strong>Perception</strong> {formatMod(effPercMod)}
                  </span>
                  {rest ? `; ${rest}` : ''}
                </>
              );
            })()}
          </p>
        )}

        {/* Languages — creatures only */}
        {!isHazard && langs && (
          <p className={styles.infoLine}>
            <strong>Languages</strong> {langs}
          </p>
        )}

        {/* Skills — creatures only */}
        {!isHazard && rawSkills.length > 0 && (
          <p className={styles.infoLine}>
            <strong>Skills</strong>{' '}
            {rawSkills.map((s, i) => {
              const effSkillMod = s.mod + ewMod;
              const displayName = skillDisplayName(s.name);
              return (
                <span key={s.name + i}>
                  {i > 0 && ', '}
                  <span
                    className={styles.rollMod}
                    title={`Roll ${displayName} (right-click to input)`}
                    onClick={e => roll(effSkillMod, displayName, e)}
                    onContextMenu={e => manualRoll1d20(effSkillMod, displayName, e)}
                    style={ewMod !== 0 ? ewStyle : undefined}
                  >
                    {displayName} {formatMod(effSkillMod)}
                  </span>
                </span>
              );
            })}
          </p>
        )}

        {/* Ability scores — creatures only */}
        {!isHazard && (
          <p className={styles.abilityLine}>
            {([
              { label: 'Str', mod: str },
              { label: 'Dex', mod: dex },
              { label: 'Con', mod: con },
              { label: 'Int', mod: int_ },
              { label: 'Wis', mod: wis },
              { label: 'Cha', mod: cha },
            ] as const).map(({ label, mod }, i) => (
              <span key={label}>
                {i > 0 && ', '}
                <span
                  className={styles.rollMod}
                  title={`Roll ${label} check (right-click to input)`}
                  onClick={e => roll(mod, label, e)}
                  onContextMenu={e => manualRoll1d20(mod, label, e)}
                >
                  <strong>{label}</strong> {formatMod(mod)}
                </span>
              </span>
            ))}
          </p>
        )}

        <hr className={styles.divider} />

        {/* AC + Saves — suppressed for hazards with no physical component */}
        {(!isHazard || hazard!.hasHealth) && (() => {
          const effAc   = typeof ac === 'number'   ? ac   + pen.ac   + ewMod : ac;
          const effFort = fort != null ? fort + pen.fort + ewMod : fort;
          const effRef  = ref  != null ? ref  + pen.ref  + ewMod : ref;
          const effWill = will != null ? will + pen.will + ewMod : will;
          const acStyle   = pen.ac   !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
          const fortStyle = pen.fort !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
          const refStyle  = pen.ref  !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
          const willStyle = pen.will !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
          return (
            <p className={styles.defenseLine}>
              <strong>AC</strong>{' '}
              <span style={acStyle}>{effAc}</span>
              {acDetail && ` (${acDetail})`};{' '}
              <span
                className={styles.rollMod}
                title="Roll Fortitude (right-click to input)"
                onClick={e => roll(effFort, 'Fortitude', e)}
                onContextMenu={e => manualRoll1d20(effFort, 'Fortitude', e)}
                style={fortStyle}
              >
                <strong>Fort</strong> {formatMod(effFort)}
              </span>
              {fortDetail && `, ${fortDetail}`},{' '}
              <span
                className={styles.rollMod}
                title="Roll Reflex (right-click to input)"
                onClick={e => roll(effRef, 'Reflex', e)}
                onContextMenu={e => manualRoll1d20(effRef, 'Reflex', e)}
                style={refStyle}
              >
                <strong>Ref</strong> {formatMod(effRef)}
              </span>
              {refDetail && `, ${refDetail}`},{' '}
              <span
                className={styles.rollMod}
                title="Roll Will (right-click to input)"
                onClick={e => roll(effWill, 'Will', e)}
                onContextMenu={e => manualRoll1d20(effWill, 'Will', e)}
                style={willStyle}
              >
                <strong>Will</strong> {formatMod(effWill)}
              </span>
              {willDetail && `, ${willDetail}`}
              {allSaves && (
                <>
                  ; <em>{allSaves}</em>
                </>
              )}
            </p>
          );
        })()}

        {/* HP — suppressed for hazards with no physical component */}
        {(!isHazard || hazard!.hasHealth) && (() => {
          const hpDelta = activeEliteWeak && typeof hp === 'number' ? eliteWeakHpDelta(level, activeEliteWeak) : 0;
          const effHp = typeof hp === 'number' ? Math.max(1, hp + hpDelta) : hp;
          return (
            <p className={styles.defenseLine}>
              {isHazard && (scaledHazardStats?.hardness ?? hazard!.hardness) > 0 && (() => {
                const displayHardness = scaledHazardStats?.hardness ?? hazard!.hardness;
                const hardnessStyle = scaledHazardStats ? { color: '#2a7a6a', fontWeight: 700 } as const : undefined;
                return <><strong>Hardness</strong> <span style={hardnessStyle}>{displayHardness}</span>;{' '}</>;
              })()}
              <strong>HP</strong>{' '}
              <span style={hpDelta !== 0 ? ewStyle : undefined}>{effHp}</span>
              {isHazard && typeof effHp === 'number' && (
                <span style={{ color: 'var(--text-mute)' }}> (BT {Math.floor((typeof hp === 'number' ? Math.max(1, hp + hpDelta) : 0) / 2)})</span>
              )}
              {hpDelta !== 0 && typeof hp === 'number' && (
                <span style={{ color: 'var(--text-mute)', fontSize: '0.78em' }}> (base {hp})</span>
              )}
              {hpDetail && ` (${hpDetail})`}
              {immunities && (
                <>
                  ; <strong>Immunities</strong> {immunities}
                </>
              )}
              {resistances && (
                <>
                  ; <strong>Resistances</strong> {resistances}
                </>
              )}
              {weaknesses && (
                <>
                  ; <strong>Weaknesses</strong> {weaknesses}
                </>
              )}
            </p>
          );
        })()}

        {/* Immunities/Resistances/Weaknesses for hazards with no physical component */}
        {isHazard && !hazard!.hasHealth && (immunities || resistances || weaknesses) && (
          <p className={styles.defenseLine}>
            {immunities && <><strong>Immunities</strong> {immunities}</>}
            {resistances && <>{immunities ? '; ' : ''}<strong>Resistances</strong> {resistances}</>}
            {weaknesses && <>{(immunities || resistances) ? '; ' : ''}<strong>Weaknesses</strong> {weaknesses}</>}
          </p>
        )}

        {passives.map(item => (
          <ItemBlock key={item._id} item={item} onRollAll={rollDamage} onManualRollDamage={manualRollDamage} ewMod={ewMod} ewStyle={ewStyle} baseLevel={level} targetLevel={scaledStats?.targetLevel ?? scaledHazardStats?.targetLevel} interactive={abilityPopupsEnabled} />
        ))}
        {reactions.map(item => (
          <ItemBlock key={item._id} item={item} onRollAll={rollDamage} onManualRollDamage={manualRollDamage} ewMod={ewMod} ewStyle={ewStyle} baseLevel={level} targetLevel={scaledStats?.targetLevel ?? scaledHazardStats?.targetLevel} interactive={abilityPopupsEnabled} />
        ))}

        <hr className={styles.divider} />

        {/* Disable — hazards only, shown before attacks/actions */}
        {isHazard && hazard!.disable && (
          <div className={styles.itemBlock}>
            <p className={styles.itemHeader}>
              <strong className={styles.itemName}>Disable</strong>
            </p>
            <div
              className={styles.itemDesc}
              dangerouslySetInnerHTML={{ __html: abilityHtml(
                scaledHazardStats ? scaleHazardHtml(hazard!.disable, level, scaledHazardStats.targetLevel) : hazard!.disable
              ) }}
            />
          </div>
        )}

        {/* Speed — creatures only */}
        {!isHazard && (
          <p className={styles.infoLine}>
            <strong>Speed</strong>{' '}
            {pen.speed !== 0 ? (
              <span style={{ color: '#c0392b', fontWeight: 700 }}>
                {getSpeedStringWithPenalty(c, pen.speed)}
              </span>
            ) : (
              getSpeedString(c)
            )}
          </p>
        )}

        {/* Sneak Attack toggle — shown whenever the creature has Sneak Attack */}
        {sneakAttackExpr && (
          <div className={styles.sneakAttackRow}>
            <input
              id="sneak-attack-toggle"
              type="checkbox"
              className={styles.sneakAttackToggle}
              checked={sneakAttackActive}
              onChange={e => setSneakAttackActive(e.target.checked)}
            />
            <label htmlFor="sneak-attack-toggle" className={styles.sneakAttackLabel}>
              Sneak Attack{' '}
              <span className={styles.sneakAttackDice}>+{sneakAttackExpr} precision</span>
            </label>
          </div>
        )}

        {attacks.map(item => (
          <AttackBlock
            key={item._id}
            item={item}
            onRollAttack={rollAttack}
            onRollDamage={rollDamage}
            onManualRollAttack={manualRollAttack}
            onManualRollDamage={manualRollDamage}
            conditions={activeConditionList}
            strMod={str}
            dexMod={dex}
            ewMod={ewMod}
            ewStyle={ewStyle}
            sneakAttackExpr={sneakAttackExpr}
            sneakAttackActive={sneakAttackActive}
          />
        ))}

        {/* Non-official attacks: scaled (when level scaling active) or custom creature attacks.
            Both paths share the same AttackLine rendering. Scaled attacks get a teal highlight
            style; custom attacks use the elite/weak style or none. */}
        {(() => {
          const scaledStyle = { color: '#2a7a6a', fontWeight: 700 } as const;
          const nonOfficialAttacks =
            scaledStats ? scaledStats.attacks.map(atk => ({ ...atk, isScaled: true as const }))
            : scaledHazardStats ? scaledHazardStats.attacks.map(atk => ({ ...atk, isScaled: true as const }))
            : creature.publication === 'Custom'
              ? (creature.customData?.attacks ?? []).map(atk => ({ ...atk, isScaled: false as const }))
              : [];
          return nonOfficialAttacks.map((atkRaw, i) => {
            // Cast to the richer CustomAttack shape — scaled attacks simply won't
            // have damageTypes/strikeAbilities (undefined), which is fine.
            const atk = atkRaw as typeof atkRaw & import('../../types/encounter').CustomAttack;
            const baseStyle = atk.isScaled ? scaledStyle : undefined;
            const atkStyle = ewMod !== 0 ? ewStyle : baseStyle;
            const effBonus = atk.bonus + ewMod;
            const isAgile = atk.traits?.includes('agile') ?? false;
            const rangeDisplay = atk.range != null ? `range ${atk.range} ft.` : undefined;
            const damageLabel = `${atk.name} damage`;

            // Build structured damage groups from damageTypes if present,
            // otherwise fall back to parsing the legacy flat damage string.
            let damageGroups: { expr: string; label: string }[];
            let primaryExprForEwMod: string;

            if (atk.damageTypes && atk.damageTypes.length > 0) {
              // Primary group gets elite/weak modifier; secondaries do not.
              const primary = atk.damageTypes[0];
              const primaryExprRaw = primary.expr.replace(/\s/g, '');
              primaryExprForEwMod = ewMod !== 0
                ? `${primaryExprRaw}${ewMod >= 0 ? `+${ewMod}` : ewMod}`
                : primaryExprRaw;
              damageGroups = [
                { expr: primaryExprForEwMod, label: primary.type || 'damage' },
                ...atk.damageTypes.slice(1).map(dt => ({
                  expr: dt.expr.replace(/\s/g, ''),
                  label: dt.type || 'damage',
                })),
              ];
            } else {
              // Legacy path: extract first dice expression from the flat string.
              const damageExprMatch = atk.damage?.match(/(\d+d\d+)\s*([+-]\s*\d+)?/);
              const baseDamageExpr = damageExprMatch
                ? (damageExprMatch[2] ? `${damageExprMatch[1]}${damageExprMatch[2].replace(/\s/g, '')}` : damageExprMatch[1])
                : '';
              primaryExprForEwMod = baseDamageExpr && ewMod !== 0
                ? `${baseDamageExpr}${ewMod >= 0 ? `+${ewMod}` : ewMod}`
                : baseDamageExpr;
              damageGroups = primaryExprForEwMod ? [{ expr: primaryExprForEwMod, label: 'damage' }] : [];
            }

            // Build the display damage string: typed dice components joined by " plus ".
            // Strike abilities are passed separately to AttackLine so they render as
            // plain text outside the clickable rollMod span.
            let displayDamage: string;
            const strikeAbilities = atk.strikeAbilities ?? [];
            if (atk.damageTypes && atk.damageTypes.length > 0) {
              const dmgParts = atk.damageTypes.map((dt, di) => {
                const expr = di === 0 && ewMod !== 0 ? primaryExprForEwMod : dt.expr;
                return dt.type ? `${expr} ${dt.type}` : expr;
              });
              displayDamage = dmgParts.join(' plus ');
            } else {
              // Legacy: use stored flat string, with ewMod applied to first expr
              displayDamage = ewMod !== 0 && primaryExprForEwMod
                ? (atk.damage ?? '').replace(/(\d+d\d+(?:[+-]\d+)?)/, primaryExprForEwMod)
                : (atk.damage ?? '');
            }

            const atkTraits = atk.traits ?? [];
            const effectiveDamageGroups = withSneakAttack(damageGroups, sneakAttackExpr, sneakAttackActive, atk.type, atkTraits);

            return (
              <AttackLine
                key={i}
                name={atk.name}
                type={atk.type}
                bonus={effBonus}
                damage={displayDamage}
                damageExpr={damageGroups[0]?.expr ?? ''}
                damageModified={ewMod !== 0}
                traits={atkTraits}
                rangeDisplay={rangeDisplay}
                attackStyle={atkStyle}
                damageStyle={atkStyle}
                isAgile={isAgile}
                strikeAbilities={strikeAbilities}
                onRollAttack={(mod, label, e) => rollAttack(mod, label, effectiveDamageGroups, damageLabel, atkTraits, e)}
                onRollDamage={e => rollDamage(effectiveDamageGroups, damageLabel, atkTraits, e)}
                onManualRollAttack={(mod, label, e) => manualRollAttack(mod, label, effectiveDamageGroups, atkTraits, e)}
                onManualRollDamage={e => manualRollDamage(effectiveDamageGroups, damageLabel, e)}
              />
            );
          });
        })()}

        {/* Spellcasting — rendered the same way for both official and custom creatures */}
        {spellcastingEntries.map((entry, ei) => (
          <SpellcastingBlock
            key={entry.id ?? ei}
            entry={entry}
            ewMod={ewMod}
            ewStyle={ewStyle}
            onRollAll={rollDamage}
          />
        ))}

        {offenseActions.map(item => (
          <ItemBlock key={item._id} item={item} onRollAll={rollDamage} onManualRollDamage={manualRollDamage} ewMod={ewMod} ewStyle={ewStyle} baseLevel={level} targetLevel={scaledStats?.targetLevel ?? scaledHazardStats?.targetLevel} interactive={abilityPopupsEnabled} />
        ))}

        {/* Routine — complex hazards only */}
        {isHazard && hazard!.routine && (
          <div className={styles.itemBlock}>
            <p className={styles.itemHeader}>
              <strong className={styles.itemName}>Routine</strong>
            </p>
            <div
              className={styles.itemDesc}
              dangerouslySetInnerHTML={{ __html: abilityHtml(
                scaledHazardStats ? scaleHazardHtml(hazard!.routine, level, scaledHazardStats.targetLevel) : hazard!.routine
              ) }}
            />
          </div>
        )}

        {/* Reset — hazards only */}
        {isHazard && hazard!.reset && (
          <div className={styles.itemBlock}>
            <p className={styles.itemHeader}>
              <strong className={styles.itemName}>Reset</strong>
            </p>
            <div
              className={styles.itemDesc}
              dangerouslySetInnerHTML={{ __html: abilityHtml(
                scaledHazardStats ? scaleHazardHtml(hazard!.reset, level, scaledHazardStats.targetLevel) : hazard!.reset
              ) }}
            />
          </div>
        )}

        {/* Elite/Weak ability note — shown for all creature types */}
        {activeEliteWeak && (
          <p className={styles.eliteWeakAbilityNote} style={ewMod > 0 ? { color: '#8a6a18' } : { color: '#2a5a8a' }}>
            {activeEliteWeak === 'elite' ? '★ Elite' : '▽ Weak'}{': '}
            ability DCs {ewMod > 0 ? 'increase' : 'decrease'} by 2.
            At-will abilities deal {ewMod > 0 ? '+2' : '−2'} damage;
            limited-use abilities (recharge, per-day, etc.) deal {ewMod > 0 ? '+4' : '−4'} damage.
          </p>
        )}

        {/* Custom creature abilities */}
        {creature.publication === 'Custom' && (creature.customData?.abilities ?? []).map((ab, i) => {
          const limited = ab.frequency != null && ab.frequency !== '';
          const dmgMod = ewMod !== 0 ? (limited ? (ewMod > 0 ? 4 : -4) : (ewMod > 0 ? 2 : -2)) : 0;
          const dcMod = ewMod !== 0 ? (ewMod > 0 ? 2 : -2) : 0;
          const rawDesc = ab.description ?? '';
          // Apply level scaling first (if active), then elite/weak on top
          const scaledDesc = scaledStats
            ? scaleAbilityHtml(rawDesc, level, scaledStats.targetLevel)
            : scaledHazardStats
              ? scaleHazardHtml(rawDesc, level, scaledHazardStats.targetLevel)
              : rawDesc;
          const adjustedDesc = (dmgMod !== 0 || dcMod !== 0) ? applyEliteWeakToHtml(scaledDesc, dmgMod, dcMod) : scaledDesc;
          return (
            <CustomAbilityBlock
              key={i}
              ab={ab}
              adjustedDesc={adjustedDesc}
              dmgMod={dmgMod}
              ewStyle={ewStyle}
              onRollDamage={rollDamage}
              onManualRollDamage={manualRollDamage}
              interactive={abilityPopupsEnabled}
            />
          );
        })}

        {!isHazard && publicNotes && (
          <>
            <hr className={styles.divider} />
            <div className={styles.flavorBox}>
              <div
                className={styles.publicNotes}
                dangerouslySetInnerHTML={{ __html: descriptionHtml(publicNotes) }}
              />
            </div>
          </>
        )}

        {creature.publication === 'Custom' && creature.customData?.flavorText && (
          <>
            <hr className={styles.divider} />
            <div className={styles.flavorBox}>
              <p className={styles.publicNotes} style={{ whiteSpace: 'pre-wrap' }}>
                {creature.customData.flavorText}
              </p>
            </div>
          </>
        )}

        {/* Source — moved to bottom */}
        {publication && (
          <p className={styles.sourceLine} style={{ marginTop: 10 }}>
            Source <em>{publication}</em>
          </p>
        )}

        {/* Add to Encounter */}
        <button className={styles.addToEncBtn} onClick={() => onAddToEncounter(creature, previewScaledLevel)}>
          + Add to Encounter
        </button>

        {creature.publication === 'Custom' && onDelete && (
          confirmDelete ? (
            <div className={styles.deleteConfirm}>
              <span>Delete permanently?</span>
              <button className={styles.deleteConfirmBtn} onClick={() => onDelete(creature.id)}>Yes, delete</button>
              <button className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          ) : (
            <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
              Delete Custom {creature.entityType === 'hazard' ? 'Hazard' : 'Creature'}
            </button>
          )
        )}
      </div>

      {diceRoll && (
        <DiceRoller
          expression={diceRoll.expr}
          label={diceRoll.label}
          creatureName={diceRoll.creatureName}
          damageGroups={diceRoll.damageGroups}
          damageTraits={diceRoll.damageTraits}
          anchorX={diceRoll.x}
          anchorY={diceRoll.y}
          onClose={clearRolls}
          onRoll={onRoll}
        />
      )}
      {multiDamageRoll && (
        <MultiDamageRoller
          groups={multiDamageRoll.groups}
          abilityName={multiDamageRoll.abilityName}
          creatureName={multiDamageRoll.creatureName}
          traits={multiDamageRoll.traits}
          anchorX={multiDamageRoll.x}
          anchorY={multiDamageRoll.y}
          onClose={clearRolls}
          onRoll={onRoll}
        />
      )}
      {manualRoll && (
        <ManualRollInput
          expression={manualRoll.expr}
          label={manualRoll.label}
          creatureName={manualRoll.creatureName}
          damageGroups={manualRoll.damageGroups}
          damageTraits={manualRoll.damageTraits}
          anchorX={manualRoll.x}
          anchorY={manualRoll.y}
          onClose={clearRolls}
          onRoll={onRoll}
        />
      )}
    </div>
  );
}


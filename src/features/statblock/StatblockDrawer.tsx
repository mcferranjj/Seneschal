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
} from './statblockHelpers';
import { getRecallKnowledge } from '../encounter/EncounterManager';
import { importSpellcasting } from '../../utils/importCreature';
import {
  buildScaledCreature,
  buildScaledHazard,
  scaleAbilityHtml,
  scaleHazardHtml,
  eliteWeakLevel,
} from '../../utils/levelScaling';
import type { ScaledCreatureStats, ScaledHazardStats } from '../../utils/levelScaling';
import { useRollState } from '../../hooks/useRollState';
import { AttackBlock } from './AttackBlock';
import { ItemBlock } from './ItemBlock';
import { CustomAbilityBlock } from './CustomAbilityBlock';
import { SpellcastingBlock } from './SpellcastingBlock';
import { TraitChip } from './TraitChip';
import { NotesPanel } from './NotesPanel';
import { useContainerTraitTooltip } from '../../hooks/useContainerTraitTooltip';
import { TraitHoverPopup, TraitPinnedPopup } from './TraitPopup';
import { getAonUrl } from '../../utils/aonSearch';
import { sortTraits } from '../../utils/pf2eHelpers';
import { StatblockHeader } from './StatblockHeader';
import { StatblockDefenses } from './StatblockDefenses';
import { StatblockSkillsAbilities } from './StatblockSkillsAbilities';
import { StatblockCustomAttacks } from './StatblockCustomAttacks';
import styles from './StatblockDrawer.module.css';

// ─── Public shell ────────────────────────────────────────────────────────────

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

// ─── Private content ─────────────────────────────────────────────────────────

interface StatblockContentProps {
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
}: StatblockContentProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Local preview level — used when onSetScaledLevel is not provided (not in encounter yet)
  const [previewScaledLevel, setPreviewScaledLevel] = useState<number | undefined>(undefined);
  const [sneakAttackActive, setSneakAttackActive] = useState(false);
  const [notesOpen, setNotesOpen] = useState(() => !!(activeNotes));

  // Ability popups are on for statblock bodies; description prose strips them.
  const abilityPopupsEnabled = true;
  const abilityHtml  = (raw: string) => processFoundryHtml(raw, { interactive: true });
  const descriptionHtml = (raw: string) => processFoundryHtml(raw, { interactive: false });

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
    const rollMod = target.closest(`.${styles.rollMod}, .${styles.mapRoll}, .pf2roll`);
    if (rollMod) {
      e.preventDefault();
      if (rollMod.classList.contains('pf2roll')) {
        const expr  = (rollMod as HTMLElement).dataset.expr  ?? '';
        const label = (rollMod as HTMLElement).dataset.label ?? undefined;
        if (expr) manualRollExpr(expr, label, e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualRollExpr]);

  const c = creature.data as PF2ECreature;

  useEffect(() => { setCreatureName(c.name); }, [c.name, setCreatureName]);

  useEffect(() => {
    setPreviewScaledLevel(undefined);
    setSneakAttackActive(false);
  }, [creature.id]);

  useEffect(() => {
    setNotesOpen(!!(activeNotes));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creature.id]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const level    = getLevel(c);
  const size     = getSize(c);
  const rarity   = c.system?.traits?.rarity ?? 'common';
  const traits   = c.system?.traits?.value  ?? [];
  const isHazard = creature.entityType === 'hazard';
  const hazard   = isHazard ? getHazardDetails(c) : null;

  const effectiveScaledLevel = activeScaledLevel ?? previewScaledLevel;

  const scaledCreatureStats: ScaledCreatureStats | null =
    !isHazard && effectiveScaledLevel != null ? buildScaledCreature(creature, effectiveScaledLevel) : null;
  const scaledHazardStats: ScaledHazardStats | null =
    isHazard && effectiveScaledLevel != null ? buildScaledHazard(creature, effectiveScaledLevel) : null;
  const scaledStats = scaledCreatureStats;

  // Build display trait list: rarity → size → sorted creature traits.
  // sortTraits handles: creature types (A–Z) → complex → other traits (A–Z).
  const allTraits = [
    ...(rarity !== 'common' ? [rarity] : []),
    ...(!isHazard ? [size] : []),
    ...sortTraits(traits, hazard?.isComplex ?? false),
  ];

  const [aonURL, setAonURL] = useState<string | null>(null);
  useEffect(() => {
    const aonType = creature.entityType === 'hazard' ? 'Hazard' : 'Creature';
    getAonUrl({ name: c.name, type: aonType }).then(url => { if (url) setAonURL(url); });
  }, [c.name, creature.entityType]);

  const activeConditionList = activeConditions ?? [];
  const pen = computePenalties(activeConditionList);
  const debuffStyle = { color: '#c0392b', fontWeight: 700 } as const;

  const ewMod = activeEliteWeak === 'elite' ? 2 : activeEliteWeak === 'weak' ? -2 : 0;
  const ewStyle = ewMod > 0
    ? { color: '#8a6a18', fontWeight: 700 } as const
    : ewMod < 0
      ? { color: '#2a5a8a', fontWeight: 700 } as const
      : undefined;

  // Stats (prefer scaled, then raw)
  const ac = scaledStats ? scaledStats.ac
    : scaledHazardStats?.ac != null ? scaledHazardStats.ac
    : (c.system?.attributes?.ac?.value ?? '—');
  const acDetail  = (scaledStats || scaledHazardStats) ? undefined : c.system?.attributes?.ac?.details;
  const hp = scaledStats ? scaledStats.hp
    : scaledHazardStats?.hp != null ? scaledHazardStats.hp
    : (c.system?.attributes?.hp?.max ?? '—');
  const hpDetail  = (scaledStats || scaledHazardStats) ? undefined : c.system?.attributes?.hp?.details;
  const allSaves  = c.system?.attributes?.allSaves?.value;
  const fort = scaledStats ? scaledStats.fort : scaledHazardStats?.fort ?? c.system?.saves?.fortitude?.value;
  const ref  = scaledStats ? scaledStats.ref  : scaledHazardStats?.ref  ?? c.system?.saves?.reflex?.value;
  const will = scaledStats ? scaledStats.will : scaledHazardStats?.will ?? c.system?.saves?.will?.value;
  const fortDetail = (scaledStats || scaledHazardStats) ? undefined : c.system?.saves?.fortitude?.saveDetail;
  const refDetail  = (scaledStats || scaledHazardStats) ? undefined : c.system?.saves?.reflex?.saveDetail;
  const willDetail = (scaledStats || scaledHazardStats) ? undefined : c.system?.saves?.will?.saveDetail;
  const str  = scaledStats ? scaledStats.str : c.system?.abilities?.str?.mod;
  const dex  = scaledStats ? scaledStats.dex : c.system?.abilities?.dex?.mod;
  const con  = scaledStats ? scaledStats.con : c.system?.abilities?.con?.mod;
  const int_ = scaledStats ? scaledStats.int : c.system?.abilities?.int?.mod;
  const wis  = scaledStats ? scaledStats.wis : c.system?.abilities?.wis?.mod;
  const cha  = scaledStats ? scaledStats.cha : c.system?.abilities?.cha?.mod;

  const langs = creature.publication === 'Custom'
    ? (creature.customData?.languages ?? []).join(', ')
    : getLanguages(c);

  const rawSkills = scaledStats
    ? scaledStats.skills
    : creature.publication === 'Custom'
      ? (creature.customData?.skills ?? []).map(sk => ({ name: sk.name, mod: sk.mod }))
      : getSkills(c);

  const senses = getSenses(c);
  const rawImmResWeak = getImmResWeak(c);
  const immunities = rawImmResWeak.immunities;
  const activeScaledResistances = scaledStats?.resistances ?? scaledHazardStats?.resistances;
  const activeScaledWeaknesses  = scaledStats?.weaknesses  ?? scaledHazardStats?.weaknesses;
  const resistances = activeScaledResistances
    ? activeScaledResistances.map(r => `${r.type} ${r.value}${r.exceptions ? ` (except ${r.exceptions})` : ''}`).join(', ')
    : rawImmResWeak.resistances;
  const weaknesses = activeScaledWeaknesses
    ? activeScaledWeaknesses.map(w => `${w.type} ${w.value}${w.exceptions ? ` (except ${w.exceptions})` : ''}`).join(', ')
    : rawImmResWeak.weaknesses;

  const attacks      = (scaledStats || scaledHazardStats) ? [] : getAttacks(c);
  const allActions   = getActions(c);
  const reactions    = allActions.filter(i => i.system?.actionType?.value === 'reaction');
  const offenseActions = allActions.filter(i => i.system?.actionType?.value !== 'reaction');
  const passives     = getPassives(c);

  const spellcastingEntries: CustomSpellcastingEntry[] =
    scaledStats ? scaledStats.spellcasting
    : scaledHazardStats ? scaledHazardStats.spellcasting
    : creature.publication === 'Custom'
      ? (creature.customData?.spellcasting ?? [])
      : importSpellcasting(creature);

  const publicNotes  = c.system?.details?.publicNotes ?? '';
  const publication  = c.system?.details?.publication?.title;
  const sneakAttackExpr = getSneakAttackDamage(creature);

  const imgPath = c.img;
  const isDefaultIcon = !imgPath || imgPath.includes('default-icons') || imgPath.endsWith('mystery-man.webp');
  const imageUrl = isDefaultIcon
    ? null
    : `https://raw.githubusercontent.com/foundryvtt/pf2e/v14-dev/static/${imgPath.replace('systems/pf2e/', '')}`;

  // Renders a filtered subset of a custom creature's abilities as CustomAbilityBlocks.
  // Extracted to avoid duplicating the dmgMod/dcMod/scaling pipeline at each call site.
  function renderCustomAbilities(
    filter: (ab: import('../../types/encounter').CustomAbility) => boolean,
    keyPrefix: string,
  ) {
    if (creature.publication !== 'Custom') return null;
    return (creature.customData?.abilities ?? []).filter(filter).map((ab, i) => {
      const limited = ab.frequency != null && ab.frequency !== '';
      const dmgMod  = ewMod !== 0 ? (limited ? (ewMod > 0 ? 4 : -4) : (ewMod > 0 ? 2 : -2)) : 0;
      const dcMod   = ewMod !== 0 ? (ewMod > 0 ? 2 : -2) : 0;
      const rawDesc = ab.description ?? '';
      const scaledDesc = scaledStats
        ? scaleAbilityHtml(rawDesc, level, scaledStats.targetLevel)
        : scaledHazardStats
          ? scaleHazardHtml(rawDesc, level, scaledHazardStats.targetLevel)
          : rawDesc;
      const adjustedDesc = (dmgMod !== 0 || dcMod !== 0)
        ? applyEliteWeakToHtml(scaledDesc, dmgMod, dcMod)
        : scaledDesc;
      return (
        <CustomAbilityBlock
          key={`${keyPrefix}-${i}`}
          ab={ab}
          adjustedDesc={adjustedDesc}
          dmgMod={dmgMod}
          ewStyle={ewStyle}
          onRollDamage={rollDamage}
          onManualRollDamage={manualRollDamage}
          interactive={abilityPopupsEnabled}
        />
      );
    });
  }

  // Shared ItemBlock props to avoid repeating them on every call site
  const itemBlockProps = {
    onRollAll: rollDamage,
    onManualRollDamage: manualRollDamage,
    ewMod,
    ewStyle,
    baseLevel: level,
    targetLevel: scaledStats?.targetLevel ?? scaledHazardStats?.targetLevel,
    interactive: abilityPopupsEnabled,
  };

  const hasCustomName = !!(encounterName && encounterName !== c.name);
  const displayName   = hasCustomName ? encounterName! : c.name;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`${styles.content}${abilityPopupsEnabled ? ' pf2kwInteractive' : ''}`} ref={pf2kwRef} onClick={handleBodyClick} onContextMenu={handleBodyContextMenu}>
      {pf2kwHover && !pf2kwPinned && <TraitHoverPopup {...pf2kwHover} />}
      {pf2kwPinned && <TraitPinnedPopup {...pf2kwPinned} popupRef={pf2kwPopupRef} onClose={pf2kwClosePin} />}

      <StatblockHeader
        creature={creature}
        c={c}
        level={level}
        size={size}
        isHazard={isHazard}
        isComplex={hazard?.isComplex ?? false}
        aonURL={aonURL}
        effectiveScaledLevel={effectiveScaledLevel}
        activeEliteWeak={activeEliteWeak}
        notesOpen={notesOpen}
        activeNotes={activeNotes}
        hasCustomName={hasCustomName}
        displayName={displayName}
        onClose={onClose}
        onEdit={onEdit}
        onCopyAsCustom={onCopyAsCustom}
        onSetScaledLevel={onSetScaledLevel}
        onSetPreviewScaledLevel={setPreviewScaledLevel}
        onToggleNotes={() => setNotesOpen(o => !o)}
      />

      {/* Traits */}
      <div className={styles.traitsRow}>
        {allTraits.map(t => (
          <TraitChip key={t} trait={t} rarity={rarity} />
        ))}
      </div>

      {/* GM Notes panel */}
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
        {/* Recall Knowledge DC — creatures only */}
        {!isHazard && (() => {
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

        {/* Elite/Weak banner */}
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

        {/* Hazard description */}
        {isHazard && hazard!.description && (
          <div
            className={styles.itemDesc}
            style={{ marginBottom: 6 }}
            dangerouslySetInnerHTML={{ __html: descriptionHtml(hazard!.description) }}
          />
        )}

        <StatblockSkillsAbilities
          creature={creature}
          c={c}
          isHazard={isHazard}
          hazard={hazard}
          senses={senses}
          langs={langs}
          rawSkills={rawSkills}
          str={str} dex={dex} con={con} int_={int_} wis={wis} cha={cha}
          ewMod={ewMod}
          ewStyle={ewStyle}
          debuffStyle={debuffStyle}
          scaledPerception={scaledStats?.perception}
          scaledHazardStealthDC={scaledHazardStats?.stealthDC}
          scaledHazardStealthMod={scaledHazardStats?.stealthMod}
          pen={pen}
          onRollMod={roll}
          onManualRollMod={manualRoll1d20}
        />

        {/* Languages — creatures only */}
        {!isHazard && langs && (
          <p className={styles.infoLine}>
            <strong>Languages</strong> {langs}
          </p>
        )}

        <hr className={styles.divider} />

        {/* Defenses — suppressed for hazards with no physical component */}
        {(!isHazard || hazard!.hasHealth) && (
          <StatblockDefenses
            ac={ac} acDetail={acDetail}
            fort={fort} ref={ref} will={will}
            fortDetail={fortDetail} refDetail={refDetail} willDetail={willDetail}
            allSaves={allSaves}
            hp={hp} hpDetail={hpDetail}
            isHazard={isHazard}
            hardness={scaledHazardStats?.hardness ?? hazard?.hardness ?? 0}
            hardnessScaled={scaledHazardStats != null}
            immunities={immunities} resistances={resistances} weaknesses={weaknesses}
            level={level}
            activeEliteWeak={activeEliteWeak}
            ewMod={ewMod} ewStyle={ewStyle}
            pen={pen} debuffStyle={debuffStyle}
            onRollSave={roll}
            onManualRollSave={manualRoll1d20}
          />
        )}

        {passives.map(item => (
          <ItemBlock key={item._id} item={item} {...itemBlockProps} />
        ))}
        {reactions.map(item => (
          <ItemBlock key={item._id} item={item} {...itemBlockProps} />
        ))}
        {/* Custom creature passives and reactions — shown here to match official ordering */}
        {renderCustomAbilities(
          ab => ab.actionType === 'passive' || ab.actionType === 'reaction' || ab.actionType == null,
          'pre',
        )}

        <hr className={styles.divider} />

        {/* Disable — hazards only */}
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

        {/* Sneak Attack toggle */}
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

        {/* Official attacks */}
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

        {/* Scaled / custom attacks */}
        <StatblockCustomAttacks
          creature={creature}
          scaledStats={scaledStats}
          scaledHazardStats={scaledHazardStats}
          ewMod={ewMod}
          ewStyle={ewStyle}
          sneakAttackExpr={sneakAttackExpr}
          sneakAttackActive={sneakAttackActive}
          onRollAttack={rollAttack}
          onRollDamage={rollDamage}
          onManualRollAttack={manualRollAttack}
          onManualRollDamage={manualRollDamage}
        />

        {/* Spellcasting */}
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
          <ItemBlock key={item._id} item={item} {...itemBlockProps} />
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

        {/* Elite/Weak ability note */}
        {activeEliteWeak && (
          <p className={styles.eliteWeakAbilityNote} style={ewMod > 0 ? { color: '#8a6a18' } : { color: '#2a5a8a' }}>
            {activeEliteWeak === 'elite' ? '★ Elite' : '▽ Weak'}{': '}
            ability DCs {ewMod > 0 ? 'increase' : 'decrease'} by 2.
            At-will abilities deal {ewMod > 0 ? '+2' : '−2'} damage;
            limited-use abilities (recharge, per-day, etc.) deal {ewMod > 0 ? '+4' : '−4'} damage.
          </p>
        )}

        {/* Custom creature active abilities (actions, free actions) — passives and reactions rendered above */}
        {renderCustomAbilities(
          ab => ab.actionType === 'single' || ab.actionType === 'two' || ab.actionType === 'three' || ab.actionType === 'free',
          'post',
        )}

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

        {publication && (
          <p className={styles.sourceLine} style={{ marginTop: 10 }}>
            Source <em>{publication}</em>
          </p>
        )}

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


import { useState, useCallback, useRef, useEffect } from 'react';
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature, PF2EItem } from '../../types/pf2e';
import type { RollHistoryEntry } from '../../types/diceHistory';
import type { Condition, CustomSpellcastingEntry, CustomSpell } from '../../types/encounter';
import { computePenalties, computeAttackPenalty, computeDamagePenalty } from '../../types/conditionEffects';
import { DiceRoller, DamageRoller, MultiDamageRoller } from '../DiceRoller/DiceRoller';
import type { DamageGroupInput } from '../DiceRoller/DiceRoller';
import { CustomCreatureWizard } from '../CustomCreatureWizard/CustomCreatureWizard';
import {
  getLevel,
  getSize,
  getLanguages,
  formatMod,
  getSkills,
  getSenses,
  getSpeedString,
  getImmResWeak,
  getAttacks,
  getActions,
  getPassives,
  getDamageString,
  stripFoundryMacros,
  linkKeywords,
  linkRolls,
  extractDamageGroups,
  isLimitedUse,
  applyEliteWeakToHtml,
} from './statblockHelpers';
import type { DamageGroup } from './statblockHelpers';
import { getRecallKnowledge } from '../EncounterManager/EncounterManager';
import { importSpellcasting } from '../../utils/importCreature';
import { buildScaledCreature, scaleAbilityHtml, eliteWeakHpDelta, eliteWeakLevel } from '../../utils/levelScaling';
import { traitColor } from '../../utils/traitColors';
import { useRollState } from '../../hooks/useRollState';

function processHtml(raw: string): string {
  return linkRolls(linkKeywords(stripFoundryMacros(raw)));
}
import styles from './StatblockDrawer.module.css';

function actionSymbol(item: PF2EItem): string {
  const at = item.system?.actionType?.value;
  const cost = item.system?.actions?.value;
  if (at === 'reaction') return ' ↺';
  if (at === 'free') return ' ◇';
  if (at === 'passive') return '';
  if (cost === 1) return ' ◆';
  if (cost === 2) return ' ◆◆';
  if (cost === 3) return ' ◆◆◆';
  return '';
}

function skillDisplayName(raw: string): string {
  return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface DrawerProps {
  creature: CreatureRecord | null;
  onClose: () => void;
  onAddToEncounter: (creature: CreatureRecord) => void;
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
        creature.packSource === 'custom' ? (
          <StatblockContent
            creature={creature}
            onClose={onClose}
            onAddToEncounter={onAddToEncounter}
            onRoll={onRoll}
            activeConditions={activeConditions}
            activeEliteWeak={activeEliteWeak}
            activeScaledLevel={activeScaledLevel}
            onSetScaledLevel={onSetScaledLevel}
            onDelete={onDeleteCreature}
            onEdit={onEditCreature}
            onCopyAsCustom={onCopyAsCustom}
          />
        ) : (
          <StatblockContent
            creature={creature}
            onClose={onClose}
            onAddToEncounter={onAddToEncounter}
            onRoll={onRoll}
            activeConditions={activeConditions}
            activeEliteWeak={activeEliteWeak}
            activeScaledLevel={activeScaledLevel}
            onSetScaledLevel={onSetScaledLevel}
            onCopyAsCustom={onCopyAsCustom}
          />
        )
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

// submit str: name and str: type, returns most likely URL
// URL will always be remaster content because aon returns it at higher priority
// if legacy content is wanted, will need to rework this
async function GetAONURL (search: {name: string, type: string}) {
  try {
    const response = await fetch ('https://elasticsearch.aonprd.com/aon/_search', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: `{"query":{"bool":{"must":[{"match_phrase":{"name":"${search.name.toLowerCase()}"}},{"term":{"type":"${search.type}"}}]}},"_source":["name","url","id","type"],"size":3}`
      });
    const data = await response.json();
    const url = data.hits.hits[0]._source.url;
    return url;
  }
  catch (error) {
    console.error("err - GetAONURL - Error making POST request:", error);
  }
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
}: {
  creature: CreatureRecord;
  onClose: () => void;
  onAddToEncounter: (creature: CreatureRecord) => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
  activeConditions?: Condition[];
  activeEliteWeak?: 'elite' | 'weak';
  activeScaledLevel?: number;
  onSetScaledLevel?: (level: number | undefined) => void;
  onDelete?: (id: string) => void;
  onEdit?: (creature: CreatureRecord) => void;
  onCopyAsCustom?: (creature: CreatureRecord) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scaleDropdownOpen, setScaleDropdownOpen] = useState(false);

  const {
    diceRoll, damageRoll, multiDamageRoll,
    roll, rollAttack, rollDamage, rollAllDamage, rollExpr,
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
  const level = getLevel(c);

  // Compute scaled stats when a custom level is active. Always derived from original data.
  const scaledStats = activeScaledLevel != null ? buildScaledCreature(creature, activeScaledLevel) : null;
  const size = getSize(c);
  const rarity = c.system?.traits?.rarity ?? 'common';
  const traits = c.system?.traits?.value ?? [];
  const allTraits = [
    ...(rarity !== 'common' ? [rarity] : []),
    size,
    ...traits,
  ];

  // Get URL
  // Only works for hazards and creatures right now. If needs to expand, needs to become a switch.
  const aonType = creature.entityType === 'hazard' ? 'Hazard' : 'Creature';
  const [aonURL, setAonURL] = useState<string | null>(null);
  useEffect(() => {
    GetAONURL({ name: c.name, type: aonType }).then(url => {
      console.log('GetAONURL result:', url);
      if (url) setAonURL('https://2e.aonprd.com' + url);
    });
  }, [c.name, c.type]);

  const ac = scaledStats ? scaledStats.ac : (c.system?.attributes?.ac?.value ?? '—');
  const acDetail = scaledStats ? undefined : c.system?.attributes?.ac?.details;
  const hp = scaledStats ? scaledStats.hp : (c.system?.attributes?.hp?.max ?? '—');
  const hpDetail = scaledStats ? undefined : c.system?.attributes?.hp?.details;
  const allSaves = c.system?.attributes?.allSaves?.value;

  const fort = scaledStats ? scaledStats.fort : c.system?.saves?.fortitude?.value;
  const ref  = scaledStats ? scaledStats.ref  : c.system?.saves?.reflex?.value;
  const will = scaledStats ? scaledStats.will : c.system?.saves?.will?.value;
  const fortDetail = scaledStats ? undefined : c.system?.saves?.fortitude?.saveDetail;
  const refDetail  = scaledStats ? undefined : c.system?.saves?.reflex?.saveDetail;
  const willDetail = scaledStats ? undefined : c.system?.saves?.will?.saveDetail;

  const str  = scaledStats ? scaledStats.str : c.system?.abilities?.str?.mod;
  const dex  = scaledStats ? scaledStats.dex : c.system?.abilities?.dex?.mod;
  const con  = scaledStats ? scaledStats.con : c.system?.abilities?.con?.mod;
  const int_ = scaledStats ? scaledStats.int : c.system?.abilities?.int?.mod;
  const wis  = scaledStats ? scaledStats.wis : c.system?.abilities?.wis?.mod;
  const cha  = scaledStats ? scaledStats.cha : c.system?.abilities?.cha?.mod;

  const langs = getLanguages(c);
  const skills = scaledStats ? scaledStats.skills : getSkills(c);
  const senses = getSenses(c);
  const speed = getSpeedString(c);
  const rawImmResWeak = getImmResWeak(c);
  const immunities = rawImmResWeak.immunities;
  const resistances = scaledStats
    ? scaledStats.resistances.map(r => `${r.type} ${r.value}${r.exceptions ? ` (except ${r.exceptions})` : ''}`).join(', ')
    : rawImmResWeak.resistances;
  const weaknesses = scaledStats
    ? scaledStats.weaknesses.map(w => `${w.type} ${w.value}${w.exceptions ? ` (except ${w.exceptions})` : ''}`).join(', ')
    : rawImmResWeak.weaknesses;

  const attacks = scaledStats ? [] : getAttacks(c); // When scaled, use scaledStats.attacks instead
  const allActions = getActions(c);
  const reactions = allActions.filter(i => i.system?.actionType?.value === 'reaction');
  const offenseActions = allActions.filter(i => i.system?.actionType?.value !== 'reaction');
  const passives = getPassives(c);

  // Unified spellcasting: for official creatures, convert items → CustomSpellcastingEntry[]
  // so both official and custom creatures use the same SpellcastingBlock component.
  const spellcastingEntries: CustomSpellcastingEntry[] = scaledStats
    ? scaledStats.spellcasting
    : creature.packSource === 'custom'
      ? (creature.customData?.spellcasting ?? [])
      : importSpellcasting(creature);
  const hasSpellcasting = spellcastingEntries.length > 0;
  const publicNotes = c.system?.details?.publicNotes ?? '';
  const publication = c.system?.details?.publication?.title;

  // Construct GitHub raw URL for creature image; skip generic default icons
  const imgPath = c.img;
  const isDefaultIcon = !imgPath || imgPath.includes('default-icons') || imgPath.endsWith('mystery-man.webp');
  const imageUrl = isDefaultIcon
    ? null
    : `https://raw.githubusercontent.com/foundryvtt/pf2e/v14-dev/static/${imgPath.replace('systems/pf2e/', '')}`;

  return (
    <div className={styles.content} onClick={handleBodyClick}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.creatureName}>
            {c.name}{activeEliteWeak === 'elite' ? ' (Elite)' : activeEliteWeak === 'weak' ? ' (Weak)' : ''}
            {activeScaledLevel != null && (
              <span className={styles.scaledBadge}> ⇅ Lv {activeScaledLevel}</span>
            )}
          </span>
          <span className={styles.creatureLevel}>
            {creature.entityType === 'hazard' ? 'Hazard' : 'Creature'}{' '}
            {activeScaledLevel != null
              ? activeEliteWeak ? eliteWeakLevel(activeScaledLevel, activeEliteWeak) : activeScaledLevel
              : activeEliteWeak ? eliteWeakLevel(level, activeEliteWeak) : level}
            {activeEliteWeak && ` (base ${activeScaledLevel ?? level})`}
            {activeScaledLevel != null && !activeEliteWeak && ` (base ${level})`}
            {creature.entityType !== 'hazard' && ` · ${size}`}
          </span>
        </div>
        <div className={styles.headerActions}>
          {creature.packSource !== 'custom' && (
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
          {creature.packSource === 'custom' && onEdit && (
            <button className={styles.editBtn} onClick={() => onEdit(creature)} title="Edit custom creature">
              ✎
            </button>
          )}
          {onCopyAsCustom && (
            <button className={styles.copyBtn} onClick={() => onCopyAsCustom(creature)} title="Copy and edit as custom creature">
              ⧉
            </button>
          )}
          {/* Level scaling button — only shown when creature is in an encounter instance */}
          {onSetScaledLevel && creature.entityType !== 'hazard' && (
            <div className={styles.scaleWrap}>
              <button
                className={`${styles.scaleBtn} ${activeScaledLevel != null ? styles.scaleBtnActive : ''}`}
                title="Scale creature to a different level"
                onClick={e => { e.stopPropagation(); setScaleDropdownOpen(o => !o); }}
              >
                ⇅
              </button>
              {scaleDropdownOpen && (
                <div className={styles.scaleDropdown}>
                  <div className={styles.scaleDropdownHeader}>Scale to level</div>
                  {activeScaledLevel != null && (
                    <button
                      className={styles.scaleDropdownRemove}
                      onClick={() => { onSetScaledLevel(undefined); setScaleDropdownOpen(false); }}
                    >
                      ✕ Remove scaling
                    </button>
                  )}
                  <div className={styles.scaleDropdownList}>
                    {Array.from({ length: 27 }, (_, i) => i - 1).filter(l => l !== level).map(l => (
                      <button
                        key={l}
                        className={`${styles.scaleDropdownItem} ${activeScaledLevel === l ? styles.scaleDropdownItemActive : ''}`}
                        onClick={() => { onSetScaledLevel(l); setScaleDropdownOpen(false); }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close statblock">
            ✕
          </button>
        </div>
      </div>

      {/* Traits */}
      <div className={styles.traitsRow}>
        {allTraits.map(t => (
          <span
            key={t}
            className={styles.traitChip}
            style={{ background: traitColor(t.toLowerCase(), rarity) }}
          >
            {t}
          </span>
        ))}
      </div>

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
          const effectiveLevel = activeScaledLevel != null
            ? (activeEliteWeak ? eliteWeakLevel(activeScaledLevel, activeEliteWeak) : activeScaledLevel)
            : (activeEliteWeak ? eliteWeakLevel(level, activeEliteWeak) : level);
          const rk = getRecallKnowledge(effectiveLevel, traits, rarity);
          return (
            <p className={styles.rkLine}>
              <span className={styles.rkLineLabel}>Recall Knowledge DC </span>
              <span
                className={styles.rkLineDc}
                style={(activeScaledLevel != null || activeEliteWeak) ? { color: '#2a7a6a', fontWeight: 700 } : undefined}
              >{rk.dc}</span>
              {rk.skills.length > 0 && (
                <span className={styles.rkLineSkills}> ({rk.skills.join(' / ')})</span>
              )}
            </p>
          );
        })()}

        {/* Level scaling banner */}
        {activeScaledLevel != null && (
          <p className={styles.eliteWeakBanner} style={{ borderColor: '#2a7a6a', background: 'rgba(42,122,106,0.08)' }}>
            <strong style={{ color: '#2a7a6a' }}>⇅ Scaled to Level {activeScaledLevel}</strong>
            {' '}
            <span style={{ color: 'var(--text-mute)' }}>
              All stats recalculated from base level {level}.
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

        {/* Perception / Senses */}
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
                  title="Roll Perception"
                  onClick={e => roll(effPercMod, 'Perception', e)}
                  style={percStyle}
                >
                  <strong>Perception</strong> {formatMod(effPercMod)}
                </span>
                {rest ? `; ${rest}` : ''}
              </>
            );
          })()}
        </p>

        {/* Custom creature Skills (from customData) */}
        {creature.packSource === 'custom' && (creature.customData?.skills ?? []).length > 0 && (
          <p className={styles.infoLine}>
            <strong>Skills</strong>{' '}
            {(creature.customData!.skills!).map((sk, i) => {
              const effMod = sk.mod + ewMod;
              return (
                <span key={sk.name + i}>
                  {i > 0 && ', '}
                  <span
                    className={styles.rollMod}
                    title={`Roll ${sk.name}`}
                    onClick={e => roll(effMod, sk.name, e)}
                    style={ewMod !== 0 ? ewStyle : undefined}
                  >
                    {sk.name} {formatMod(effMod)}
                  </span>
                </span>
              );
            })}
          </p>
        )}

        {/* Languages — for custom creatures use customData.languages; for official use system blob */}
        {creature.packSource === 'custom'
          ? (creature.customData?.languages ?? []).length > 0 && (
              <p className={styles.infoLine}>
                <strong>Languages</strong> {creature.customData!.languages!.join(', ')}
              </p>
            )
          : langs && (
              <p className={styles.infoLine}>
                <strong>Languages</strong> {langs}
              </p>
            )
        }

        {/* Skills */}
        {skills.length > 0 && (
          <p className={styles.infoLine}>
            <strong>Skills</strong>{' '}
            {skills.map((s, i) => {
              const effSkillMod = s.mod + ewMod;
              return (
                <span key={s.name}>
                  {i > 0 && ', '}
                  <span
                    className={styles.rollMod}
                    title={`Roll ${skillDisplayName(s.name)}`}
                    onClick={e => roll(effSkillMod, skillDisplayName(s.name), e)}
                    style={ewMod !== 0 ? ewStyle : undefined}
                  >
                    {skillDisplayName(s.name)} {formatMod(effSkillMod)}
                  </span>
                </span>
              );
            })}
          </p>
        )}

        {/* Ability scores */}
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
                title={`Roll ${label} check`}
                onClick={e => roll(mod, label, e)}
              >
                <strong>{label}</strong> {formatMod(mod)}
              </span>
            </span>
          ))}
        </p>

        <hr className={styles.divider} />

        {/* AC + Saves */}
        {(() => {
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
                title="Roll Fortitude"
                onClick={e => roll(effFort, 'Fortitude', e)}
                style={fortStyle}
              >
                <strong>Fort</strong> {formatMod(effFort)}
              </span>
              {fortDetail && `, ${fortDetail}`},{' '}
              <span
                className={styles.rollMod}
                title="Roll Reflex"
                onClick={e => roll(effRef, 'Reflex', e)}
                style={refStyle}
              >
                <strong>Ref</strong> {formatMod(effRef)}
              </span>
              {refDetail && `, ${refDetail}`},{' '}
              <span
                className={styles.rollMod}
                title="Roll Will"
                onClick={e => roll(effWill, 'Will', e)}
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


        {/* HP */}
        {(() => {
          const hpDelta = activeEliteWeak && typeof hp === 'number' ? eliteWeakHpDelta(level, activeEliteWeak) : 0;
          const effHp = typeof hp === 'number' ? Math.max(1, hp + hpDelta) : hp;
          return (
            <p className={styles.defenseLine}>
              <strong>HP</strong>{' '}
              <span style={hpDelta !== 0 ? ewStyle : undefined}>{effHp}</span>
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

        {passives.map(item => (
          <ItemBlock key={item._id} item={item} onRollAll={rollAllDamage} ewMod={ewMod} ewStyle={ewStyle} baseLevel={level} targetLevel={scaledStats?.targetLevel} />
        ))}
        {reactions.map(item => (
          <ItemBlock key={item._id} item={item} onRollAll={rollAllDamage} ewMod={ewMod} ewStyle={ewStyle} baseLevel={level} targetLevel={scaledStats?.targetLevel} />
        ))}

        <hr className={styles.divider} />

        <p className={styles.infoLine}>
          <strong>Speed</strong> {speed}
        </p>

        {attacks.map(item => (
          <AttackBlock
            key={item._id}
            item={item}
            onRollAttack={rollAttack}
            onRollDamage={rollDamage}
            conditions={activeConditionList}
            strMod={str}
            dexMod={dex}
            ewMod={ewMod}
            ewStyle={ewStyle}
          />
        ))}

        {/* Scaled attacks — rendered when level scaling is active (replaces both official and custom attacks) */}
        {scaledStats && scaledStats.attacks.map((atk, i) => {
          const bonus = atk.bonus + ewMod;
          const isAgile = atk.traits?.includes('agile') ?? false;
          const map2 = bonus - (isAgile ? 4 : 5);
          const map3 = bonus - (isAgile ? 8 : 10);
          const rangeStr = atk.range != null ? `range ${atk.range} ft.` : null;
          const fullTraitStr = [rangeStr, ...(atk.traits ?? [])].filter(Boolean).join(', ');
          const displayTraitStr = fullTraitStr ? `(${fullTraitStr})` : '';
          const damageExprMatch = atk.damage?.match(/(\d+d\d+)\s*([+-]\s*\d+)?/);
          const baseDamageExpr = damageExprMatch
            ? (damageExprMatch[2] ? `${damageExprMatch[1]}${damageExprMatch[2].replace(/\s/g, '')}` : damageExprMatch[1])
            : '';
          const ewDmgMod = ewMod;
          const damageExpr = baseDamageExpr && ewDmgMod !== 0
            ? `${baseDamageExpr}${ewDmgMod >= 0 ? `+${ewDmgMod}` : ewDmgMod}`
            : baseDamageExpr;
          const displayDamage = ewDmgMod !== 0 && damageExpr ? damageExpr : atk.damage;
          const damageLabel = `${atk.name} damage`;
          const typeLabel = atk.type === 'ranged' ? 'Ranged' : 'Melee';
          const scaledStyle = { color: '#2a7a6a', fontWeight: 700 } as const;
          const finalStyle = ewMod !== 0 ? ewStyle : scaledStyle;
          return (
            <p key={i} className={styles.attackLine}>
              <span className={styles.attackTypeLabel}>{typeLabel}</span>
              {' ◆ '}
              <span className={styles.rollMod} title="Roll attack (1st action)"
                style={finalStyle}
                onClick={e => rollAttack(bonus, atk.name, damageExpr ?? '', damageLabel, atk.traits ?? [], e)}>
                <strong>{atk.name}</strong> {formatMod(bonus)}
              </span>
              {' ['}
              <span className={styles.mapRoll} title="Roll attack (2nd action, MAP)"
                onClick={e => rollAttack(map2, `${atk.name} (MAP 2)`, damageExpr ?? '', damageLabel, atk.traits ?? [], e)}>
                {formatMod(map2)}
              </span>
              {'/'}
              <span className={styles.mapRoll} title="Roll attack (3rd action, MAP)"
                onClick={e => rollAttack(map3, `${atk.name} (MAP 3)`, damageExpr ?? '', damageLabel, atk.traits ?? [], e)}>
                {formatMod(map3)}
              </span>
              {']'}
              {displayTraitStr && <span className={styles.attackTraits}> {displayTraitStr}</span>}
              {atk.damage && (
                <>
                  {', '}
                  {damageExpr ? (
                    <span className={styles.rollMod} title="Roll damage"
                      style={finalStyle}
                      onClick={e => rollDamage(damageExpr, damageLabel, atk.traits ?? [], e)}>
                      <strong>Damage</strong> {displayDamage}
                    </span>
                  ) : (
                    <><strong>Damage</strong> {displayDamage}</>
                  )}
                </>
              )}
            </p>
          );
        })}

        {/* Custom creature attacks (stored in customData, not items) — suppressed when scaling active */}
        {!scaledStats && creature.packSource === 'custom' && (creature.customData?.attacks ?? []).map((atk, i) => {
          const bonus = atk.bonus + ewMod;
          const isAgile = atk.traits?.includes('agile') ?? false;
          const map2 = bonus - (isAgile ? 4 : 5);
          const map3 = bonus - (isAgile ? 8 : 10);
          const rangeStr = atk.range != null ? `range ${atk.range} ft.` : null;
          const fullTraitStr = [rangeStr, ...(atk.traits ?? [])].filter(Boolean).join(', ');
          const displayTraitStr = fullTraitStr ? `(${fullTraitStr})` : '';
          const damageExprMatch = atk.damage?.match(/(\d+d\d+)\s*([+-]\s*\d+)?/);
          const baseDamageExpr = damageExprMatch
            ? (damageExprMatch[2] ? `${damageExprMatch[1]}${damageExprMatch[2].replace(/\s/g, '')}` : damageExprMatch[1])
            : '';
          const ewDmgMod = ewMod; // ±2 damage for standard at-will strikes
          const damageExpr = baseDamageExpr && ewDmgMod !== 0
            ? `${baseDamageExpr}${ewDmgMod >= 0 ? `+${ewDmgMod}` : ewDmgMod}`
            : baseDamageExpr;
          const displayDamage = ewDmgMod !== 0 && damageExpr ? damageExpr : atk.damage;
          const damageLabel = `${atk.name} damage`;
          const typeLabel = atk.type === 'ranged' ? 'Ranged' : 'Melee';
          return (
            <p key={i} className={styles.attackLine}>
              <span className={styles.attackTypeLabel}>{typeLabel}</span>
              {' ◆ '}
              <span className={styles.rollMod} title="Roll attack (1st action)"
                style={ewMod !== 0 ? ewStyle : undefined}
                onClick={e => rollAttack(bonus, atk.name, damageExpr ?? '', damageLabel, atk.traits ?? [], e)}>
                <strong>{atk.name}</strong> {formatMod(bonus)}
              </span>
              {' ['}
              <span className={styles.mapRoll} title="Roll attack (2nd action, MAP)"
                onClick={e => rollAttack(map2, `${atk.name} (MAP 2)`, damageExpr ?? '', damageLabel, atk.traits ?? [], e)}>
                {formatMod(map2)}
              </span>
              {'/'}
              <span className={styles.mapRoll} title="Roll attack (3rd action, MAP)"
                onClick={e => rollAttack(map3, `${atk.name} (MAP 3)`, damageExpr ?? '', damageLabel, atk.traits ?? [], e)}>
                {formatMod(map3)}
              </span>
              {']'}
              {displayTraitStr && <span className={styles.attackTraits}> {displayTraitStr}</span>}
              {atk.damage && (
                <>
                  {', '}
                  {damageExpr ? (
                    <span className={styles.rollMod} title="Roll damage"
                      style={ewMod !== 0 ? ewStyle : undefined}
                      onClick={e => rollDamage(damageExpr, damageLabel, atk.traits ?? [], e)}>
                      <strong>Damage</strong> {displayDamage}
                    </span>
                  ) : (
                    <><strong>Damage</strong> {displayDamage}</>
                  )}
                </>
              )}
            </p>
          );
        })}

        {/* Spellcasting — rendered the same way for both official and custom creatures */}
        {spellcastingEntries.map((entry, ei) => (
          <SpellcastingBlock
            key={entry.id ?? ei}
            entry={entry}
            ewMod={ewMod}
            ewStyle={ewStyle}
            onRollAll={rollAllDamage}
          />
        ))}

        {offenseActions.map(item => (
          <ItemBlock key={item._id} item={item} onRollAll={rollAllDamage} ewMod={ewMod} ewStyle={ewStyle} baseLevel={level} targetLevel={scaledStats?.targetLevel} />
        ))}

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
        {creature.packSource === 'custom' && (creature.customData?.abilities ?? []).map((ab, i) => {
          const actionSymbols: Record<string, string> = {
            single: ' ◆', two: ' ◆◆', three: ' ◆◆◆', reaction: ' ↺', free: ' ◇', passive: '',
          };
          const sym = ab.actionType ? (actionSymbols[ab.actionType] ?? '') : '';
          const limited = ab.frequency != null && ab.frequency !== '';
          const dmgMod = ewMod !== 0 ? (limited ? (ewMod > 0 ? 4 : -4) : (ewMod > 0 ? 2 : -2)) : 0;
          const dcMod = ewMod !== 0 ? (ewMod > 0 ? 2 : -2) : 0;
          const rawDesc = ab.description ?? '';
          // Apply level scaling first (if active), then elite/weak on top
          const scaledDesc = scaledStats ? scaleAbilityHtml(rawDesc, level, scaledStats.targetLevel) : rawDesc;
          const adjustedDesc = (dmgMod !== 0 || dcMod !== 0) ? applyEliteWeakToHtml(scaledDesc, dmgMod, dcMod) : scaledDesc;
          const damageGroups = adjustedDesc ? extractDamageGroups(adjustedDesc) : [];
          const hasDamage = damageGroups.length > 0;
          return (
            <div key={i} className={styles.itemBlock}>
              <p className={styles.itemHeader}>
                <strong className={styles.itemName}>{ab.name}</strong>
                {sym && <span className={styles.actionSymbol}>{sym}</span>}
                {ab.trigger && (
                  <> <strong>Trigger</strong> {ab.trigger};</>
                )}
                {ab.requirements && (
                  <> <strong>Requirements</strong> {ab.requirements};</>
                )}
                {ab.frequency && (
                  <> <strong>Frequency</strong> {ab.frequency}</>
                )}
              </p>
              {adjustedDesc && (
                <div
                  className={styles.itemDesc}
                  dangerouslySetInnerHTML={{ __html: processHtml(adjustedDesc) }}
                />
              )}
              {hasDamage && (
                <button
                  className={styles.rollAllDmgBtn}
                  style={dmgMod !== 0 ? { borderColor: ewStyle?.color, color: ewStyle?.color } : undefined}
                  onClick={e => rollAllDamage(damageGroups, ab.name, e)}
                >
                  🎲 Roll damage {dmgMod !== 0 && <span className={styles.rollAllDmgMod}>({dmgMod > 0 ? `+${dmgMod}` : dmgMod})</span>}
                </button>
              )}
            </div>
          );
        })}

        {publicNotes && !hasSpellcasting && (
          <>
            <hr className={styles.divider} />
            <div className={styles.flavorBox}>
              <div
                className={styles.publicNotes}
                dangerouslySetInnerHTML={{ __html: processHtml(publicNotes) }}
              />
            </div>
          </>
        )}

        {creature.packSource === 'custom' && creature.customData?.flavorText && (
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
        <button className={styles.addToEncBtn} onClick={() => onAddToEncounter(creature)}>
          + Add to Encounter
        </button>

        {creature.packSource === 'custom' && onDelete && (
          confirmDelete ? (
            <div className={styles.deleteConfirm}>
              <span>Delete permanently?</span>
              <button className={styles.deleteConfirmBtn} onClick={() => onDelete(creature.id)}>Yes, delete</button>
              <button className={styles.deleteCancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          ) : (
            <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
              Delete Custom Creature
            </button>
          )
        )}
      </div>

      {diceRoll && (
        <DiceRoller
          expression={diceRoll.expr}
          label={diceRoll.label}
          damageExpr={diceRoll.damageExpr}
          damageLabel={diceRoll.damageLabel}
          damageTraits={diceRoll.damageTraits}
          anchorX={diceRoll.x}
          anchorY={diceRoll.y}
          onClose={() => setDiceRoll(null)}
          onRoll={onRoll}
        />
      )}
      {damageRoll && (
        <DamageRoller
          expression={damageRoll.expr}
          label={damageRoll.label}
          traits={damageRoll.traits}
          anchorX={damageRoll.x}
          anchorY={damageRoll.y}
          onClose={() => setDamageRoll(null)}
          onRoll={onRoll}
        />
      )}
      {multiDamageRoll && (
        <MultiDamageRoller
          groups={multiDamageRoll.groups}
          abilityName={multiDamageRoll.abilityName}
          anchorX={multiDamageRoll.x}
          anchorY={multiDamageRoll.y}
          onClose={() => setMultiDamageRoll(null)}
          onRoll={onRoll}
        />
      )}
    </div>
  );
}

function AttackBlock({ item, onRollAttack, onRollDamage, conditions = [], strMod, dexMod, ewMod = 0, ewStyle }: {
  item: PF2EItem;
  onRollAttack: (mod: number, label: string, damageExpr: string, damageLabel: string, damageTraits: string[], e: React.MouseEvent) => void;
  onRollDamage: (expr: string, label: string, traits: string[], e: React.MouseEvent) => void;
  conditions?: Condition[];
  strMod?: number;
  dexMod?: number;
  ewMod?: number;
  ewStyle?: React.CSSProperties;
}) {
  const bonus = item.system?.bonus?.value;
  const damage = getDamageString(item.system?.damageRolls);
  const traits = item.system?.traits?.value ?? [];
  const effects = item.system?.attackEffects?.value ?? [];

  const isRanged =
    item.type === 'ranged' ||
    item.system?.category === 'ranged' ||
    item.system?.range?.increment != null ||
    traits.some(t => t.startsWith('thrown'));
  const attackType = isRanged ? 'ranged' : 'melee';
  const typeLabel = isRanged ? 'Ranged' : 'Melee';
  const isAgile = traits.includes('agile');

  // Condition-aware penalties for this specific attack
  const atkRollPen = computeAttackPenalty(conditions, attackType, traits, strMod, dexMod);
  const dmgPen = computeDamagePenalty(conditions, attackType, traits);
  const isDebuffedAtk = atkRollPen !== 0;
  const isDebuffedDmg = dmgPen !== 0;
  const debuffStyle = { color: '#c0392b', fontWeight: 700 } as const;

  // Elite/Weak: +2 attack; +2 damage for standard at-will strikes
  const ewDmgMod = ewMod;

  const effBonus = bonus != null ? bonus + atkRollPen + ewMod : null;
  const map2 = effBonus != null ? effBonus - (isAgile ? 4 : 5) : null;
  const map3 = effBonus != null ? effBonus - (isAgile ? 8 : 10) : null;

  const range = item.system?.range;
  const rangeDisplay =
    range?.increment != null
      ? `range increment ${range.increment} feet`
      : range?.value
        ? `range ${range.value} feet`
        : null;

  const displayTraits = rangeDisplay ? [...traits, rangeDisplay] : traits;
  const traitStr = displayTraits.length > 0 ? `(${displayTraits.join(', ')})` : '';
  // Traits get keyword tooltips only — no dice linking (trait names like "deadly-2d10" or "reload-0" are not rollable)
  const traitHtml = traitStr ? linkKeywords(`<span>${traitStr}</span>`).replace(/^<span>/, '').replace(/<\/span>$/, '') : '';
  const fullDamage = [damage, ...effects].filter(Boolean).join(' plus ');

  // Extract the first dice+modifier from fullDamage, tolerating spaces
  const damageExprMatch = fullDamage.match(/(\d+d\d+)\s*([+-]\s*\d+)?/);
  const baseDamageExpr = damageExprMatch
    ? (damageExprMatch[2]
        ? `${damageExprMatch[1]}${damageExprMatch[2].replace(/\s/g, '')}`
        : damageExprMatch[1])
    : '';
  // Combine condition damage penalty and elite/weak damage modifier
  const totalDmgMod = dmgPen + ewDmgMod;
  const damageExpr = baseDamageExpr && totalDmgMod !== 0
    ? `${baseDamageExpr}${totalDmgMod >= 0 ? `+${totalDmgMod}` : totalDmgMod}`
    : baseDamageExpr;
  const damageLabel = `${item.name} damage`;

  function fireAttack(mod: number, mapLabel: string, e: React.MouseEvent) {
    onRollAttack(mod, `${item.name}${mapLabel}`, damageExpr, damageLabel, traits, e);
  }

  // Display damage string: show adjusted expression if debuffed or elite/weak adjusted, otherwise raw text
  const displayDamage = (isDebuffedDmg || ewDmgMod !== 0) && damageExpr ? damageExpr : fullDamage;

  return (
    <p className={styles.attackLine}>
      <span className={styles.attackTypeLabel}>{typeLabel}</span>
      {' ◆ '}
      {effBonus != null ? (
        <>
          {/* Primary attack: name + bonus */}
          <span
            className={styles.rollMod}
            title="Roll attack (1st action)"
            style={isDebuffedAtk ? debuffStyle : ewMod !== 0 ? ewStyle : undefined}
            onClick={e => fireAttack(effBonus, '', e)}
          >
            <strong>{item.name}</strong> {formatMod(effBonus)}
          </span>
          {/* MAP brackets — each individually clickable */}
          {map2 != null && map3 != null && (
            <span className={styles.mapBracket} style={isDebuffedAtk ? { color: '#c0392b' } : ewMod !== 0 ? { color: ewStyle?.color } : undefined}>
              {' ['}
              <span
                className={styles.mapRoll}
                title="Roll attack (2nd action, MAP)"
                onClick={e => fireAttack(map2, ' (MAP 2)', e)}
              >
                {formatMod(map2)}
              </span>
              {'/'}
              <span
                className={styles.mapRoll}
                title="Roll attack (3rd action, MAP)"
                onClick={e => fireAttack(map3, ' (MAP 3)', e)}
              >
                {formatMod(map3)}
              </span>
              {']'}
            </span>
          )}
        </>
      ) : (
        <strong>{item.name}</strong>
      )}
      {traitHtml && (
        <>
          {' '}
          <span
            className={styles.attackTraits}
            dangerouslySetInnerHTML={{ __html: traitHtml }}
          />
        </>
      )}
      {fullDamage && (
        <>
          {', '}
          {damageExpr ? (
            <span
              className={styles.rollMod}
              title="Roll damage"
              style={isDebuffedDmg ? debuffStyle : ewDmgMod !== 0 ? ewStyle : undefined}
              onClick={e => onRollDamage(damageExpr, damageLabel, traits, e)}
            >
              <strong>Damage</strong> {displayDamage}
            </span>
          ) : (
            <><strong>Damage</strong> {fullDamage}</>
          )}
        </>
      )}
    </p>
  );
}

function ItemBlock({ item, onRollAll, ewMod = 0, ewStyle, baseLevel, targetLevel }: {
  item: PF2EItem;
  onRollAll?: (groups: DamageGroup[], abilityName: string, e: React.MouseEvent) => void;
  ewMod?: number;
  ewStyle?: React.CSSProperties;
  baseLevel?: number;
  targetLevel?: number;
}) {
  const symbol = actionSymbol(item);
  const rawDesc = item.system?.description?.value ?? '';
  const traits = item.system?.traits?.value ?? [];
  const trigger = item.system?.trigger?.value;
  const traitStr = traits.length > 0 ? `(${traits.join(', ')})` : '';

  // Apply level scaling first (if active), then elite/weak on top
  const scaledDesc = (baseLevel != null && targetLevel != null && baseLevel !== targetLevel)
    ? scaleAbilityHtml(rawDesc, baseLevel, targetLevel)
    : rawDesc;

  // Determine elite/weak damage modifier for this ability
  const limited = isLimitedUse(item);
  const dmgMod = ewMod !== 0
    ? (limited ? (ewMod > 0 ? 4 : -4) : (ewMod > 0 ? 2 : -2))
    : 0;

  // DC adjustment is always ±2; damage mod is ±2 (at-will) or ±4 (limited)
  const dcMod = ewMod !== 0 ? (ewMod > 0 ? 2 : -2) : 0;
  const adjustedDesc = (dmgMod !== 0 || dcMod !== 0)
    ? applyEliteWeakToHtml(scaledDesc, dmgMod, dcMod)
    : scaledDesc;

  // Extract damage groups from the (adjusted) raw description
  const damageGroups = adjustedDesc ? extractDamageGroups(adjustedDesc) : [];
  const hasDamage = damageGroups.length > 0 && onRollAll != null;

  return (
    <div className={styles.itemBlock}>
      <p className={styles.itemHeader}>
        <strong className={styles.itemName}>{item.name}</strong>
        {symbol && <span className={styles.actionSymbol}>{symbol}</span>}
        {traitStr && <span className={styles.itemTraits}> {traitStr}</span>}
        {trigger && (
          <>
            {' '}
            <strong>Trigger</strong> {trigger};
          </>
        )}
      </p>
      {adjustedDesc && (
        <div
          className={styles.itemDesc}
          dangerouslySetInnerHTML={{ __html: processHtml(adjustedDesc) }}
        />
      )}
      {hasDamage && (
        <button
          className={styles.rollAllDmgBtn}
          style={dmgMod !== 0 ? { borderColor: ewStyle?.color, color: ewStyle?.color } : undefined}
          onClick={e => onRollAll!(damageGroups, item.name, e)}
        >
          🎲 Roll damage {dmgMod !== 0 && <span className={styles.rollAllDmgMod}>({dmgMod > 0 ? `+${dmgMod}` : dmgMod})</span>}
        </button>
      )}
    </div>
  );
}

// ── Spell popup (shared between custom and official spellcasting) ──────────────

function SpellPopup({ name, description, traits, ewMod, ewStyle, onRollAll, anchorRef, onClose }: {
  name: string;
  description: string;
  traits?: string[];
  ewMod: number;
  ewStyle?: React.CSSProperties;
  onRollAll?: (groups: DamageGroup[], name: string, e: React.MouseEvent) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const traitStr = traits && traits.length > 0 ? `(${traits.join(', ')})` : '';
  const limited = /1\/day|2\/day|3\/day|focus/i.test(description);
  const dmgMod = ewMod !== 0 ? (limited ? (ewMod > 0 ? 4 : -4) : (ewMod > 0 ? 2 : -2)) : 0;
  const dcMod = ewMod !== 0 ? (ewMod > 0 ? 2 : -2) : 0;
  const adjustedDesc = (dmgMod !== 0 || dcMod !== 0) ? applyEliteWeakToHtml(description, dmgMod, dcMod) : description;
  const damageGroups = adjustedDesc ? extractDamageGroups(adjustedDesc) : [];
  const hasDamage = damageGroups.length > 0 && onRollAll != null;
  const html = processHtml(adjustedDesc);

  // Compute viewport-clamped position from anchor element
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxH: number } | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const POPUP_W = 320;
    const POPUP_MAX_H = 420;
    const MARGIN = 8;
    const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;
    // Open below unless above has meaningfully more room and below is tight
    let posResult: { top?: number; bottom?: number; left: number; maxH: number };
    // Align left with anchor; clamp so popup stays within viewport
    let left = rect.left;
    if (left + POPUP_W > window.innerWidth - MARGIN) {
      left = window.innerWidth - POPUP_W - MARGIN;
    }
    left = Math.max(MARGIN, left);
    const fitsBelow = spaceBelow >= POPUP_MAX_H;
    const openBelow = fitsBelow || spaceBelow >= spaceAbove;
    if (openBelow) {
      // Below: anchor top edge at rect.bottom, let max-height clip naturally
      posResult = { top: rect.bottom + 4, left, maxH: Math.min(POPUP_MAX_H, spaceBelow) };
    } else {
      // Above: anchor bottom edge just above the clicked link using CSS bottom
      posResult = { bottom: window.innerHeight - rect.top + 4, left, maxH: Math.min(POPUP_MAX_H, spaceAbove) };
    }
    setPos(posResult);
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  if (!pos) return null;

  return (
    <div
      ref={popupRef}
      className={styles.spellPopup}
      style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxH }}
    >
      <div className={styles.spellPopupHeader}>
        <strong className={styles.itemName}>{name}</strong>
        {traitStr && <span className={styles.itemTraits}> {traitStr}</span>}
        <button className={styles.spellPopupClose} onClick={onClose}>✕</button>
      </div>
      {html && (
        <div
          className={styles.itemDesc}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {hasDamage && (
        <button
          className={styles.rollAllDmgBtn}
          style={dmgMod !== 0 ? { borderColor: ewStyle?.color, color: ewStyle?.color } : undefined}
          onClick={e => { onRollAll!(damageGroups, name, e); onClose(); }}
        >
          🎲 Roll damage {dmgMod !== 0 && <span className={styles.rollAllDmgMod}>({dmgMod > 0 ? `+${dmgMod}` : dmgMod})</span>}
        </button>
      )}
    </div>
  );
}

// Inline clickable spell name that opens a popup
function SpellNameLink({ spell, ewMod, ewStyle, onRollAll }: {
  spell: { name: string; description: string; traits?: string[] };
  ewMod: number;
  ewStyle?: React.CSSProperties;
  onRollAll?: (groups: DamageGroup[], name: string, e: React.MouseEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span className={styles.spellNameWrap}>
      <span
        ref={ref}
        className={styles.spellNameLink}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title={`View ${spell.name}`}
      >
        {spell.name}
      </span>
      {open && (
        <SpellPopup
          name={spell.name}
          description={spell.description}
          traits={spell.traits}
          ewMod={ewMod}
          ewStyle={ewStyle}
          onRollAll={onRollAll}
          anchorRef={ref}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}

const SPELL_ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

// Compact inline spellcasting block — matches the style in the reference image
function SpellcastingBlock({ entry, ewMod = 0, ewStyle, onRollAll }: {
  entry: CustomSpellcastingEntry;
  ewMod?: number;
  ewStyle?: React.CSSProperties;
  onRollAll?: (groups: DamageGroup[], name: string, e: React.MouseEvent) => void;
}) {
  const dcMod = ewMod !== 0 ? (ewMod > 0 ? 2 : -2) : 0;
  const effDc = entry.dc + dcMod;
  const effAtk = entry.attackMod + ewMod;
  const traditionLabel = entry.tradition.charAt(0).toUpperCase() + entry.tradition.slice(1);
  const typeLabel = entry.type === 'innate' ? 'Innate' : entry.type === 'spontaneous' ? 'Spontaneous' : 'Prepared';

  // Build rank/frequency groups
  type SpellGroup = { label: string; spells: CustomSpell[]; sortKey: number };
  const groups: SpellGroup[] = [];

  if (entry.type === 'innate') {
    const byFreq: Record<string, CustomSpell[]> = {};
    for (const sp of entry.spells) {
      const key = sp.frequency ?? 'at-will';
      if (!byFreq[key]) byFreq[key] = [];
      byFreq[key].push(sp);
    }
    const ORDER: Array<[string, string, number]> = [
      ['constant', 'Constant', 0],
      ['at-will', 'At Will', 1],
      ['cantrip', 'Cantrips (At Will)', 2],
      ['focus', `Focus (${entry.focusPoints ?? 1})`, 3],
      ['3/day', '3/Day', 4],
      ['2/day', '2/Day', 5],
      ['1/day', '1/Day', 6],
    ];
    for (const [key, label, sortKey] of ORDER) {
      if (byFreq[key]?.length) groups.push({ label, spells: byFreq[key], sortKey });
    }
  } else {
    // Prepared / spontaneous: group by rank descending, cantrips last
    const byRank: Record<number, CustomSpell[]> = {};
    for (const sp of entry.spells) {
      const rank = sp.rank ?? 0;
      if (!byRank[rank]) byRank[rank] = [];
      byRank[rank].push(sp);
    }
    const ranks = Object.keys(byRank).map(Number).sort((a, b) => {
      if (a === 0) return 1; if (b === 0) return -1; return b - a;
    });
    for (const rank of ranks) {
      const label = rank === 0
        ? `Cantrips (${SPELL_ORDINALS[entry.spells.filter(s => (s.rank ?? 0) > 0).reduce((m, s) => Math.max(m, s.rank ?? 0), 1)]})`
        : (SPELL_ORDINALS[rank] ?? `Rank ${rank}`);
      groups.push({ label, spells: byRank[rank], sortKey: rank === 0 ? -1 : rank });
    }
  }

  return (
    <p className={styles.spellcastingLine}>
      <strong>{traditionLabel} {typeLabel} Spells</strong>
      {' '}
      <strong>DC</strong>{' '}
      <span style={ewMod !== 0 ? ewStyle : undefined}>{effDc}</span>
      {entry.attackMod !== 0 && (
        <>, <strong>attack</strong>{' '}
          <span style={ewMod !== 0 ? ewStyle : undefined}>{formatMod(effAtk)}</span>
        </>
      )}
      {'; '}
      {groups.map((grp, gi) => (
        <span key={grp.label}>
          {gi > 0 && '; '}
          <strong>{grp.label}</strong>{' '}
          {grp.spells.map((sp, si) => (
            <span key={sp.name + si}>
              {si > 0 && ', '}
              <SpellNameLink spell={sp} ewMod={ewMod} ewStyle={ewStyle} onRollAll={onRollAll} />
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}


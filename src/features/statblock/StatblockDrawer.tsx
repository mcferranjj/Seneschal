
import { useState, useCallback, useEffect } from 'react';
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature } from '../../types/pf2e';
import type { RollHistoryEntry } from '../../types/diceHistory';
import type { Condition, CustomSpellcastingEntry } from '../../types/encounter';
import { computePenalties } from '../../types/conditionEffects';
import { DiceRoller, MultiDamageRoller } from '../dice/DiceRoller';
import { CustomCreatureWizard } from '../custom-creature/CustomCreatureWizard';
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
  extractDamageGroups,
  applyEliteWeakToHtml,
  processFoundryHtml,
} from './statblockHelpers';
import { getRecallKnowledge } from '../encounter/EncounterManager';
import { importSpellcasting } from '../../utils/importCreature';
import { buildScaledCreature, scaleAbilityHtml, eliteWeakHpDelta, eliteWeakLevel } from '../../utils/levelScaling';
import { traitColor } from '../../utils/traitColors';
import { useRollState } from '../../hooks/useRollState';
import { AttackBlock } from './AttackBlock';
import { AttackLine } from './AttackLine';
import { ItemBlock } from './ItemBlock';
import { SpellcastingBlock } from './SpellcastingBlock';
import styles from './StatblockDrawer.module.css';

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
    diceRoll, multiDamageRoll,
    clearRolls,
    roll, rollAttack, rollDamage, rollExpr,
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

  // Unified languages: custom creatures store them in customData; official creatures in the system blob
  const langs = creature.packSource === 'custom'
    ? (creature.customData?.languages ?? []).join(', ')
    : getLanguages(c);

  // Unified skills: custom creatures store them in customData; official creatures in the system blob.
  // Both shapes are normalized to { name: string; mod: number } for rendering.
  const rawSkills = scaledStats
    ? scaledStats.skills
    : creature.packSource === 'custom'
      ? (creature.customData?.skills ?? []).map(sk => ({ name: sk.name, mod: sk.mod }))
      : getSkills(c);
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

        {/* Languages — unified for both custom and official creatures */}
        {langs && (
          <p className={styles.infoLine}>
            <strong>Languages</strong> {langs}
          </p>
        )}

        {/* Skills — unified for both custom and official creatures */}
        {rawSkills.length > 0 && (
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
                    title={`Roll ${displayName}`}
                    onClick={e => roll(effSkillMod, displayName, e)}
                    style={ewMod !== 0 ? ewStyle : undefined}
                  >
                    {displayName} {formatMod(effSkillMod)}
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
          <ItemBlock key={item._id} item={item} onRollAll={rollDamage} ewMod={ewMod} ewStyle={ewStyle} baseLevel={level} targetLevel={scaledStats?.targetLevel} />
        ))}
        {reactions.map(item => (
          <ItemBlock key={item._id} item={item} onRollAll={rollDamage} ewMod={ewMod} ewStyle={ewStyle} baseLevel={level} targetLevel={scaledStats?.targetLevel} />
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

        {/* Non-official attacks: scaled (when level scaling active) or custom creature attacks.
            Both paths share the same AttackLine rendering. Scaled attacks get a teal highlight
            style; custom attacks use the elite/weak style or none. */}
        {(() => {
          const scaledStyle = { color: '#2a7a6a', fontWeight: 700 } as const;
          const nonOfficialAttacks = scaledStats
            ? scaledStats.attacks.map(atk => ({ ...atk, isScaled: true as const }))
            : creature.packSource === 'custom'
              ? (creature.customData?.attacks ?? []).map(atk => ({ ...atk, isScaled: false as const }))
              : [];
          return nonOfficialAttacks.map((atk, i) => {
            const baseStyle = atk.isScaled ? scaledStyle : undefined;
            const atkStyle = ewMod !== 0 ? ewStyle : baseStyle;
            const effBonus = atk.bonus + ewMod;
            const isAgile = atk.traits?.includes('agile') ?? false;
            const damageExprMatch = atk.damage?.match(/(\d+d\d+)\s*([+-]\s*\d+)?/);
            const baseDamageExpr = damageExprMatch
              ? (damageExprMatch[2] ? `${damageExprMatch[1]}${damageExprMatch[2].replace(/\s/g, '')}` : damageExprMatch[1])
              : '';
            const damageExpr = baseDamageExpr && ewMod !== 0
              ? `${baseDamageExpr}${ewMod >= 0 ? `+${ewMod}` : ewMod}`
              : baseDamageExpr;
            const rangeDisplay = atk.range != null ? `range ${atk.range} ft.` : undefined;
            const damageLabel = `${atk.name} damage`;
            return (
              <AttackLine
                key={i}
                name={atk.name}
                type={atk.type}
                bonus={effBonus}
                damage={atk.damage ?? ''}
                damageExpr={damageExpr}
                damageModified={ewMod !== 0}
                traits={atk.traits ?? []}
                rangeDisplay={rangeDisplay}
                attackStyle={atkStyle}
                damageStyle={atkStyle}
                isAgile={isAgile}
                onRollAttack={(mod, label, e) => rollAttack(mod, label, damageExpr ? [{ expr: damageExpr, label: 'damage' }] : [], damageLabel, atk.traits ?? [], e)}
                onRollDamage={e => rollDamage(damageExpr ? [{ expr: damageExpr, label: 'damage' }] : [], damageLabel, atk.traits ?? [], e)}
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
          <ItemBlock key={item._id} item={item} onRollAll={rollDamage} ewMod={ewMod} ewStyle={ewStyle} baseLevel={level} targetLevel={scaledStats?.targetLevel} />
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
                  dangerouslySetInnerHTML={{ __html: processFoundryHtml(adjustedDesc) }}
                />
              )}
              {hasDamage && (
                <button
                  className={styles.rollAllDmgBtn}
                  style={dmgMod !== 0 ? { borderColor: ewStyle?.color, color: ewStyle?.color } : undefined}
                  onClick={e => rollDamage(damageGroups, ab.name, [], e)}
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
                dangerouslySetInnerHTML={{ __html: processFoundryHtml(publicNotes) }}
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
    </div>
  );
}


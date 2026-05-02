import { useState, useCallback } from 'react';
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature, PF2EItem } from '../../types/pf2e';
import type { RollHistoryEntry } from '../../types/diceHistory';
import type { Condition } from '../../types/encounter';
import { computePenalties, computeAttackPenalty, computeDamagePenalty } from '../../types/conditionEffects';
import { DiceRoller, DamageRoller } from '../DiceRoller/DiceRoller';
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
} from './statblockHelpers';

function processHtml(raw: string): string {
  return linkRolls(linkKeywords(stripFoundryMacros(raw)));
}
import styles from './StatblockDrawer.module.css';

const TRAIT_RARITY_COLORS: Record<string, string> = {
  uncommon: '#8a6a18',
  rare: '#2a4a8a',
  unique: '#6a2a8a',
};

const TRAIT_ALIGNMENT_COLORS: Record<string, string> = {
  lg: '#2255aa',
  ng: '#2255aa',
  cg: '#2255aa',
  ln: '#555',
  n: '#555',
  cn: '#555',
  le: '#aa2222',
  ne: '#aa2222',
  ce: '#aa2222',
  good: '#2255aa',
  evil: '#aa2222',
  lawful: '#555',
  chaotic: '#555',
  neutral: '#555',
};

export function traitColor(trait: string, rarity: string): string {
  if (trait === rarity && TRAIT_RARITY_COLORS[rarity]) return TRAIT_RARITY_COLORS[rarity];
  return TRAIT_ALIGNMENT_COLORS[trait.toLowerCase()] ?? '#8b4513';
}

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
  partyLevel?: number;
  onWizardSave?: (creature: CreatureRecord) => void;
  onWizardCancel?: () => void;
  onDeleteCreature?: (id: string) => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
  /** Active conditions on the currently-selected creature in the encounter */
  activeConditions?: Condition[];
}

export function StatblockDrawer({
  creature,
  onClose,
  onAddToEncounter,
  wizardOpen,
  partyLevel = 1,
  onWizardSave,
  onWizardCancel,
  onDeleteCreature,
  onRoll,
  activeConditions,
}: DrawerProps) {
  return (
    <aside className={styles.drawer} aria-label="Creature statblock">
      {wizardOpen ? (
        <CustomCreatureWizard
          partyLevel={partyLevel}
          onSave={onWizardSave ?? (() => {})}
          onCancel={onWizardCancel ?? (() => {})}
        />
      ) : creature ? (
        creature.packSource === 'custom' ? (
          <CustomStatblock
            creature={creature}
            onClose={onClose}
            onAddToEncounter={onAddToEncounter}
            onDelete={onDeleteCreature}
            activeConditions={activeConditions}
          />
        ) : (
          <StatblockContent creature={creature} onClose={onClose} onAddToEncounter={onAddToEncounter} onRoll={onRoll} activeConditions={activeConditions} />
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

function CustomStatblock({
  creature,
  onClose,
  onAddToEncounter,
  onDelete,
  activeConditions,
}: {
  creature: CreatureRecord;
  onClose: () => void;
  onAddToEncounter: (c: CreatureRecord) => void;
  onDelete?: (id: string) => void;
  activeConditions?: Condition[];
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const c = creature.data as PF2ECreature;
  const hp = c.system?.attributes?.hp?.max ?? creature.customData?.attacks?.length ?? '—';
  const baseAc = c.system?.attributes?.ac?.value;
  const fort = (c.system as any)?.saves?.fortitude?.value;
  const ref  = (c.system as any)?.saves?.reflex?.value;
  const will = (c.system as any)?.saves?.will?.value;
  const attacks = creature.customData?.attacks ?? [];
  const abilities = creature.customData?.abilities ?? [];

  const pen = computePenalties(activeConditions ?? []);
  const debuffStyle = { color: '#c0392b', fontWeight: 700 } as const;

  const effAc   = baseAc != null ? baseAc + pen.ac : undefined;
  const effFort = fort   != null ? fort   + pen.fort : undefined;
  const effRef  = ref    != null ? ref    + pen.ref  : undefined;
  const effWill = will   != null ? will   + pen.will : undefined;

  function fmtMod(v?: number) {
    if (v == null) return '—';
    return v >= 0 ? `+${v}` : String(v);
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.creatureName}>{creature.name}</span>
          <span className={styles.creatureLevel}>Custom Creature {creature.level}</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close statblock">✕</button>
        </div>
      </div>

      <div className={styles.body}>
        <p className={styles.sourceLine}><em>Custom</em></p>

        {activeConditions && activeConditions.length > 0 && (
          <p className={styles.sourceLine} style={{ color: '#c0392b', fontStyle: 'normal' }}>
            <strong>Conditions:</strong>{' '}
            {activeConditions.map(cond => `${cond.name}${cond.value != null ? ` ${cond.value}` : ''}`).join(', ')}
          </p>
        )}

        <hr className={styles.divider} />

        <p className={styles.defenseLine}>
          <strong>AC</strong>{' '}
          <span style={pen.ac !== 0 ? debuffStyle : undefined}>{effAc ?? '—'}</span>;{' '}
          <strong>Fort</strong>{' '}
          <span style={pen.fort !== 0 ? debuffStyle : undefined}>{fmtMod(effFort)}</span>,{' '}
          <strong>Ref</strong>{' '}
          <span style={pen.ref !== 0 ? debuffStyle : undefined}>{fmtMod(effRef)}</span>,{' '}
          <strong>Will</strong>{' '}
          <span style={pen.will !== 0 ? debuffStyle : undefined}>{fmtMod(effWill)}</span>
        </p>
        <p className={styles.defenseLine}>
          <strong>HP</strong> {hp}
        </p>

        {attacks.length > 0 && (
          <>
            <hr className={styles.divider} />
            {attacks.map((atk, i) => (
              <p key={i} className={styles.attackLine}>
                <span className={styles.attackTypeLabel}>{atk.type === 'melee' ? 'Melee' : 'Ranged'}</span>
                {' ◆ '}
                <strong>{atk.name}</strong>
                {' '}{fmtMod(atk.bonus)}
                {atk.range != null && <span className={styles.attackTraits}> (range {atk.range} ft)</span>}
                {', '}<strong>Damage</strong> {atk.damage}
              </p>
            ))}
          </>
        )}

        {abilities.length > 0 && (
          <>
            <hr className={styles.divider} />
            {abilities.map((ab, i) => (
              <div key={i} className={styles.itemBlock}>
                <p className={styles.itemHeader}>
                  <strong className={styles.itemName}>{ab.name}</strong>
                </p>
                {ab.description && (
                  <p className={styles.itemDesc}>{ab.description}</p>
                )}
              </div>
            ))}
          </>
        )}

        <button className={styles.addToEncBtn} onClick={() => onAddToEncounter(creature)}>
          + Add to Encounter
        </button>

        {onDelete && (
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
    </div>
  );
}

function StatblockContent({
  creature,
  onClose,
  onAddToEncounter,
  onRoll,
  activeConditions,
}: {
  creature: CreatureRecord;
  onClose: () => void;
  onAddToEncounter: (creature: CreatureRecord) => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
  activeConditions?: Condition[];
}) {
  const [diceRoll, setDiceRoll] = useState<{
    expr: string; label?: string;
    damageExpr?: string; damageLabel?: string; damageTraits?: string[];
    x: number; y: number;
  } | null>(null);
  const [damageRoll, setDamageRoll] = useState<{
    expr: string; label?: string; traits?: string[];
    x: number; y: number;
  } | null>(null);

  const roll = useCallback((mod: number | undefined, label: string, e: React.MouseEvent) => {
    if (mod == null) return;
    e.stopPropagation();
    const expr = `1d20${mod >= 0 ? `+${mod}` : mod}`;
    setDiceRoll({ expr, label, x: e.clientX, y: e.clientY - 160 });
    setDamageRoll(null);
  }, []);

  const rollAttack = useCallback((
    mod: number, label: string,
    damageExpr: string, damageLabel: string, damageTraits: string[],
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const expr = `1d20${mod >= 0 ? `+${mod}` : mod}`;
    setDiceRoll({ expr, label, damageExpr, damageLabel, damageTraits, x: e.clientX, y: e.clientY - 160 });
    setDamageRoll(null);
  }, []);

  const rollDamage = useCallback((expr: string, label: string, traits: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    setDamageRoll({ expr, label, traits, x: e.clientX, y: e.clientY - 160 });
    setDiceRoll(null);
  }, []);

  const handleBodyClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('pf2roll')) {
      const expr = target.dataset.expr ?? '';
      const label = target.dataset.label ?? undefined;
      if (expr) setDiceRoll({ expr, label, x: e.clientX, y: e.clientY - 160 });
    }
  }, []);

  const activeConditionList = activeConditions ?? [];
  const pen = computePenalties(activeConditionList);
  const debuffStyle = { color: '#c0392b', fontWeight: 700 } as const;

  const c = creature.data as PF2ECreature;
  const level = getLevel(c);
  const size = getSize(c);
  const rarity = c.system?.traits?.rarity ?? 'common';
  const traits = c.system?.traits?.value ?? [];
  const allTraits = [
    ...(rarity !== 'common' ? [rarity] : []),
    size,
    ...traits,
  ];

  const ac = c.system?.attributes?.ac?.value ?? '—';
  const acDetail = c.system?.attributes?.ac?.details;
  const hp = c.system?.attributes?.hp?.max ?? '—';
  const hpDetail = c.system?.attributes?.hp?.details;
  const allSaves = c.system?.attributes?.allSaves?.value;

  const fort = c.system?.saves?.fortitude?.value;
  const ref = c.system?.saves?.reflex?.value;
  const will = c.system?.saves?.will?.value;
  const fortDetail = c.system?.saves?.fortitude?.saveDetail;
  const refDetail = c.system?.saves?.reflex?.saveDetail;
  const willDetail = c.system?.saves?.will?.saveDetail;

  const str = c.system?.abilities?.str?.mod;
  const dex = c.system?.abilities?.dex?.mod;
  const con = c.system?.abilities?.con?.mod;
  const int_ = c.system?.abilities?.int?.mod;
  const wis = c.system?.abilities?.wis?.mod;
  const cha = c.system?.abilities?.cha?.mod;

  const langs = getLanguages(c);
  const skills = getSkills(c);
  const senses = getSenses(c);
  const speed = getSpeedString(c);
  const { immunities, resistances, weaknesses } = getImmResWeak(c);

  const attacks = getAttacks(c);
  const allActions = getActions(c);
  const reactions = allActions.filter(i => i.system?.actionType?.value === 'reaction');
  const offenseActions = allActions.filter(i => i.system?.actionType?.value !== 'reaction');
  const passives = getPassives(c);

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
          <span className={styles.creatureName}>{c.name}</span>
          <span className={styles.creatureLevel}>
            {creature.entityType === 'hazard' ? 'Hazard' : 'Creature'} {level}{creature.entityType !== 'hazard' && ` · ${size}`}
          </span>
        </div>
        <div className={styles.headerActions}>
          <a
            className={styles.aonLink}
            href={(() => {
              // Build a direct AoN link. Entity type determines the page type.
              // Format: /Monsters.aspx?ID=<name-slug> or /Hazards.aspx?ID=<name-slug>
              // AoN uses name-based URLs for Remaster; fall back to search for others.
              if (creature.entityType === 'hazard') {
                return `https://2e.aonprd.com/Hazards.aspx?Name=${encodeURIComponent(c.name)}`;
              }
              return `https://2e.aonprd.com/Monsters.aspx?Name=${encodeURIComponent(c.name)}`;
            })()}
            target="_blank"
            rel="noreferrer"
            title="View on Archives of Nethys"
          >
            AoN ↗
          </a>
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
        {/* Source */}
        {publication && (
          <p className={styles.sourceLine}>
            Source <em>{publication}</em>
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
            const percMod = c.system?.perception?.mod ?? c.system?.perception?.value;
            const effPercMod = percMod != null ? percMod + pen.perception : percMod;
            const rest = senses.replace(/^Perception [+-]?\d+;?\s*/, '').replace(/^Perception [+-]?\d+$/, '');
            return (
              <>
                <span
                  className={styles.rollMod}
                  title="Roll Perception"
                  onClick={e => roll(effPercMod, 'Perception', e)}
                  style={pen.perception !== 0 ? debuffStyle : undefined}
                >
                  <strong>Perception</strong> {formatMod(effPercMod)}
                </span>
                {rest ? `; ${rest}` : ''}
              </>
            );
          })()}
        </p>

        {/* Languages */}
        {langs && (
          <p className={styles.infoLine}>
            <strong>Languages</strong> {langs}
          </p>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <p className={styles.infoLine}>
            <strong>Skills</strong>{' '}
            {skills.map((s, i) => (
              <span key={s.name}>
                {i > 0 && ', '}
                <span
                  className={styles.rollMod}
                  title={`Roll ${skillDisplayName(s.name)}`}
                  onClick={e => roll(s.mod, skillDisplayName(s.name), e)}
                >
                  {skillDisplayName(s.name)} {formatMod(s.mod)}
                </span>
              </span>
            ))}
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
          const effAc   = typeof ac === 'number'   ? ac   + pen.ac   : ac;
          const effFort = fort != null ? fort + pen.fort : fort;
          const effRef  = ref  != null ? ref  + pen.ref  : ref;
          const effWill = will != null ? will + pen.will : will;
          return (
            <p className={styles.defenseLine}>
              <strong>AC</strong>{' '}
              <span style={pen.ac !== 0 ? debuffStyle : undefined}>{effAc}</span>
              {acDetail && ` (${acDetail})`};{' '}
              <span
                className={styles.rollMod}
                title="Roll Fortitude"
                onClick={e => roll(effFort, 'Fortitude', e)}
                style={pen.fort !== 0 ? debuffStyle : undefined}
              >
                <strong>Fort</strong> {formatMod(effFort)}
              </span>
              {fortDetail && `, ${fortDetail}`},{' '}
              <span
                className={styles.rollMod}
                title="Roll Reflex"
                onClick={e => roll(effRef, 'Reflex', e)}
                style={pen.ref !== 0 ? debuffStyle : undefined}
              >
                <strong>Ref</strong> {formatMod(effRef)}
              </span>
              {refDetail && `, ${refDetail}`},{' '}
              <span
                className={styles.rollMod}
                title="Roll Will"
                onClick={e => roll(effWill, 'Will', e)}
                style={pen.will !== 0 ? debuffStyle : undefined}
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
        <p className={styles.defenseLine}>
          <strong>HP</strong> <span>{hp}</span>
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

        {passives.map(item => (
          <ItemBlock key={item._id} item={item} />
        ))}
        {reactions.map(item => (
          <ItemBlock key={item._id} item={item} />
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
          />
        ))}

        {offenseActions.map(item => (
          <ItemBlock key={item._id} item={item} />
        ))}

        {publicNotes && (
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

        {/* Add to Encounter */}
        <button className={styles.addToEncBtn} onClick={() => onAddToEncounter(creature)}>
          + Add to Encounter
        </button>
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
    </div>
  );
}

function AttackBlock({ item, onRollAttack, onRollDamage, conditions = [], strMod, dexMod }: {
  item: PF2EItem;
  onRollAttack: (mod: number, label: string, damageExpr: string, damageLabel: string, damageTraits: string[], e: React.MouseEvent) => void;
  onRollDamage: (expr: string, label: string, traits: string[], e: React.MouseEvent) => void;
  conditions?: Condition[];
  strMod?: number;
  dexMod?: number;
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

  const effBonus = bonus != null ? bonus + atkRollPen : null;
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
  // Apply flat enfeebled damage penalty to the roll expression
  const damageExpr = baseDamageExpr && dmgPen !== 0
    ? `${baseDamageExpr}${dmgPen >= 0 ? `+${dmgPen}` : dmgPen}`
    : baseDamageExpr;
  const damageLabel = `${item.name} damage`;

  function fireAttack(mod: number, mapLabel: string, e: React.MouseEvent) {
    onRollAttack(mod, `${item.name}${mapLabel}`, damageExpr, damageLabel, traits, e);
  }

  // Display damage string: show adjusted expression if debuffed, otherwise raw text
  const displayDamage = isDebuffedDmg && damageExpr ? damageExpr : fullDamage;

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
            style={isDebuffedAtk ? debuffStyle : undefined}
            onClick={e => fireAttack(effBonus, '', e)}
          >
            <strong>{item.name}</strong> {formatMod(effBonus)}
          </span>
          {/* MAP brackets — each individually clickable */}
          {map2 != null && map3 != null && (
            <span className={styles.mapBracket} style={isDebuffedAtk ? { color: '#c0392b' } : undefined}>
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
              style={isDebuffedDmg ? debuffStyle : undefined}
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

function ItemBlock({ item }: { item: PF2EItem }) {
  const symbol = actionSymbol(item);
  const desc = item.system?.description?.value ?? '';
  const traits = item.system?.traits?.value ?? [];
  const trigger = item.system?.trigger?.value;
  const traitStr = traits.length > 0 ? `(${traits.join(', ')})` : '';

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
      {desc && (
        <div
          className={styles.itemDesc}
          dangerouslySetInnerHTML={{ __html: processHtml(desc) }}
        />
      )}
    </div>
  );
}

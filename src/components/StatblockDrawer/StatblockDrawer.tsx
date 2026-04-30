import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature, PF2EItem } from '../../types/pf2e';
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
} from './statblockHelpers';
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
}

export function StatblockDrawer({ creature, onClose, onAddToEncounter }: DrawerProps) {
  return (
    <aside className={styles.drawer} aria-label="Creature statblock">
      {creature ? (
        <StatblockContent creature={creature} onClose={onClose} onAddToEncounter={onAddToEncounter} />
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
}: {
  creature: CreatureRecord;
  onClose: () => void;
  onAddToEncounter: (creature: CreatureRecord) => void;
}) {
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

  return (
    <div className={styles.content}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.creatureName}>{c.name}</span>
          <span className={styles.creatureLevel}>
            Creature {level} · {size}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close statblock">
          ✕
        </button>
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

      <div className={styles.body}>
        {/* Source */}
        {publication && (
          <p className={styles.sourceLine}>
            Source <em>{publication}</em>
          </p>
        )}

        {/* Perception / Senses */}
        <p className={styles.infoLine}>{senses}</p>

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
            {skills.map(s => `${skillDisplayName(s.name)} ${formatMod(s.mod)}`).join(', ')}
          </p>
        )}

        {/* Ability scores */}
        <p className={styles.abilityLine}>
          <strong>Str</strong> {formatMod(str)},{' '}
          <strong>Dex</strong> {formatMod(dex)},{' '}
          <strong>Con</strong> {formatMod(con)},{' '}
          <strong>Int</strong> {formatMod(int_)},{' '}
          <strong>Wis</strong> {formatMod(wis)},{' '}
          <strong>Cha</strong> {formatMod(cha)}
        </p>

        <hr className={styles.divider} />

        {/* AC + Saves */}
        <p className={styles.defenseLine}>
          <strong>AC</strong> <span>{ac}</span>
          {acDetail && ` (${acDetail})`};{' '}
          <strong>Fort</strong> {formatMod(fort)}
          {fortDetail && `, ${fortDetail}`},{' '}
          <strong>Ref</strong> {formatMod(ref)}
          {refDetail && `, ${refDetail}`},{' '}
          <strong>Will</strong> {formatMod(will)}
          {willDetail && `, ${willDetail}`}
          {allSaves && (
            <>
              ; <em>{allSaves}</em>
            </>
          )}
        </p>

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
          <AttackBlock key={item._id} item={item} />
        ))}

        {offenseActions.map(item => (
          <ItemBlock key={item._id} item={item} />
        ))}

        {publicNotes && (
          <>
            <hr className={styles.divider} />
            <div
              className={styles.publicNotes}
              dangerouslySetInnerHTML={{ __html: stripFoundryMacros(publicNotes) }}
            />
          </>
        )}

        {/* Add to Encounter */}
        <button className={styles.addToEncBtn} onClick={() => onAddToEncounter(creature)}>
          + Add to Encounter
        </button>
      </div>
    </div>
  );
}

function AttackBlock({ item }: { item: PF2EItem }) {
  const bonus = item.system?.bonus?.value;
  const damage = getDamageString(item.system?.damageRolls);
  const traits = item.system?.traits?.value ?? [];
  const effects = item.system?.attackEffects?.value ?? [];
  // In PF2E Foundry v14 data, all NPC attacks use item.type === 'melee'.
  // Ranged attacks are identified by a range increment field or a thrown-N trait.
  const isRanged =
    item.type === 'ranged' ||
    item.system?.category === 'ranged' ||
    item.system?.range?.increment != null ||
    traits.some(t => t.startsWith('thrown'));
  const typeLabel = isRanged ? 'Ranged' : 'Melee';
  const isAgile = traits.includes('agile');

  const mapStr =
    bonus != null
      ? `[${formatMod(bonus - (isAgile ? 4 : 5))}/${formatMod(bonus - (isAgile ? 8 : 10))}]`
      : '';

  const range = item.system?.range;
  const rangeDisplay =
    range?.increment != null
      ? `range increment ${range.increment} feet`
      : range?.value
        ? `range ${range.value} feet`
        : null;

  const displayTraits = rangeDisplay ? [...traits, rangeDisplay] : traits;
  const traitStr = displayTraits.length > 0 ? `(${displayTraits.join(', ')})` : '';
  const fullDamage = [damage, ...effects].filter(Boolean).join(' plus ');

  return (
    <p className={styles.attackLine}>
      <span className={styles.attackTypeLabel}>{typeLabel}</span>
      {' ◆ '}
      <strong>{item.name}</strong>
      {bonus != null && (
        <>
          {' '}
          {formatMod(bonus)} <span className={styles.mapBracket}>{mapStr}</span>
        </>
      )}
      {traitStr && (
        <>
          {' '}
          <span className={styles.attackTraits}>{traitStr}</span>
        </>
      )}
      {fullDamage && (
        <>
          , <strong>Damage</strong> {fullDamage}
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
          dangerouslySetInnerHTML={{ __html: stripFoundryMacros(desc) }}
        />
      )}
    </div>
  );
}

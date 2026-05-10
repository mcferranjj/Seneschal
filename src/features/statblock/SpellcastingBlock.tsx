import type { CustomSpellcastingEntry, CustomSpell } from '../../types/encounter';
import type { DamageGroup } from '../../utils/foundryMacros';
import { formatMod } from '../../utils/formatters';
import { eliteWeakDcMod } from '../../utils/levelScaling';
import { SpellNameLink } from './SpellNameLink';
import styles from './StatblockDrawer.module.css';

const SPELL_ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

interface SpellcastingBlockProps {
  entry: CustomSpellcastingEntry;
  ewMod?: number;
  ewStyle?: React.CSSProperties;
  onRollAll?: (groups: DamageGroup[], name: string, e: React.MouseEvent) => void;
}

export function SpellcastingBlock({ entry, ewMod = 0, ewStyle, onRollAll }: SpellcastingBlockProps) {
  const dcMod = eliteWeakDcMod(ewMod);
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

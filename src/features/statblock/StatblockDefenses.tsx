/**
 * StatblockDefenses
 *
 * Renders the AC + Saves line and the HP / Hardness / Immunities /
 * Resistances / Weaknesses line. Extracted from StatblockContent.
 */
import { formatMod } from './statblockHelpers';
import { eliteWeakHpDelta } from '../../utils/levelScaling';
import styles from './StatblockDrawer.module.css';

interface StatblockDefensesProps {
  ac: number | string;
  acDetail?: string;
  fort?: number;
  ref?: number;
  will?: number;
  fortDetail?: string;
  refDetail?: string;
  willDetail?: string;
  allSaves?: string;
  hp: number | string;
  hpDetail?: string;
  isHazard: boolean;
  hardness: number;
  hardnessScaled: boolean;
  immunities?: string;
  resistances?: string;
  weaknesses?: string;
  level: number;
  activeEliteWeak?: 'elite' | 'weak';
  ewMod: number;
  ewStyle?: React.CSSProperties;
  /** Penalty modifiers for conditions */
  pen: { ac: number; fort: number; ref: number; will: number };
  debuffStyle: React.CSSProperties;
  onRollSave: (mod: number | undefined, label: string, e: React.MouseEvent) => void;
  onManualRollSave: (mod: number | undefined, label: string, e: React.MouseEvent) => void;
}

export function StatblockDefenses({
  ac, acDetail,
  fort, ref, will,
  fortDetail, refDetail, willDetail,
  allSaves,
  hp, hpDetail,
  isHazard, hardness, hardnessScaled,
  immunities, resistances, weaknesses,
  level, activeEliteWeak,
  ewMod, ewStyle,
  pen, debuffStyle,
  onRollSave, onManualRollSave,
}: StatblockDefensesProps) {
  const effAc   = typeof ac === 'number' ? ac   + pen.ac   + ewMod : ac;
  const effFort = fort != null ? fort + pen.fort + ewMod : fort;
  const effRef  = ref  != null ? ref  + pen.ref  + ewMod : ref;
  const effWill = will != null ? will + pen.will + ewMod : will;

  const acStyle   = pen.ac   !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
  const fortStyle = pen.fort !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
  const refStyle  = pen.ref  !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
  const willStyle = pen.will !== 0 ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;

  const hpDelta = activeEliteWeak && typeof hp === 'number' ? eliteWeakHpDelta(level, activeEliteWeak) : 0;
  const effHp   = typeof hp === 'number' ? Math.max(1, hp + hpDelta) : hp;

  return (
    <>
      {/* AC + Saves */}
      <p className={styles.defenseLine}>
        <strong>AC</strong>{' '}
        <span style={acStyle}>{effAc}</span>
        {acDetail && ` (${acDetail})`};{' '}
        <span
          className={styles.rollMod}
          title="Roll Fortitude (right-click to input)"
          onClick={e => onRollSave(effFort, 'Fortitude', e)}
          onContextMenu={e => onManualRollSave(effFort, 'Fortitude', e)}
          style={fortStyle}
        >
          <strong>Fort</strong> {formatMod(effFort)}
        </span>
        {fortDetail && `, ${fortDetail}`},{' '}
        <span
          className={styles.rollMod}
          title="Roll Reflex (right-click to input)"
          onClick={e => onRollSave(effRef, 'Reflex', e)}
          onContextMenu={e => onManualRollSave(effRef, 'Reflex', e)}
          style={refStyle}
        >
          <strong>Ref</strong> {formatMod(effRef)}
        </span>
        {refDetail && `, ${refDetail}`},{' '}
        <span
          className={styles.rollMod}
          title="Roll Will (right-click to input)"
          onClick={e => onRollSave(effWill, 'Will', e)}
          onContextMenu={e => onManualRollSave(effWill, 'Will', e)}
          style={willStyle}
        >
          <strong>Will</strong> {formatMod(effWill)}
        </span>
        {willDetail && `, ${willDetail}`}
        {allSaves && <> ; <em>{allSaves}</em></>}
      </p>

      {/* HP / Hardness / IRW */}
      <p className={styles.defenseLine}>
        {isHazard && hardness > 0 && (
          <>
            <strong>Hardness</strong>{' '}
            <span style={hardnessScaled ? { color: '#2a7a6a', fontWeight: 700 } : undefined}>
              {hardness}
            </span>;{' '}
          </>
        )}
        <strong>HP</strong>{' '}
        <span style={hpDelta !== 0 ? ewStyle : undefined}>{effHp}</span>
        {isHazard && typeof effHp === 'number' && (
          <span style={{ color: 'var(--text-mute)' }}>
            {' '}(BT {Math.floor((typeof hp === 'number' ? Math.max(1, hp + hpDelta) : 0) / 2)})
          </span>
        )}
        {hpDelta !== 0 && typeof hp === 'number' && (
          <span style={{ color: 'var(--text-mute)', fontSize: '0.78em' }}> (base {hp})</span>
        )}
        {hpDetail && ` (${hpDetail})`}
        {immunities && <> ; <strong>Immunities</strong> {immunities}</>}
        {resistances && <> ; <strong>Resistances</strong> {resistances}</>}
        {weaknesses && <> ; <strong>Weaknesses</strong> {weaknesses}</>}
      </p>

      {/* IRW-only line for hazards with no physical component */}
      {isHazard && hardness === 0 && (immunities || resistances || weaknesses) && (
        <p className={styles.defenseLine}>
          {immunities && <><strong>Immunities</strong> {immunities}</>}
          {resistances && <>{immunities ? '; ' : ''}<strong>Resistances</strong> {resistances}</>}
          {weaknesses && <>{(immunities || resistances) ? '; ' : ''}<strong>Weaknesses</strong> {weaknesses}</>}
        </p>
      )}
    </>
  );
}

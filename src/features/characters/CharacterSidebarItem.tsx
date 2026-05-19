import type { CharacterRecord } from '../../db/schema';
import styles from './CharacterSidebarItem.module.css';

interface CharacterSidebarItemProps {
  character: CharacterRecord;
  isActive: boolean;
  onClick: () => void;
}

export function CharacterSidebarItem({ character, isActive, onClick }: CharacterSidebarItemProps) {
  const { name, class: cls, level, currentHp, derivedStats } = character;
  const maxHp = derivedStats.maxHp;
  const hpPct = maxHp > 0 ? currentHp / maxHp : 0;
  const hpStatus = hpPct > 0.5 ? 'healthy' : hpPct > 0.25 ? 'wounded' : 'critical';
  const className = cls?.name ?? '—';
  const ancestry = character.ancestry?.name ?? '—';

  return (
    <button
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <div className={styles.nameRow}>
        <span className={styles.name}>{name || 'Unnamed'}</span>
        <span className={`${styles.hpDot} ${styles[hpStatus]}`} title={`${currentHp}/${maxHp} HP`} />
      </div>
      <div className={styles.sub}>
        {ancestry} {className} {level}
      </div>
    </button>
  );
}

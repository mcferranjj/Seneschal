import { useState } from 'react';
import type { CharacterRecord } from '../../../db/schema';
import { SheetIdentityBar } from './SheetIdentityBar';
import { SheetHPBlock } from './SheetHPBlock';
import { SheetDerivedStats } from './SheetDerivedStats';
import { SheetAbilityScores } from './SheetAbilityScores';
import { SheetSkills } from './SheetSkills';
import { SheetFeats } from './SheetFeats';
import { SheetCharacterInfo } from './SheetCharacterInfo';
import styles from './CharacterSheet.module.css';

interface CharacterSheetProps {
  character: CharacterRecord;
  onUpdate: (patch: Partial<CharacterRecord>) => Promise<void>;
  onDelete: () => void;
}

export function CharacterSheet({ character, onUpdate, onDelete }: CharacterSheetProps) {
  const [currentHp, setCurrentHp] = useState(character.currentHp);
  const [tempHp, setTempHp] = useState(character.tempHp);

  function handleHpChange(newHp: number) {
    const clamped = Math.max(0, Math.min(character.derivedStats.maxHp, newHp));
    setCurrentHp(clamped);
    onUpdate({ currentHp: clamped });
  }

  function handleTempHpChange(newTemp: number) {
    const val = Math.max(0, newTemp);
    setTempHp(val);
    onUpdate({ tempHp: val });
  }

  return (
    <div className={styles.sheet}>
      <SheetIdentityBar
        character={character}
        onDelete={onDelete}
      />
      <div className={styles.body}>
        <div className={styles.topRow}>
          <SheetHPBlock
            currentHp={currentHp}
            maxHp={character.derivedStats.maxHp}
            tempHp={tempHp}
            onHpChange={handleHpChange}
            onTempHpChange={handleTempHpChange}
          />
          <SheetDerivedStats
            derived={character.derivedStats}
            level={character.level}
          />
        </div>

        <SheetAbilityScores scores={character.abilityScores} />

        <div className={styles.lowerGrid}>
          <SheetSkills
            character={character}
          />
          <div className={styles.rightCol}>
            <SheetFeats feats={character.feats} />
            <SheetCharacterInfo character={character} />
          </div>
        </div>
      </div>
    </div>
  );
}

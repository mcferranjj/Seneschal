import { useState } from 'react';
import type { CharacterRecord } from '../../db/schema';
import { useCharacters } from './hooks/useCharacters';
import { CharacterSidebar } from './CharacterSidebar';
import { EmptyCharacterState } from './EmptyCharacterState';
import { CharacterWizard } from './wizard/CharacterWizard';
import { CharacterSheet } from './sheet/CharacterSheet';
import styles from './CharactersSection.module.css';

export function CharactersSection() {
  const { characters, loading, selectedId, select, createCharacter, updateCharacter, deleteCharacter } = useCharacters();
  const [showWizard, setShowWizard] = useState(false);
  const selectedCharacter = characters.find(c => c.id === selectedId) ?? null;

  const handleWizardComplete = async (record: CharacterRecord) => {
    await createCharacter(record);
    setShowWizard(false);
  };

  return (
    <div className={styles.layout}>
      <CharacterSidebar
        characters={characters}
        loading={loading}
        activeId={selectedId}
        onSelect={select}
        onNew={() => { select(null); setShowWizard(true); }}
        dimmed={showWizard}
      />
      <div className={styles.mainPanel}>
        {showWizard ? (
          <CharacterWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        ) : selectedCharacter ? (
          <CharacterSheet
            key={selectedCharacter.id}
            character={selectedCharacter}
            onUpdate={(patch) => updateCharacter(selectedCharacter.id, patch)}
            onDelete={() => deleteCharacter(selectedCharacter.id)}
          />
        ) : (
          <EmptyCharacterState onNew={() => setShowWizard(true)} />
        )}
      </div>
    </div>
  );
}

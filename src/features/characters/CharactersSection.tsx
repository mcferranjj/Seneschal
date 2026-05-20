import { useState } from 'react';
import type { CharacterRecord } from '../../db/schema';
import type { RollHistoryEntry } from '../../types/diceHistory';
import { useCharacters } from './hooks/useCharacters';
import { CharacterSidebar } from './CharacterSidebar';
import { EmptyCharacterState } from './EmptyCharacterState';
import { CharacterWizard } from './wizard/CharacterWizard';
import { CharacterSheet } from './sheet/CharacterSheet';
import styles from './CharactersSection.module.css';

interface CharactersSectionProps {
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
}

export function CharactersSection({ onRoll }: CharactersSectionProps) {
  const { characters, loading, selectedId, select, createCharacter, updateCharacter, deleteCharacter } = useCharacters();
  const [showWizard, setShowWizard] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const selectedCharacter = characters.find(c => c.id === selectedId) ?? null;

  const handleWizardComplete = async (record: CharacterRecord) => {
    await createCharacter(record);
    setShowWizard(false);
  };

  const handleSelect = (id: string) => {
    select(id);
    setSidebarCollapsed(true);
  };

  const handleNew = () => {
    select(null);
    setShowWizard(true);
    setSidebarCollapsed(true);
  };

  return (
    <div className={styles.layout}>
      <CharacterSidebar
        characters={characters}
        loading={loading}
        activeId={selectedId}
        onSelect={handleSelect}
        onNew={handleNew}
        dimmed={showWizard}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(c => !c)}
      />
      <div className={styles.mainPanel}>
        {sidebarCollapsed && (
          <button
            className={styles.expandSidebarBtn}
            onClick={() => setSidebarCollapsed(false)}
            title="Show characters"
            aria-label="Show characters"
            type="button"
          >
            ››
          </button>
        )}
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
            onRoll={onRoll}
          />
        ) : (
          <EmptyCharacterState onNew={() => { setShowWizard(true); setSidebarCollapsed(true); }} />
        )}
      </div>
    </div>
  );
}

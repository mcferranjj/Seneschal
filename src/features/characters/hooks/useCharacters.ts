import { useState, useEffect, useCallback } from 'react';
import type { CharacterRecord } from '../../../db/schema';
import { characterRepository } from '../../../db/repositories/CharacterRepository';

export function useCharacters() {
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await characterRepository.getAll();
      setCharacters(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const createCharacter = useCallback(async (record: CharacterRecord) => {
    await characterRepository.put(record);
    await load();
    setSelectedId(record.id);
  }, [load]);

  const updateCharacter = useCallback(async (id: string, patch: Partial<CharacterRecord>) => {
    try {
      await characterRepository.update(id, patch);
      setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c));
    } catch (err) {
      console.error('useCharacters: failed to update character', id, err);
      throw err;
    }
  }, []);

  const deleteCharacter = useCallback(async (id: string) => {
    await characterRepository.delete(id);
    setCharacters(prev => prev.filter(c => c.id !== id));
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  return { characters, loading, selectedId, select, createCharacter, updateCharacter, deleteCharacter };
}

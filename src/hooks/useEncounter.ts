/**
 * useEncounter
 *
 * Manages all encounter state: the list of encounters, the active encounter
 * index, party size/level, and every callback that mutates encounter creatures.
 * Also handles persistence (load on mount, save on change) via IndexedDB.
 *
 * Extracted from App.tsx as part of the Step 11 cleanup.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Encounter, EncounterCreature, Condition, CustomAttack, CustomAbility } from '../types/encounter';
import type { CreatureRecord } from '../db/schema';
import type { PF2ECreature } from '../types/pf2e';
import { loadEncounterState, saveEncounterState } from '../db/db';
import { creatureRepository } from '../db/repositories/CreatureRepository';
import { buildScaledCreature, adjustedMaxHp } from '../utils/levelScaling';

export interface UseEncounterReturn {
  encounters: Encounter[];
  activeEnc: number;
  partySize: number;
  partyLevel: number;
  setActiveEnc: (idx: number) => void;
  setPartySize: (size: number) => void;
  setPartyLevel: (level: number) => void;
  addToEncounter: (c: CreatureRecord) => void;
  addEncounter: () => void;
  renameEncounter: (idx: number, name: string) => void;
  reorderEncounters: (fromIdx: number, toIdx: number) => void;
  deleteEncounter: (idx: number) => void;
  removeCreature: (uid: string) => void;
  updateHP: (uid: string, delta: number) => void;
  setHPDirect: (uid: string, newHp: number) => void;
  updateConditions: (uid: string, conditions: Condition[]) => void;
  setEliteWeak: (uid: string, adjustment: 'elite' | 'weak' | undefined) => void;
  setScaledLevel: (uid: string, level: number | undefined) => Promise<void>;
  duplicateCreature: (uid: string) => void;
  addCustomCreature: (
    name: string,
    level: number,
    hp?: number,
    ac?: number,
    fort?: number,
    ref?: number,
    will?: number,
    attacks?: CustomAttack[],
    abilities?: CustomAbility[],
    isEnemy?: boolean,
  ) => void;
}

export function useEncounter(): UseEncounterReturn {
  const [encounters, setEncounters] = useState<Encounter[]>([
    { id: 1, name: 'Encounter 1', creatures: [] },
  ]);
  const [activeEnc, setActiveEnc] = useState(0);
  const [partySize, setPartySize] = useState(4);
  const [partyLevel, setPartyLevel] = useState(3);
  const encounterStateLoaded = useRef(false);

  // Load persisted state on mount
  useEffect(() => {
    loadEncounterState().then(saved => {
      if (saved) {
        setEncounters(saved.encounters);
        setActiveEnc(saved.activeEnc);
        setPartySize(saved.partySize);
        setPartyLevel(saved.partyLevel);
      }
      encounterStateLoaded.current = true;
    }).catch(() => { encounterStateLoaded.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every change (after initial load)
  useEffect(() => {
    if (!encounterStateLoaded.current) return;
    saveEncounterState({ encounters, activeEnc, partySize, partyLevel }).catch(() => {});
  }, [encounters, activeEnc, partySize, partyLevel]);

  const addToEncounter = useCallback(
    (c: CreatureRecord) => {
      const pf2e = c.data as PF2ECreature;
      const level = pf2e.system?.details?.level?.value ?? 0;
      const maxHp = pf2e.system?.attributes?.hp?.max ?? 10;
      const ac = pf2e.system?.attributes?.ac?.value ?? 10;
      const fort = pf2e.system?.saves?.fortitude?.value;
      const ref = pf2e.system?.saves?.reflex?.value;
      const will = pf2e.system?.saves?.will?.value;
      const strMod = pf2e.system?.abilities?.str?.mod;
      const dexMod = pf2e.system?.abilities?.dex?.mod;
      const entry: EncounterCreature = {
        uid: `${c.id}-${Date.now()}-${Math.random()}`,
        creatureId: c.id,
        name: c.name,
        level,
        hp: maxHp,
        maxHp,
        ac,
        fort,
        ref,
        will,
        strMod,
        dexMod,
        traits: c.traits,
        rarity: c.rarity,
        init: 0,
        conditions: [],
      };
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc ? { ...enc, creatures: [...enc.creatures, entry] } : enc
        )
      );
    },
    [activeEnc]
  );

  const addEncounter = useCallback(() => {
    setEncounters(prev => {
      const newIdx = prev.length;
      setActiveEnc(newIdx);
      return [...prev, { id: newIdx + 1, name: `Encounter ${newIdx + 1}`, creatures: [] }];
    });
  }, []);

  const renameEncounter = useCallback((idx: number, name: string) => {
    setEncounters(prev => prev.map((enc, i) => i === idx ? { ...enc, name } : enc));
  }, []);

  const reorderEncounters = useCallback((fromIdx: number, toIdx: number) => {
    setEncounters(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setActiveEnc(prev => {
      if (prev === fromIdx) return toIdx;
      if (fromIdx < toIdx) {
        if (prev > fromIdx && prev <= toIdx) return prev - 1;
      } else {
        if (prev >= toIdx && prev < fromIdx) return prev + 1;
      }
      return prev;
    });
  }, []);

  const deleteEncounter = useCallback((idx: number) => {
    setEncounters(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
    setActiveEnc(prev => {
      if (idx < prev) return prev - 1;
      if (idx === prev) return Math.max(0, idx - 1);
      return prev;
    });
  }, []);

  const removeCreature = useCallback(
    (uid: string) => {
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc
            ? { ...enc, creatures: enc.creatures.filter(c => c.uid !== uid) }
            : enc
        )
      );
    },
    [activeEnc]
  );

  const updateHP = useCallback(
    (uid: string, delta: number) => {
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc
            ? {
                ...enc,
                creatures: enc.creatures.map(c => {
                  if (c.uid !== uid) return c;
                  const newHp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
                  return { ...c, hp: newHp };
                }),
              }
            : enc
        )
      );
    },
    [activeEnc]
  );

  const setHPDirect = useCallback(
    (uid: string, newHp: number) => {
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc
            ? {
                ...enc,
                creatures: enc.creatures.map(c => {
                  if (c.uid !== uid) return c;
                  // Placeholder creature: expand maxHp if new value exceeds it
                  if (c.custom && newHp > c.maxHp) {
                    return { ...c, hp: newHp, maxHp: newHp };
                  }
                  return { ...c, hp: Math.max(0, Math.min(c.maxHp, newHp)) };
                }),
              }
            : enc
        )
      );
    },
    [activeEnc]
  );

  const updateConditions = useCallback(
    (uid: string, conditions: Condition[]) => {
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc
            ? { ...enc, creatures: enc.creatures.map(c => c.uid === uid ? { ...c, conditions } : c) }
            : enc
        )
      );
    },
    [activeEnc]
  );

  const setEliteWeak = useCallback(
    (uid: string, adjustment: 'elite' | 'weak' | undefined) => {
      setEncounters(prev =>
        prev.map((enc, i) => {
          if (i !== activeEnc) return enc;
          return {
            ...enc,
            creatures: enc.creatures.map(c => {
              if (c.uid !== uid) return c;
              const baseMaxHp = c.baseMaxHp ?? c.maxHp;
              const updated = { ...c, eliteWeak: adjustment, baseMaxHp };
              const newMax = adjustedMaxHp(updated);
              return { ...updated, maxHp: newMax, hp: newMax };
            }),
          };
        })
      );
    },
    [activeEnc]
  );

  const setScaledLevel = useCallback(
    async (uid: string, level: number | undefined) => {
      const enc = encounters.find((_, i) => i === activeEnc);
      const creature = enc?.creatures.find(c => c.uid === uid);
      const creatureId = creature?.creatureId;
      const record = creatureId ? await creatureRepository.get(creatureId) : undefined;

      setEncounters(prev =>
        prev.map((enc, i) => {
          if (i !== activeEnc) return enc;
          return {
            ...enc,
            creatures: enc.creatures.map(c => {
              if (c.uid !== uid) return c;
              if (level == null || !record) {
                const pf2e = record?.data as PF2ECreature | undefined;
                const restoredBase = pf2e?.system?.attributes?.hp?.max ?? (c.baseMaxHp ?? c.maxHp);
                return {
                  ...c,
                  scaledLevel: undefined,
                  baseMaxHp: undefined,
                  ac:    pf2e?.system?.attributes?.ac?.value ?? c.ac,
                  maxHp: restoredBase,
                  hp:    restoredBase,
                  fort:  pf2e?.system?.saves?.fortitude?.value ?? c.fort,
                  ref:   pf2e?.system?.saves?.reflex?.value ?? c.ref,
                  will:  pf2e?.system?.saves?.will?.value ?? c.will,
                };
              }
              const scaled = buildScaledCreature(record, level);
              return {
                ...c,
                scaledLevel: level,
                baseMaxHp: undefined,
                ac:    scaled.ac,
                maxHp: scaled.hp,
                hp:    Math.min(c.hp, scaled.hp),
                fort:  scaled.fort,
                ref:   scaled.ref,
                will:  scaled.will,
              };
            }),
          };
        })
      );
    },
    [activeEnc, encounters]
  );

  const duplicateCreature = useCallback(
    (uid: string) => {
      setEncounters(prev =>
        prev.map((enc, i) => {
          if (i !== activeEnc) return enc;
          const original = enc.creatures.find(c => c.uid === uid);
          if (!original) return enc;
          const duplicate: EncounterCreature = {
            ...original,
            uid: `${original.custom ? 'custom' : original.creatureId ?? 'creature'}-${Date.now()}-${Math.random()}`,
            hp: original.maxHp,
            conditions: [],
          };
          return { ...enc, creatures: [...enc.creatures, duplicate] };
        })
      );
    },
    [activeEnc]
  );

  const addCustomCreature = useCallback(
    (
      name: string,
      level: number,
      hp?: number,
      ac?: number,
      fort?: number,
      ref?: number,
      will?: number,
      attacks?: CustomAttack[],
      abilities?: CustomAbility[],
      isEnemy?: boolean,
    ) => {
      const isPlaceholder = hp == null && ac == null;
      const maxHp = hp ?? 0;
      const entry: EncounterCreature = {
        uid: `custom-${Date.now()}`,
        name,
        level,
        hp: maxHp,
        maxHp,
        ac: ac ?? 0,
        fort,
        ref,
        will,
        attacks,
        abilities,
        init: 0,
        conditions: [],
        custom: true,
        isEnemy: isEnemy ?? !isPlaceholder,
      };
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc ? { ...enc, creatures: [...enc.creatures, entry] } : enc
        )
      );
    },
    [activeEnc]
  );

  return {
    encounters,
    activeEnc,
    partySize,
    partyLevel,
    setActiveEnc,
    setPartySize,
    setPartyLevel,
    addToEncounter,
    addEncounter,
    renameEncounter,
    reorderEncounters,
    deleteEncounter,
    removeCreature,
    updateHP,
    setHPDirect,
    updateConditions,
    setEliteWeak,
    setScaledLevel,
    duplicateCreature,
    addCustomCreature,
  };
}

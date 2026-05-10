import { useState, useEffect, useCallback } from 'react';
import type { CharacterRecord } from '../../db/schema';
import { characterRepository } from '../../db/repositories/CharacterRepository';
import styles from './CharactersSection.module.css';

const PF2E_CLASSES = [
  'Alchemist','Barbarian','Bard','Champion','Cleric','Druid','Fighter',
  'Gunslinger','Inventor','Investigator','Kineticist','Magus','Monk',
  'Oracle','Psychic','Ranger','Rogue','Sorcerer','Summoner','Swashbuckler',
  'Thaumaturge','Witch','Wizard',
];

const ANCESTRIES = [
  'Dwarf','Elf','Gnome','Goblin','Halfling','Human','Leshy','Orc',
  'Catfolk','Fetchling','Fleshwarp','Gnoll','Grippli','Hobgoblin',
  'Kobold','Lizardfolk','Ratfolk','Shisk','Shoony','Sprite','Strix','Tengu',
];

function blankCharacter(): Omit<CharacterRecord, 'id'> {
  return {
    name: '', playerName: '', ancestry: 'Human', class: 'Fighter',
    level: 1, hp: 20, maxHp: 20, ac: 15, fort: 5, ref: 3, will: 3, perception: 3,
  };
}

export function CharactersSection() {
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankCharacter());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await characterRepository.getAll();
    setCharacters(all);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveCharacter() {
    if (!form.name.trim()) return;
    if (editingId) {
      await characterRepository.put({ id: editingId, ...form });
    } else {
      await characterRepository.add({ id: `pc-${Date.now()}`, ...form });
    }
    setShowForm(false);
    setEditingId(null);
    setForm(blankCharacter());
    load();
  }

  async function deleteCharacter(id: string) {
    await characterRepository.delete(id);
    if (selectedId === id) setSelectedId(null);
    load();
  }

  function startEdit(c: CharacterRecord) {
    setEditingId(c.id);
    setForm({ name: c.name, playerName: c.playerName, ancestry: c.ancestry, class: c.class,
      level: c.level, hp: c.hp, maxHp: c.maxHp, ac: c.ac, fort: c.fort, ref: c.ref, will: c.will, perception: c.perception });
    setShowForm(true);
  }

  async function adjustHp(id: string, delta: number) {
    const c = characters.find(x => x.id === id);
    if (!c) return;
    const newHp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
    await characterRepository.update(id, { hp: newHp });
    setCharacters(prev => prev.map(x => x.id === id ? { ...x, hp: newHp } : x));
  }

  function f(val: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setForm(prev => ({ ...prev, [val]: v }));
    };
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Party</h1>
        <button className={styles.addBtn} onClick={() => { setEditingId(null); setForm(blankCharacter()); setShowForm(true); }}>
          + Add Character
        </button>
      </div>

      {showForm && (
        <div className={styles.formOverlay}>
          <div className={styles.form}>
            <h2 className={styles.formTitle}>{editingId ? 'Edit Character' : 'Add Character'}</h2>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Name</span>
                <input className={styles.input} value={form.name} onChange={f('name')} placeholder="Character name" autoFocus />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Player</span>
                <input className={styles.input} value={form.playerName} onChange={f('playerName')} placeholder="Player name" />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ancestry</span>
                <select className={styles.input} value={form.ancestry} onChange={f('ancestry')}>
                  {ANCESTRIES.map(a => <option key={a}>{a}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Class</span>
                <select className={styles.input} value={form.class} onChange={f('class')}>
                  {PF2E_CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Level</span>
                <input className={styles.input} type="number" min={1} max={20} value={form.level} onChange={f('level')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Max HP</span>
                <input className={styles.input} type="number" min={1} value={form.maxHp} onChange={e => setForm(p => ({ ...p, maxHp: Number(e.target.value), hp: Number(e.target.value) }))} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>AC</span>
                <input className={styles.input} type="number" min={1} value={form.ac} onChange={f('ac')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Perception</span>
                <input className={styles.input} type="number" value={form.perception} onChange={f('perception')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Fort</span>
                <input className={styles.input} type="number" value={form.fort} onChange={f('fort')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ref</span>
                <input className={styles.input} type="number" value={form.ref} onChange={f('ref')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Will</span>
                <input className={styles.input} type="number" value={form.will} onChange={f('will')} />
              </label>
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={saveCharacter} disabled={!form.name.trim()}>Save</button>
              <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.body}>
        {characters.length === 0 && !showForm && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>✦</span>
            <p className={styles.emptyText}>No characters yet. Add your party members to track their stats.</p>
          </div>
        )}
        <div className={styles.cards}>
          {characters.map(c => {
            const hpPct = c.maxHp > 0 ? c.hp / c.maxHp : 0;
            const hpColor = hpPct > 0.5 ? '#3a7a3a' : hpPct > 0.25 ? '#8a6a18' : '#8a2a18';
            return (
              <div key={c.id} className={`${styles.card} ${selectedId === c.id ? styles.cardSelected : ''}`} onClick={() => setSelectedId(prev => prev === c.id ? null : c.id)}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardName}>{c.name}</div>
                    <div className={styles.cardSub}>{c.playerName && `${c.playerName} · `}{c.ancestry} {c.class} {c.level}</div>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.editBtn} onClick={e => { e.stopPropagation(); startEdit(c); }}>✎</button>
                    <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteCharacter(c.id); }}>✕</button>
                  </div>
                </div>
                <div className={styles.cardStats}>
                  <span><strong>AC</strong> {c.ac}</span>
                  <span><strong>F</strong> {c.fort >= 0 ? `+${c.fort}` : c.fort}</span>
                  <span><strong>R</strong> {c.ref >= 0 ? `+${c.ref}` : c.ref}</span>
                  <span><strong>W</strong> {c.will >= 0 ? `+${c.will}` : c.will}</span>
                  <span><strong>Perc</strong> {c.perception >= 0 ? `+${c.perception}` : c.perception}</span>
                </div>
                <div className={styles.hpRow}>
                  <span className={styles.hpLabel} style={{ color: hpColor }}>{c.hp}/{c.maxHp} HP</span>
                  <div className={styles.hpBtns}>
                    {([-10, -5, -1, 1, 5, 10] as const).map(v => (
                      <button key={v} className={`${styles.hpBtn} ${v > 0 ? styles.hpHeal : styles.hpDmg}`}
                        onClick={e => { e.stopPropagation(); adjustHp(c.id, v); }}>
                        {v > 0 ? `+${v}` : v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.hpBar}>
                  <div className={styles.hpFill} style={{ width: `${hpPct * 100}%`, background: hpColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

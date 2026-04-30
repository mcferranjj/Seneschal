// ─── GM ASSISTANT ────────────────────────────────────────────────────────────
// Exported to window.GMAssistant

const GMAssistant = ({ T, CREATURES, selectedCreature, setSelectedCreature }) => {
  const { bg, parchment, crimson, brown, gold, border, borderL, text, textMid, textMute } = T;

  // Search state
  const [query, setQuery] = React.useState('');
  const [levelMin, setLevelMin] = React.useState(-1);
  const [levelMax, setLevelMax] = React.useState(25);
  const [sizeFilter, setSizeFilter] = React.useState([]);
  const [rarityFilter, setRarityFilter] = React.useState([]);
  const [filtersOpen, setFiltersOpen] = React.useState(true);

  // Encounter state
  const [encounters, setEncounters] = React.useState([{ id: 1, name: 'Encounter 1', creatures: [] }]);
  const [activeEnc, setActiveEnc] = React.useState(0);
  const [partySize, setPartySize] = React.useState(4);
  const [partyLevel, setPartyLevel] = React.useState(3);
  const [combatMode, setCombatMode] = React.useState(false);
  const [round, setRound] = React.useState(1);
  const [activeTurn, setActiveTurn] = React.useState(0);
  const [customName, setCustomName] = React.useState('');
  const [customLevel, setCustomLevel] = React.useState(1);
  const [showCustomForm, setShowCustomForm] = React.useState(false);

  const enc = encounters[activeEnc] || encounters[0];

  const LEVELS = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 17, 20];
  const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargan.'];
  const RARITIES = ['common', 'uncommon', 'rare', 'unique'];

  const filtered = CREATURES.filter((c) => {
    if (query && !c.name.toLowerCase().includes(query.toLowerCase()) && !c.traits.some((t) => t.includes(query.toLowerCase()))) return false;
    if (c.level < levelMin || c.level > levelMax) return false;
    if (sizeFilter.length && !sizeFilter.includes(c.size.toLowerCase())) return false;
    if (rarityFilter.length && !rarityFilter.includes(c.rarity)) return false;
    return true;
  });

  // XP calc
  const xpFor = (mLvl) => {
    const d = mLvl - partyLevel;
    if (d >= 4) return 160;if (d === 3) return 120;if (d === 2) return 80;
    if (d === 1) return 60;if (d === 0) return 40;if (d === -1) return 30;
    if (d === -2) return 20;if (d === -3) return 15;return 10;
  };
  const rawXP = enc.creatures.reduce((s, c) => s + xpFor(c.level), 0);
  const adjXP = Math.round(rawXP * (4 / partySize));
  const diff = adjXP >= 120 ? { label: 'Extreme', color: '#8a2a18', pct: 100 } :
  adjXP >= 80 ? { label: 'Severe', color: '#8a5a18', pct: Math.min(99, adjXP / 120 * 100) } :
  adjXP >= 60 ? { label: 'Moderate', color: '#6a7a18', pct: adjXP / 120 * 100 } :
  adjXP >= 40 ? { label: 'Low', color: '#3a6a5a', pct: adjXP / 120 * 100 } :
  { label: 'Trivial', color: '#5a7a3a', pct: adjXP / 120 * 100 };

  const addCreature = (c, e) => {
    e?.stopPropagation();
    const newEntry = { uid: Date.now() + Math.random(), name: c.name, level: c.level,
      hp: c.hp, maxHp: c.hp, ac: c.ac, init: Math.floor(Math.random() * 20) + 1 + Math.floor((c.dex || 0) / 2), conditions: [] };
    setEncounters((prev) => prev.map((en, i) => i === activeEnc ? { ...en, creatures: [...en.creatures, newEntry] } : en));
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    const c = { uid: Date.now(), name: customName, level: customLevel, hp: 20, maxHp: 20, ac: 15, init: Math.floor(Math.random() * 20) + 1, conditions: [], custom: true };
    setEncounters((prev) => prev.map((en, i) => i === activeEnc ? { ...en, creatures: [...en.creatures, c] } : en));
    setCustomName('');setShowCustomForm(false);
  };

  const removeCreature = (uid) => setEncounters((prev) => prev.map((en, i) => i === activeEnc ? { ...en, creatures: en.creatures.filter((c) => c.uid !== uid) } : en));

  const updateHP = (uid, delta) => setEncounters((prev) => prev.map((en, i) => i === activeEnc ? {
    ...en, creatures: en.creatures.map((c) => c.uid === uid ? { ...c, hp: Math.max(0, Math.min(c.maxHp, c.hp + delta)) } : c)
  } : en));

  const addEncounter = () => {
    const n = encounters.length + 1;
    setEncounters((prev) => [...prev, { id: n, name: `Encounter ${n}`, creatures: [] }]);
    setActiveEnc(encounters.length);
  };

  const sortedByInit = [...enc.creatures].sort((a, b) => b.init - a.init);
  const nextTurn = () => {
    setActiveTurn((prev) => {const n = (prev + 1) % sortedByInit.length;if (n === 0) setRound((r) => r + 1);return n;});
  };

  const btn = (children, onClick, active, style = {}) =>
  <button onClick={onClick} style={{ cursor: 'pointer', border: 'none', background: 'none', ...style,
    background: active ? crimson : style.background || 'transparent',
    color: active ? '#f0e6cc' : style.color || textMute }}>{children}</button>;


  const TRAIT_COLORS = { undead: '#6b2222', construct: '#4a4a5a', humanoid: '#6a5a3a', animal: '#3a5a3a', dragon: '#5a3a6a', fiend: '#6a2a4a', celestial: '#2a4a6a' };
  const traitColor = (t) => TRAIT_COLORS[t] || '#6a5a3a';

  const Chip = ({ label, color }) =>
  <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
    letterSpacing: '0.04em', textTransform: 'uppercase', background: color || '#8a7a60', color: '#fff', lineHeight: '17px' }}>{label}</span>;


  const toggle = (arr, setArr, val) => setArr((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* ── Filter column (collapsible) ── */}
      <div style={{ width: filtersOpen ? 220 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s',
        borderRight: filtersOpen ? `1px solid ${border}` : 'none', background: parchment, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: textMute, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 7 }}>Creature Search</div>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 5, padding: '6px 9px', display: 'flex', gap: 5 }}>
            <span style={{ color: textMute, fontSize: 14 }}>⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or trait…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: text, fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {/* Level */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 5 }}>Level Range</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" value={levelMin} min={-1} max={25} onChange={e => setLevelMin(Math.min(+e.target.value, levelMax))}
                style={{ flex: 1, padding: '4px 6px', background: bg, border: `1px solid ${border}`, borderRadius: 4, color: text, fontSize: 12, fontFamily: 'DM Mono, monospace', textAlign: 'center', outline: 'none', width: 0 }} />
              <span style={{ color: textMute, fontSize: 11, flexShrink: 0 }}>—</span>
              <input type="number" value={levelMax} min={-1} max={25} onChange={e => setLevelMax(Math.max(+e.target.value, levelMin))}
                style={{ flex: 1, padding: '4px 6px', background: bg, border: `1px solid ${border}`, borderRadius: 4, color: text, fontSize: 12, fontFamily: 'DM Mono, monospace', textAlign: 'center', outline: 'none', width: 0 }} />
            </div>
          </div>
          {/* Size */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 5 }}>Size</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
              {SIZES.map((s) => {
                const key = s.replace('.', '').toLowerCase();const on = sizeFilter.includes(key);
                return <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: on ? text : textMute, cursor: 'pointer' }}>
                  <div onClick={() => toggle(sizeFilter, setSizeFilter, key)} style={{ width: 12, height: 12, borderRadius: 2, border: `1px solid ${on ? gold : border}`, background: on ? gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>{on ? '✓' : ''}</div>
                  {s}
                </label>;
              })}
            </div>
          </div>
          {/* Rarity */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 5 }}>Rarity</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {RARITIES.map((r) => {
                const on = rarityFilter.includes(r);
                const rc = { common: '#5a7a3a', uncommon: '#8a6a18', rare: '#2a4a8a', unique: '#6a2a8a' }[r];
                return <button key={r} onClick={() => toggle(rarityFilter, setRarityFilter, r)}
                style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  background: on ? rc : bg, color: on ? '#fff' : textMute, border: `1px solid ${on ? rc : border}` }}>{r}</button>;
              })}
            </div>
          </div>
          {/* Source (static tree for now) */}
          <div>
            <div style={{ fontSize: 10, color: textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 5 }}>Source</div>
            {['▾ Remaster', '  ▾ Core', '    ✓ Monster Core', '    ✓ NPC Core', '  ▸ Supplemental', '▸ Legacy'].map((l, i) =>
            <div key={i} style={{ padding: '3px 0', fontSize: 11, color: l.includes('✓') ? text : textMute, borderBottom: `1px solid ${borderL}` }}>{l}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Results list ── */}
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', background: parchment }}>
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setFiltersOpen((o) => !o)} title={filtersOpen ? 'Hide filters' : 'Show filters'}
            style={{ width: 22, height: 22, borderRadius: 4, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: textMute, fontSize: 10 }}>
              {filtersOpen ? '‹‹' : '››'}
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: textMute, letterSpacing: '0.05em' }}>{filtered.length} RESULTS</span>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {['Lvl', 'Name'].map((s, i) =>
            <div key={s} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: i === 0 ? crimson : 'transparent', color: i === 0 ? '#f0e6cc' : textMute, border: `1px solid ${i === 0 ? crimson : border}` }}>{s}</div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((c, i) => {
            const active = selectedCreature?.id === c.id;
            const RARITY_COLOR = { common: '#5a7a3a', uncommon: '#8a6a18', rare: '#2a4a8a', unique: '#6a2a8a' };
            return (
              <div key={c.id} onClick={() => setSelectedCreature(active ? null : c)}
              style={{ padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer',
                background: active ? `${crimson}12` : 'transparent',
                borderLeft: `3px solid ${active ? crimson : 'transparent'}`,
                borderBottom: `1px solid ${borderL}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? crimson : text, fontFamily: 'Cinzel,serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    {c.rarity !== 'common' && <Chip label={c.rarity} color={RARITY_COLOR[c.rarity]} />}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: textMute }}>{c.size}</span>
                    {c.traits.slice(0, 3).map((tr) => <Chip key={tr} label={tr} color={traitColor(tr)} />)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <div style={{ background: active ? crimson : borderL, color: active ? '#f0e6cc' : textMid, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono,monospace' }}>
                    {c.level >= 0 ? `+${c.level}` : c.level}
                  </div>
                  <button onClick={(e) => addCreature(c, e)}
                  style={{ width: 18, height: 18, borderRadius: 3, background: 'transparent', color: textMute, border: `1px solid ${border}`, fontSize: 14, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  onMouseEnter={(e) => {e.currentTarget.style.background = crimson;e.currentTarget.style.color = '#f0e6cc';e.currentTarget.style.borderColor = crimson;}}
                  onMouseLeave={(e) => {e.currentTarget.style.background = 'transparent';e.currentTarget.style.color = textMute;e.currentTarget.style.borderColor = border;}}>+</button>
                </div>
              </div>);

          })}
          {filtered.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: textMute, fontSize: 12 }}>No creatures match your filters</div>}
        </div>
      </div>

      {/* ── Encounter manager / Combat tracker ── */}
      <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', background: bg }}>
        {/* Encounter tabs */}
        <div style={{ borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'stretch', flexShrink: 0, overflowX: 'auto' }}>
          {encounters.map((en, i) =>
          <button key={en.id} onClick={() => {setActiveEnc(i);setCombatMode(false);}}
          style={{ padding: '8px 10px', fontSize: 11, fontWeight: i === activeEnc ? 700 : 400, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', background: 'none',
            color: i === activeEnc ? crimson : textMute, borderBottom: `2px solid ${i === activeEnc ? crimson : 'transparent'}` }}>{en.name}</button>
          )}
          <button onClick={addEncounter} style={{ padding: '8px 8px', color: textMute, cursor: 'pointer', border: 'none', background: 'none', fontSize: 16, marginLeft: 'auto', flexShrink: 0 }}>＋</button>
        </div>

        {!combatMode ?
        <>
            {/* XP budget */}
            <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Budget</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: diff.color }}>{diff.label}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: borderL, overflow: 'hidden', marginBottom: 3 }}>
                <div style={{ height: '100%', borderRadius: 3, background: diff.color, width: `${diff.pct}%`, transition: 'width 0.3s' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: textMute }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 600 }}>Party</span>
                  <button onClick={() => setPartySize((s) => Math.max(1, s - 1))} style={{ width: 16, height: 16, borderRadius: 3, background: bg, border: `1px solid ${border}`, color: textMute, fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontWeight: 700, color: text }}>{partySize}</span>
                  <button onClick={() => setPartySize((s) => Math.min(8, s + 1))} style={{ width: 16, height: 16, borderRadius: 3, background: bg, border: `1px solid ${border}`, color: textMute, fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  <span>× Lvl</span>
                  <button onClick={() => setPartyLevel((l) => Math.max(1, l - 1))} style={{ width: 16, height: 16, borderRadius: 3, background: bg, border: `1px solid ${border}`, color: textMute, fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontWeight: 700, color: text }}>{partyLevel}</span>
                  <button onClick={() => setPartyLevel((l) => Math.min(20, l + 1))} style={{ width: 16, height: 16, borderRadius: 3, background: bg, border: `1px solid ${border}`, color: textMute, fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
                <span style={{ fontWeight: 600, color: textMid }}>{adjXP} XP</span>
              </div>
            </div>

            {/* Creature list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>Creatures ({enc.creatures.length})</div>
              {enc.creatures.length === 0 &&
            <div style={{ textAlign: 'center', color: textMute, fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
                  Click <strong>+</strong> on any creature<br />in the list to add it
                </div>
            }
              {enc.creatures.map((c, i) =>
            <div key={c.uid} style={{ background: parchment, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 9px', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: textMute }}>Lvl {c.level} · {xpFor(c.level)} XP</div>
                  </div>
                  <button onClick={() => removeCreature(c.uid)} style={{ width: 18, height: 18, borderRadius: 3, background: 'none', border: `1px solid ${border}`, color: textMute, fontSize: 12, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>
            )}

              {/* Custom creature */}
              {showCustomForm ?
            <div style={{ border: `1px solid ${border}`, borderRadius: 6, padding: '8px 10px', background: parchment }}>
                  <div style={{ fontSize: 10, color: textMute, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>Custom Creature</div>
                  <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Name…"
              style={{ width: '100%', padding: '5px 8px', border: `1px solid ${border}`, borderRadius: 4, background: bg, color: text, fontSize: 12, marginBottom: 6, fontFamily: 'inherit', outline: 'none' }}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: textMute }}>Level</span>
                    <button onClick={() => setCustomLevel((l) => Math.max(-1, l - 1))} style={{ width: 20, height: 20, borderRadius: 3, background: bg, border: `1px solid ${border}`, color: textMute, cursor: 'pointer' }}>−</button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: text, width: 20, textAlign: 'center' }}>{customLevel}</span>
                    <button onClick={() => setCustomLevel((l) => Math.min(25, l + 1))} style={{ width: 20, height: 20, borderRadius: 3, background: bg, border: `1px solid ${border}`, color: textMute, cursor: 'pointer' }}>+</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={addCustom} style={{ flex: 1, padding: '5px 0', borderRadius: 5, background: crimson, color: '#f0e6cc', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                    <button onClick={() => setShowCustomForm(false)} style={{ flex: 1, padding: '5px 0', borderRadius: 5, background: bg, color: textMute, border: `1px solid ${border}`, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div> :

            <button onClick={() => setShowCustomForm(true)} style={{ width: '100%', border: `1px dashed ${border}`, borderRadius: 6, padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', background: 'none', color: textMute, fontSize: 11, marginBottom: 6 }}>＋ Add Placeholder Creature

            </button>
            }
            </div>

            {/* Start combat */}
            {enc.creatures.length > 0 &&
          <div style={{ padding: '10px', flexShrink: 0, borderTop: `1px solid ${border}` }}>
                <button onClick={() => setCombatMode(true)}
            style={{ width: '100%', padding: '8px 0', borderRadius: 6, background: crimson, color: '#f0e6cc', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
                  ▶ Start Combat
                </button>
              </div>
          }
          </> : (

        /* Combat tracker */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: text }}>Round {round}</span>
              <button onClick={nextTurn} style={{ padding: '4px 12px', borderRadius: 5, background: crimson, color: '#f0e6cc', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Next Turn</button>
              <button onClick={() => {setCombatMode(false);setRound(1);setActiveTurn(0);}} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 5, background: bg, color: textMute, border: `1px solid ${border}`, fontSize: 11, cursor: 'pointer' }}>✕ End</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {sortedByInit.map((c, i) => {
              const active = i === activeTurn;
              const hpPct = c.hp / c.maxHp;
              const hpColor = hpPct > 0.5 ? '#3a7a3a' : hpPct > 0.25 ? '#8a6a18' : '#8a2a18';
              return (
                <div key={c.uid} style={{ background: active ? `${crimson}10` : parchment, border: `1px solid ${active ? crimson : border}`, borderRadius: 6, padding: '7px 9px', marginBottom: 5, transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 4, background: active ? crimson : bg, border: `1px solid ${active ? crimson : border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#f0e6cc' : textMid, fontFamily: 'DM Mono,monospace' }}>{c.init}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: active ? crimson : text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.name} {active && <span style={{ fontSize: 9, background: crimson, color: '#f0e6cc', padding: '1px 5px', borderRadius: 2, fontWeight: 700 }}>ACTIVE</span>}
                        </div>
                        <div style={{ fontSize: 10, color: textMute }}>AC {c.ac}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: hpColor, fontFamily: 'DM Mono,monospace', flexShrink: 0 }}>{c.hp}/{c.maxHp}</div>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: borderL, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: hpColor, width: `${hpPct * 100}%`, transition: 'width 0.3s' }}></div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[-10, -5, -1, '+1', '+5', '+10'].map((v) =>
                    <button key={v} onClick={() => updateHP(c.uid, typeof v === 'number' ? v : +v.slice(1))}
                    style={{ flex: 1, padding: '2px 0', borderRadius: 3, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: `1px solid ${border}`,
                      background: typeof v === 'string' ? '#1a3a1a' : '#3a1a1a',
                      color: typeof v === 'string' ? '#4a9a4a' : '#9a4a4a' }}>{v}</button>
                    )}
                    </div>
                  </div>);

            })}
            </div>
          </div>)
        }
      </div>

      {/* ── Statblock panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: parchment, overflow: 'hidden' }}>
        {selectedCreature ?
        <>
            <div style={{ ...{ background: brown, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }, background: "rgb(152, 32, 34)" }}>
              <div>
                <div style={{ fontFamily: 'Cinzel,serif', fontSize: 18, fontWeight: 700, color: '#fff' }}>{selectedCreature.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>Creature {selectedCreature.level} · {selectedCreature.size}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                {selectedCreature.traits.map((tr) =>
              <span key={tr} style={{ padding: '1px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.85)' }}>{tr}</span>
              )}
                <button onClick={() => setSelectedCreature(null)} style={{ marginLeft: 6, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: textMute, marginBottom: 6 }}>Source <em style={{ color: textMid }}>{selectedCreature.source}</em></div>
              <div style={{ height: 1, background: border, margin: '7px 0' }}></div>
              {[['Perception', selectedCreature.perception || '+4'], ['Languages', selectedCreature.languages || 'Common'], ['Skills', selectedCreature.skills || 'Varies']].map(([k, v]) =>
            <div key={k} style={{ marginBottom: 4, fontSize: 12 }}><strong style={{ color: text }}>{k} </strong><span style={{ color: textMid }}>{v}</span></div>
            )}
              <div style={{ fontSize: 12, color: textMid, marginBottom: 7 }}>
                Str {selectedCreature.str || '+0'}, Dex {selectedCreature.dex || '+2'}, Con {selectedCreature.con || '+1'}, Int {selectedCreature.int || '+0'}, Wis {selectedCreature.wis || '+1'}, Cha {selectedCreature.cha || '+0'}
              </div>
              <div style={{ height: 1, background: border, margin: '7px 0' }}></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 8 }}>
                {[['AC', selectedCreature.ac], ['Fort', selectedCreature.fort || '+4'], ['Ref', selectedCreature.ref || '+6'], ['Will', selectedCreature.will || '+3']].map(([k, v]) =>
              <div key={k} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 5, padding: '5px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: textMute, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>{k}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: text }}>{v}</div>
                  </div>
              )}
              </div>
              <div style={{ fontSize: 12, color: textMid, marginBottom: 8 }}><strong style={{ color: text }}>HP </strong><span style={{ fontWeight: 700, color: text }}>{selectedCreature.hp}</span> &nbsp; <strong style={{ color: text }}>Speed </strong>{selectedCreature.speed || '25 ft.'}</div>
              <div style={{ height: 1, background: border, margin: '7px 0' }}></div>
              {selectedCreature.melee && <div style={{ fontSize: 12, marginBottom: 4 }}><strong style={{ color: text }}>Melee </strong><span style={{ color: textMid }}>{selectedCreature.melee}</span></div>}
              {selectedCreature.ranged && <div style={{ fontSize: 12, marginBottom: 8 }}><strong style={{ color: text }}>Ranged </strong><span style={{ color: textMid }}>{selectedCreature.ranged}</span></div>}
              {selectedCreature.actions?.map((act, i) =>
            <div key={i} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 5, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <strong style={{ color: text, fontFamily: 'Cinzel,serif', fontSize: 12 }}>{act.name}</strong>
                    {act.cost && <span style={{ color: crimson, fontSize: 12 }}>{act.cost}</span>}
                    {act.trait && <span style={{ padding: '0 5px', background: crimson, color: '#f0e6cc', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{act.trait}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: textMid, lineHeight: 1.65 }}>{act.desc}</div>
                </div>
            )}
              <div style={{ marginTop: 12 }}>
                <button onClick={(e) => addCreature(selectedCreature, e)}
              style={{ ...{ padding: '7px 16px', borderRadius: 6, background: crimson, color: '#f0e6cc', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.03em' }, background: "rgb(152, 32, 34)" }}>
                  + Add to Encounter
                </button>
              </div>
            </div>
          </> :

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: textMute }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 32, opacity: 0.15 }}>⚔</div>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14 }}>Select a creature</div>
            <div style={{ fontSize: 12 }}>Click any result to view its statblock</div>
          </div>
        }
      </div>
    </div>);

};

Object.assign(window, { GMAssistant });
// ─── RULES REFERENCE ─────────────────────────────────────────────────────────
// Exported to window.RulesReference

const RulesReference = ({ T, RULES_DATA }) => {
  const { bg, parchment, crimson, brown, gold, border, borderL, text, textMid, textMute } = T;
  const [category, setCategory] = React.useState('conditions');
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(null);

  const CATEGORIES = [
    { id:'conditions', label:'Conditions', icon:'⚠' },
    { id:'actions',    label:'Basic Actions', icon:'◆' },
    { id:'skills',     label:'Skill Actions', icon:'🎯' },
    { id:'spells',     label:'Spells', icon:'✨' },
    { id:'feats',      label:'Feats', icon:'★' },
    { id:'equipment',  label:'Equipment', icon:'⚔' },
    { id:'traits',     label:'Traits', icon:'🏷' },
  ];

  const items = RULES_DATA[category] || [];
  const filtered = items.filter(i => !query || i.name.toLowerCase().includes(query.toLowerCase()) || (i.traits||[]).some(t=>t.includes(query.toLowerCase())));
  const stub = ['spells','feats','equipment','traits'].includes(category);

  const CONDITION_COLORS = {
    Blinded:'#6b3a8f', Clumsy:'#8a5a1a', Confused:'#7a3a8f', Dazzled:'#8a7a1a',
    Deafened:'#3a6b8f', Doomed:'#8a2222', Drained:'#8a3a4a', Encumbered:'#5a6a3a',
    Enfeebled:'#7a4a2a', Fascinated:'#2a6b6b', Fatigued:'#5a5a3a', 'Flat-Footed':'#3a4a6a',
    Frightened:'#7a3a3a', Grabbed:'#3a6a3a', Hidden:'#3a5a6a', Immobilized:'#3a5a3a',
    Invisible:'#3a4a6a', Paralyzed:'#6a3a6a', Petrified:'#5a5a3a', Prone:'#6a5a3a',
    Quickened:'#2a5a3a', Restrained:'#3a5a4a', Sickened:'#5a6a1a', Slowed:'#8a4a1a',
    Stunned:'#8a3a1a', Stupefied:'#6a2a6a', Unconscious:'#3a2a3a',
  };

  const ACTION_COST = { 0:'Reaction', 1:'◆', 2:'◆◆', 3:'◆◆◆', free:'Free' };
  const TRAIT_COLORS = { attack:'#7a2a2a', concentrate:'#2a5a8a', manipulate:'#5a3a7a', move:'#3a6a3a', secret:'#5a5a2a', auditory:'#2a5a5a', visual:'#4a3a6a' };
  const traitColor = t => TRAIT_COLORS[t] || '#6a5a3a';

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

      {/* ── Left: category nav + search ── */}
      <div style={{ width:220, flexShrink:0, borderRight:`1px solid ${border}`, display:'flex', flexDirection:'column', background:parchment }}>
        <div style={{ padding:'10px 12px 8px', borderBottom:`1px solid ${border}` }}>
          <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600, marginBottom:7 }}>Rules Reference</div>
          <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:5, padding:'6px 9px', display:'flex', gap:5 }}>
            <span style={{ color:textMute, fontSize:14 }}>⌕</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${CATEGORIES.find(c=>c.id===category)?.label||''}…`}
              style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:12, color:text, fontFamily:'inherit' }} />
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'6px 8px' }}>
          {CATEGORIES.map(cat => {
            const active = category === cat.id;
            return (
              <button key={cat.id} onClick={()=>{ setCategory(cat.id); setSelected(null); setQuery(''); }}
                style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'7px 8px', borderRadius:6, marginBottom:2, textAlign:'left', cursor:'pointer', border:`1px solid transparent`, background:'none',
                  ...(active ? { background:`${crimson}12`, color:crimson, borderColor:`${crimson}30` } : { color:textMid }) }}>
                <span style={{ fontSize:13, width:18, textAlign:'center', opacity: active?1:0.7 }}>{cat.icon}</span>
                <span style={{ fontSize:13, fontWeight:active?600:400 }}>{cat.label}</span>
                {stub && ['spells','feats','equipment','traits'].includes(cat.id) && (
                  <span style={{ marginLeft:'auto', fontSize:9, color:textMute, background:borderL, padding:'1px 5px', borderRadius:3 }}>soon</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Center: item list ── */}
      <div style={{ width:240, flexShrink:0, borderRight:`1px solid ${border}`, display:'flex', flexDirection:'column', background:parchment }}>
        <div style={{ padding:'8px 12px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontSize:11, fontWeight:600, color:textMute, letterSpacing:'0.05em' }}>{filtered.length} {CATEGORIES.find(c=>c.id===category)?.label.toUpperCase()}</span>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {stub ? (
            <div style={{ padding:'24px 16px', textAlign:'center', color:textMute }}>
              <div style={{ fontSize:24, marginBottom:8, opacity:0.3 }}>{CATEGORIES.find(c=>c.id===category)?.icon}</div>
              <div style={{ fontFamily:'Cinzel,serif', fontSize:13, marginBottom:4 }}>Coming Soon</div>
              <div style={{ fontSize:11, lineHeight:1.6 }}>This category will be populated from the Foundry PF2E GitHub data in a future phase.</div>
            </div>
          ) : filtered.map((item, i) => {
            const isSelected = selected?.name === item.name;
            return (
              <div key={i} onClick={()=>setSelected(item)}
                style={{ padding:'9px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:8,
                  background:isSelected?`${crimson}12`:'transparent',
                  borderLeft:`3px solid ${isSelected?crimson:'transparent'}`,
                  borderBottom:`1px solid ${borderL}` }}>
                {category === 'conditions' && (
                  <div style={{ width:10, height:10, borderRadius:'50%', background:CONDITION_COLORS[item.name]||'#6a5a3a', flexShrink:0 }}></div>
                )}
                {category === 'actions' && (
                  <span style={{ fontSize:11, fontWeight:700, color:isSelected?crimson:textMute, fontFamily:'DM Mono,monospace', flexShrink:0, width:20, textAlign:'center' }}>
                    {ACTION_COST[item.cost]?.charAt(0)||'◆'}
                  </span>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:isSelected?600:500, color:isSelected?crimson:text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                  {item.cost !== undefined && (
                    <div style={{ fontSize:11, color:textMute, marginTop:1 }}>
                      {ACTION_COST[item.cost] || item.cost}
                      {item.traits?.length > 0 && <span style={{ marginLeft:4 }}>· {item.traits.slice(0,2).join(', ')}</span>}
                    </div>
                  )}
                  {category === 'conditions' && item.value && (
                    <div style={{ fontSize:10, color:textMute, marginTop:1 }}>Has value</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: detail view ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
        {selected ? (
          <>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:16 }}>
              {category === 'conditions' && (
                <div style={{ width:40, height:40, borderRadius:8, background:CONDITION_COLORS[selected.name]||'#6a5a3a', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:18 }}>{selected.icon||'⚠'}</span>
                </div>
              )}
              <div style={{ flex:1 }}>
                <h1 style={{ fontFamily:'Cinzel,serif', fontSize:22, fontWeight:700, color:text, marginBottom:6 }}>{selected.name}</h1>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {selected.cost !== undefined && (
                    <span style={{ padding:'2px 9px', borderRadius:4, fontSize:11, fontWeight:700, background:crimson, color:'#f0e6cc' }}>
                      {ACTION_COST[selected.cost] || selected.cost}
                    </span>
                  )}
                  {selected.value && <span style={{ padding:'2px 9px', borderRadius:4, fontSize:11, fontWeight:600, background:borderL, color:textMid }}>Has Value</span>}
                  {(selected.traits||[]).map(tr => (
                    <span key={tr} style={{ padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600, background:traitColor(tr), color:'#fff', textTransform:'uppercase', letterSpacing:'0.04em', fontSize:10 }}>{tr}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ height:1, background:`linear-gradient(90deg, ${border}, transparent)`, marginBottom:16 }}></div>
            <p style={{ fontSize:13, color:textMid, lineHeight:1.8, textWrap:'pretty' }}>{selected.desc}</p>

            {/* Condition value table */}
            {selected.value && category === 'conditions' && (
              <div style={{ marginTop:16, background:bg, border:`1px solid ${border}`, borderRadius:8, overflow:'hidden' }}>
                <div style={{ padding:'8px 12px', borderBottom:`1px solid ${border}`, fontSize:11, fontWeight:600, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em' }}>Value Effects</div>
                {[1,2,3,4].map(v => (
                  <div key={v} style={{ padding:'8px 12px', borderBottom:`1px solid ${borderL}`, display:'flex', gap:12 }}>
                    <div style={{ width:24, height:24, borderRadius:5, background:CONDITION_COLORS[selected.name]||crimson, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>{v}</div>
                    <div style={{ fontSize:12, color:textMid, lineHeight:1.5 }}>
                      {selected.name === 'Frightened' && `−${v} status penalty to all checks and DCs.`}
                      {selected.name === 'Clumsy' && `−${v} status penalty to Dexterity-based checks and DCs.`}
                      {selected.name === 'Drained' && `−${v} status penalty to Con-based checks. Max HP reduced by ${v} × level.`}
                      {selected.name === 'Enfeebled' && `−${v} status penalty to Strength-based checks and DCs.`}
                      {selected.name === 'Stupefied' && `−${v} status penalty to Int, Wis, and Cha checks. Spell DCs and atk reduced.`}
                      {selected.name === 'Sickened' && `−${v} status penalty to all checks and DCs.`}
                      {selected.name === 'Slowed' && `Lose ${v} action${v>1?'s':''} at start of your turn.`}
                      {selected.name === 'Stunned' && `Lose ${v} action${v>1?'s':''} at start of your turn (then reduce by 1).`}
                      {selected.name === 'Doomed' && `Dying threshold reduced by ${v}. Die at Dying ${4-v}.`}
                      {!['Frightened','Clumsy','Drained','Enfeebled','Stupefied','Sickened','Slowed','Stunned','Doomed'].includes(selected.name) && `Effect scales with value ${v}.`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Trigger for reactions */}
            {selected.trigger && (
              <div style={{ marginTop:16, background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Trigger</div>
                <div style={{ fontSize:12, color:textMid, lineHeight:1.6 }}>{selected.trigger}</div>
              </div>
            )}

            {/* Requirements */}
            {selected.requirements && (
              <div style={{ marginTop:12, background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Requirements</div>
                <div style={{ fontSize:12, color:textMid, lineHeight:1.6 }}>{selected.requirements}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:textMute, gap:8 }}>
            <div style={{ fontFamily:'Cinzel,serif', fontSize:28, opacity:0.15 }}>📖</div>
            <div style={{ fontFamily:'Cinzel,serif', fontSize:14 }}>Select a rule to view</div>
            <div style={{ fontSize:12 }}>Browse {filtered.length} {CATEGORIES.find(c=>c.id===category)?.label?.toLowerCase()}</div>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { RulesReference });

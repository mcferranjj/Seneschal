// ─── CHARACTER CREATION & MANAGEMENT ─────────────────────────────────────────
// Exported to window.CharacterSection

const CharacterSection = ({ T, CHAR_DATA }) => {
  const { bg, parchment, crimson, brown, gold, border, borderL, text, textMid, textMute } = T;
  const { ANCESTRIES, BACKGROUNDS, CLASSES, ALL_SKILLS } = CHAR_DATA;

  const blankChar = (id) => ({ id, name:'New Character', ancestry:null, background:null, cls:null,
    str:10,dex:10,con:10,int:10,wis:10,cha:10, skills:[], step:0, hp:0, maxHp:0, conditions:[], notes:'' });

  const [characters, setCharacters] = React.useState([blankChar(1)]);
  const [activeChar, setActiveChar] = React.useState(0);
  const [view, setView] = React.useState('build'); // 'build' | 'sheet'

  const char = characters[activeChar];
  const setChar = (updater) => setCharacters(prev => prev.map((c,i) => i===activeChar ? (typeof updater==='function'?updater(c):updater) : c));

  const STEPS = ['Ancestry','Background','Class','Abilities','Skills','Review'];

  const addCharacter = () => {
    const id = Date.now();
    setCharacters(prev => [...prev, blankChar(id)]);
    setActiveChar(characters.length);
    setView('build');
  };

  const deleteCharacter = (i) => {
    if (characters.length === 1) return;
    setCharacters(prev => prev.filter((_,idx)=>idx!==i));
    setActiveChar(prev => prev >= characters.length-1 ? characters.length-2 : prev);
  };

  const baseHP = (char.ancestry?.hp||0) + (char.cls?.hp||0) + Math.floor((char.con-10)/2);
  const maxHP = Math.max(1, baseHP);

  // Apply HP changes
  const applyHPDelta = (delta) => setChar(c => ({ ...c, hp: Math.max(0, Math.min(c.maxHp||maxHP, (c.hp||0)+delta)) }));
  const setFullHP = () => setChar(c => ({ ...c, hp: c.maxHp||maxHP, maxHp: c.maxHp||maxHP }));

  const canProceed = () => {
    if (char.step===0) return !!char.ancestry;
    if (char.step===1) return !!char.background;
    if (char.step===2) return !!char.cls;
    if (char.step===3) return true;
    if (char.step===4) return char.skills.length >= (char.cls?.trainedSkills||4);
    return true;
  };

  const finalize = () => {
    setChar(c => ({ ...c, hp: maxHP, maxHp: maxHP }));
    setView('sheet');
  };

  const COND_LIST = ['Blinded','Clumsy 1','Confused','Dazzled','Deafened','Doomed 1','Drained 1','Enfeebled 1',
    'Fatigued','Flat-Footed','Frightened 1','Grabbed','Immobilized','Invisible','Off-Guard','Paralyzed',
    'Prone','Quickened','Restrained','Sickened 1','Slowed 1','Stunned 1','Stupefied 1','Unconscious'];

  const toggleCondition = (cond) => setChar(c => ({
    ...c, conditions: c.conditions.includes(cond) ? c.conditions.filter(x=>x!==cond) : [...c.conditions, cond]
  }));

  const ABILITY_KEYS = [['STR','str'],['DEX','dex'],['CON','con'],['INT','int'],['WIS','wis'],['CHA','cha']];
  const mod = (score) => Math.floor((score-10)/2);
  const modStr = (score) => { const m=mod(score); return m>=0?`+${m}`:String(m); };

  const Chip = ({ label, color }) => (
    <span style={{ display:'inline-block', padding:'1px 6px', borderRadius:3, fontSize:10, fontWeight:700,
      letterSpacing:'0.04em', textTransform:'uppercase', background:color||'#6a5a3a', color:'#fff', lineHeight:'17px' }}>{label}</span>
  );

  const GridCard = ({ item, selected, onClick, children }) => (
    <div onClick={onClick} style={{ padding:'10px 12px', borderRadius:7, cursor:'pointer', position:'relative',
      background: selected?`${crimson}14`:bg, border:`1px solid ${selected?crimson:border}`, transition:'all 0.12s' }}>
      {selected && <div style={{ position:'absolute', top:7, right:8, width:17, height:17, borderRadius:'50%', background:crimson, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', fontWeight:700 }}>✓</div>}
      <div style={{ fontSize:13, fontWeight:600, color:selected?crimson:text, marginBottom:3 }}>{item.name}</div>
      {children}
      <div style={{ fontSize:11, color:textMute, lineHeight:1.5, marginTop:3 }}>{item.desc}</div>
    </div>
  );

  // ── Builder view ──
  const renderStep = () => {
    if (char.step === 0) return (
      <div>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:16, color:text, marginBottom:4 }}>Choose an Ancestry</h2>
        <p style={{ fontSize:12, color:textMute, marginBottom:14 }}>Your ancestry determines your base statistics, size, and speed.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
          {ANCESTRIES.map(a => (
            <GridCard key={a.name} item={a} selected={char.ancestry?.name===a.name} onClick={()=>setChar(c=>({...c,ancestry:a}))}>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:2 }}>
                <Chip label={`HP ${a.hp}`} color='#2a4a2a' />
                <Chip label={`Spd ${a.speed}`} color='#2a3a5a' />
                <Chip label={a.size} color='#4a4a3a' />
              </div>
              <div style={{ fontSize:11, color:textMid, marginTop:2 }}>{a.ability}</div>
            </GridCard>
          ))}
        </div>
      </div>
    );

    if (char.step === 1) return (
      <div>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:16, color:text, marginBottom:4 }}>Choose a Background</h2>
        <p style={{ fontSize:12, color:textMute, marginBottom:14 }}>Your background reflects your life before adventuring.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
          {BACKGROUNDS.map(b => (
            <GridCard key={b.name} item={b} selected={char.background?.name===b.name} onClick={()=>setChar(c=>({...c,background:b}))}>
              <div style={{ fontSize:11, color:crimson, marginBottom:2, fontWeight:500 }}>{b.ability}</div>
              <div style={{ fontSize:10, color:textMute }}>{b.skills}</div>
            </GridCard>
          ))}
        </div>
      </div>
    );

    if (char.step === 2) return (
      <div>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:16, color:text, marginBottom:4 }}>Choose a Class</h2>
        <p style={{ fontSize:12, color:textMute, marginBottom:14 }}>Your class determines your hit points, proficiencies, and class features.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
          {CLASSES.map(cl => (
            <GridCard key={cl.name} item={cl} selected={char.cls?.name===cl.name} onClick={()=>setChar(c=>({...c,cls:cl}))}>
              <div style={{ display:'flex', gap:5, marginBottom:2 }}>
                <Chip label={`HP+${cl.hp}`} color='#2a4a2a' />
                <Chip label={cl.role} color={cl.role==='Martial'?'#2a3a6a':cl.role==='Caster'?'#4a1a6a':'#1a4a4a'} />
              </div>
              <div style={{ fontSize:11, color:textMid }}>{cl.keyAbility}</div>
            </GridCard>
          ))}
        </div>
      </div>
    );

    if (char.step === 3) return (
      <div>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:16, color:text, marginBottom:4 }}>Assign Ability Scores</h2>
        <p style={{ fontSize:12, color:textMute, marginBottom:14 }}>Adjust your ability scores. Base is 10; apply ancestry/background/class boosts.</p>
        <div style={{ maxWidth:360 }}>
          {ABILITY_KEYS.map(([label, key]) => {
            const val = char[key];
            return (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${borderL}` }}>
                <span style={{ fontSize:12, color:textMute, width:34, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 }}>{label}</span>
                <button onClick={()=>setChar(c=>({...c,[key]:Math.max(8,c[key]-1)}))
                } style={{ width:24,height:24,borderRadius:4,background:bg,border:`1px solid ${border}`,color:textMute,fontSize:14,lineHeight:1,cursor:'pointer' }}>−</button>
                <span style={{ fontSize:16, fontWeight:700, color:text, width:26, textAlign:'center' }}>{val}</span>
                <button onClick={()=>setChar(c=>({...c,[key]:Math.min(18,c[key]+1)}))
                } style={{ width:24,height:24,borderRadius:4,background:bg,border:`1px solid ${border}`,color:textMute,fontSize:14,lineHeight:1,cursor:'pointer' }}>+</button>
                <span style={{ fontSize:11, color:val>=16?crimson:val>=14?gold:textMute, marginLeft:4, fontFamily:'DM Mono,monospace', fontWeight:600 }}>{modStr(val)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );

    if (char.step === 4) return (
      <div>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:16, color:text, marginBottom:4 }}>Choose Skills</h2>
        <p style={{ fontSize:12, color:textMute, marginBottom:8 }}>Select {char.cls?.trainedSkills||4} skills to become trained in.</p>
        <div style={{ fontSize:12, color:char.skills.length>=(char.cls?.trainedSkills||4)?'#3a7a3a':textMute, marginBottom:12, fontWeight:500 }}>
          {char.skills.length}/{char.cls?.trainedSkills||4} selected
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {ALL_SKILLS.map(sk => {
            const sel = char.skills.includes(sk);
            return (
              <button key={sk} onClick={()=>setChar(c=>({...c,skills:sel?c.skills.filter(x=>x!==sk):[...c.skills,sk]}))}
                style={{ padding:'6px 12px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer',
                  background:sel?crimson:bg, color:sel?'#f0e6cc':textMid, border:`1px solid ${sel?crimson:border}`, transition:'all 0.12s' }}>
                {sk}
              </button>
            );
          })}
        </div>
      </div>
    );

    // Step 5: Review
    return (
      <div>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:16, color:text, marginBottom:16 }}>Review & Finalize</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[['Ancestry',char.ancestry?.name||'—'],['Background',char.background?.name||'—'],
            ['Class',char.cls?.name||'—'],['Starting HP',maxHP],
            ['Speed',`${char.ancestry?.speed||25} ft.`],['Size',char.ancestry?.size||'Medium']].map(([k,v])=>(
            <div key={k} style={{ background:bg, border:`1px solid ${border}`, borderRadius:7, padding:'9px 12px' }}>
              <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>{k}</div>
              <div style={{ fontSize:15, fontWeight:700, color:text }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
          <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Ability Scores</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {ABILITY_KEYS.map(([label,key]) => (
              <div key={key} style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
                <div style={{ fontSize:16, fontWeight:700, color:text }}>{char[key]}</div>
                <div style={{ fontSize:11, color:textMid, fontFamily:'DM Mono,monospace' }}>{modStr(char[key])}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Trained Skills</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {char.skills.map(sk => <Chip key={sk} label={sk} color='#2a4a5a' />)}
            {char.skills.length===0 && <span style={{ fontSize:11, color:textMute }}>None selected</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input value={char.name==='New Character'?'':char.name} onChange={e=>setChar(c=>({...c,name:e.target.value||'New Character'}))}
            placeholder="Character name…"
            style={{ flex:1, padding:'8px 12px', border:`1px solid ${border}`, borderRadius:6, background:bg, color:text, fontSize:14, fontFamily:'inherit', outline:'none' }} />
          <button onClick={finalize}
            style={{ padding:'8px 20px', borderRadius:6, background:crimson, color:'#f0e6cc', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'0.03em' }}>
            ✓ Finalize
          </button>
        </div>
      </div>
    );
  };

  // ── Character sheet ──
  const renderSheet = () => {
    const currentHP = typeof char.hp==='number' ? char.hp : maxHP;
    const currentMax = char.maxHp || maxHP;
    const hpPct = currentMax>0 ? currentHP/currentMax : 1;
    const hpColor = hpPct>0.5?'#3a7a3a':hpPct>0.25?'#8a6a18':'#8a2a18';

    return (
      <div style={{ display:'flex', gap:16 }}>
        {/* Left: HP + conditions */}
        <div style={{ width:240, flexShrink:0 }}>
          {/* HP block */}
          <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:8 }}>Hit Points</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:6 }}>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:32, fontWeight:700, color:hpColor }}>{currentHP}</span>
              <span style={{ fontSize:16, color:textMute }}>/</span>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:20, fontWeight:600, color:textMid }}>{currentMax}</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:borderL, overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', borderRadius:3, background:hpColor, width:`${hpPct*100}%`, transition:'width 0.3s' }}></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
              {[[-5,'−5'],[-1,'−1'],[1,'+1'],[5,'+5'],[10,'+10'],'heal'].map((v,i) => {
                if (v==='heal') return <button key='heal' onClick={setFullHP}
                  style={{ padding:'4px 0', borderRadius:4, background:'#1a3a1a', color:'#4a9a4a', border:`1px solid #2a5a2a`, fontSize:11, fontWeight:600, cursor:'pointer' }}>Full</button>;
                return <button key={v[0]} onClick={()=>applyHPDelta(v[0])}
                  style={{ padding:'4px 0', borderRadius:4, background:v[0]>0?'#1a3a1a':'#3a1a1a', color:v[0]>0?'#4a9a4a':'#9a4a4a', border:`1px solid ${v[0]>0?'#2a5a2a':'#5a2a2a'}`, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  {v[1]}
                </button>;
              })}
            </div>
          </div>

          {/* Conditions */}
          <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
            <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:8 }}>Conditions</div>
            {char.conditions?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                {char.conditions.map(c => (
                  <button key={c} onClick={()=>toggleCondition(c)}
                    style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700, background:'#6a2a2a', color:'#f0c8c8', border:'1px solid #8a3a3a', cursor:'pointer' }}>
                    {c} ✕
                  </button>
                ))}
              </div>
            )}
            <div style={{ fontSize:10, color:textMute, marginBottom:5 }}>Add condition:</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
              {COND_LIST.filter(c=>!char.conditions?.includes(c)).slice(0,12).map(c => (
                <button key={c} onClick={()=>toggleCondition(c)}
                  style={{ padding:'2px 7px', borderRadius:4, fontSize:10, background:parchment, color:textMute, border:`1px solid ${border}`, cursor:'pointer' }}>{c}</button>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 14px' }}>
            <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:8 }}>Quick Stats</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {ABILITY_KEYS.map(([label,key]) => (
                <div key={key} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:textMute }}>{label}</span>
                  <span style={{ fontWeight:700, color:text, fontFamily:'DM Mono,monospace' }}>{modStr(char[key])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: character details */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
              {[['Ancestry',char.ancestry?.name],['Background',char.background?.name],['Class',char.cls?.name],['Level','1']].map(([k,v])=>v&&(
                <div key={k} style={{ flex:'1 1 120px' }}>
                  <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:1 }}>{k}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trained skills */}
          <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
            <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:8 }}>Trained Skills</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {char.skills.map(sk => <Chip key={sk} label={sk} color='#2a4a5a' />)}
              {char.skills.length===0 && <span style={{ fontSize:11, color:textMute }}>None</span>}
            </div>
          </div>

          {/* Notes */}
          <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:'10px 14px' }}>
            <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:6 }}>Notes</div>
            <textarea value={char.notes||''} onChange={e=>setChar(c=>({...c,notes:e.target.value}))}
              placeholder="Session notes, inventory, reminders…"
              style={{ width:'100%', minHeight:80, padding:'6px 8px', background:parchment, border:`1px solid ${border}`, borderRadius:5, color:text, fontSize:12, fontFamily:'inherit', resize:'vertical', outline:'none', lineHeight:1.6 }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

      {/* ── Character list sidebar ── */}
      <div style={{ width:200, flexShrink:0, borderRight:`1px solid ${border}`, display:'flex', flexDirection:'column', background:parchment }}>
        <div style={{ padding:'10px 12px 8px', borderBottom:`1px solid ${border}` }}>
          <div style={{ fontSize:10, color:textMute, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600, marginBottom:7 }}>Characters</div>
          <button onClick={addCharacter} style={{ width:'100%', padding:'5px 0', borderRadius:5, background:crimson, color:'#f0e6cc', border:'none', fontSize:11, fontWeight:600, cursor:'pointer' }}>+ New Character</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'6px 8px' }}>
          {characters.map((c, i) => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', marginBottom:3 }}>
              <button onClick={()=>{setActiveChar(i);setView(c.cls?'sheet':'build');}}
                style={{ flex:1, padding:'8px 9px', borderRadius:6, textAlign:'left', cursor:'pointer', border:`1px solid ${i===activeChar?`${crimson}44`:'transparent'}`,
                  background: i===activeChar?`${crimson}12`:'transparent', color: i===activeChar?crimson:textMid, fontSize:12, fontWeight: i===activeChar?600:400 }}>
                <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                <div style={{ fontSize:10, color:textMute, marginTop:1 }}>{c.cls?.name||'In progress…'}</div>
              </button>
              {characters.length > 1 && (
                <button onClick={()=>deleteCharacter(i)} style={{ width:20, height:20, borderRadius:4, background:'none', border:'none', color:textMute, fontSize:11, cursor:'pointer', flexShrink:0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main panel ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Character header */}
        <div style={{ background:brown, padding:'10px 20px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:'Cinzel,serif', fontSize:16, fontWeight:700, color:'#fff' }}>{char.name}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:1 }}>
              {[char.ancestry?.name, char.background?.name, char.cls?.name].filter(Boolean).join(' · ')||'New Character'}
            </div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <button onClick={()=>setView('build')} style={{ padding:'4px 12px', borderRadius:5, fontSize:11, fontWeight:500, cursor:'pointer',
              background:view==='build'?'rgba(255,255,255,0.2)':'transparent', color:'rgba(255,255,255,0.8)', border:`1px solid ${view==='build'?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.15)'}` }}>
              Builder
            </button>
            <button onClick={()=>setView('sheet')} style={{ padding:'4px 12px', borderRadius:5, fontSize:11, fontWeight:500, cursor:'pointer',
              background:view==='sheet'?'rgba(255,255,255,0.2)':'transparent', color:'rgba(255,255,255,0.8)', border:`1px solid ${view==='sheet'?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.15)'}` }}>
              Sheet
            </button>
          </div>
        </div>

        {view === 'build' ? (
          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
            {/* Steps nav */}
            <div style={{ width:160, flexShrink:0, borderRight:`1px solid ${border}`, background:parchment, padding:'12px 10px' }}>
              {STEPS.map((step, i) => {
                const done = i < char.step; const active = i === char.step;
                return (
                  <button key={step} onClick={()=>{ if(i<=char.step) setChar(c=>({...c,step:i})); }}
                    style={{ display:'flex', alignItems:'center', gap:7, width:'100%', padding:'7px 8px', borderRadius:5, marginBottom:3, textAlign:'left', cursor:i<=char.step?'pointer':'default', border:'none',
                      background:active?`${crimson}14`:'transparent', color:active?crimson:done?textMid:textMute }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700,
                      background:active?crimson:done?'#2a4a2a':'transparent', color:active||done?'#fff':textMute, border:`1px solid ${active?crimson:done?'#2a5a2a':border}` }}>
                      {done?'✓':i+1}
                    </div>
                    <span style={{ fontSize:12, fontWeight:active?600:400 }}>{step}</span>
                  </button>
                );
              })}
            </div>
            {/* Step content */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
              {renderStep()}
              <div style={{ display:'flex', gap:8, marginTop:20 }}>
                {char.step > 0 && <button onClick={()=>setChar(c=>({...c,step:c.step-1}))}
                  style={{ padding:'7px 18px', borderRadius:6, background:bg, color:textMid, border:`1px solid ${border}`, fontSize:12, cursor:'pointer' }}>← Back</button>}
                {char.step < STEPS.length-1 && <button onClick={()=>{ if(canProceed()) setChar(c=>({...c,step:c.step+1})); }}
                  style={{ padding:'7px 18px', borderRadius:6, fontSize:12, fontWeight:600, cursor:canProceed()?'pointer':'default', transition:'all 0.12s',
                    background:canProceed()?crimson:borderL, color:canProceed()?'#f0e6cc':textMute, border:`1px solid ${canProceed()?crimson:border}` }}>Next →</button>}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
            {renderSheet()}
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { CharacterSection });

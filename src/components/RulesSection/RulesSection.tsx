import { useState } from 'react';
import styles from './RulesSection.module.css';

const CONDITIONS: Array<{ name: string; desc: string }> = [
  { name: 'Blinded',      desc: 'Cannot see. Automatically fail sight-based Perception. –4 to other Perception. –2 to attack rolls.' },
  { name: 'Broken',       desc: 'An object damaged to below its Broken Threshold — it no longer functions.' },
  { name: 'Clumsy',       desc: '–1 per value to Dex-based checks and DCs (AC, Reflex, Acrobatics, Thievery, Stealth).' },
  { name: 'Confused',     desc: 'Cannot use reactions. Flat-footed. Must use all actions to attack a random target.' },
  { name: 'Controlled',   desc: 'Another creature dictates your actions.' },
  { name: 'Dazzled',      desc: 'Concealed to all creatures.' },
  { name: 'Deafened',     desc: 'Cannot hear. –2 to Perception. Spells with verbal components have a 5% chance to be lost.' },
  { name: 'Doomed',       desc: 'Your dying condition automatically worsens by value. Doomed 3 means Dying 4 = death.' },
  { name: 'Drained',      desc: '–1 per value to Con-based checks and DCs. Max HP reduced. Reduces by 1 per full rest.' },
  { name: 'Dying',        desc: 'Unconscious. Make a Recovery check (Flat DC 10 + dying value) each round. Dying 4 = dead.' },
  { name: 'Encumbered',   desc: '–1 to attack rolls and AC. Speed –10 ft.' },
  { name: 'Enfeebled',    desc: '–1 per value to Str-based checks and DCs (melee attacks, Athletics).' },
  { name: 'Fascinated',   desc: '–2 to Perception and skill checks. Cannot use reactions.' },
  { name: 'Fatigued',     desc: '–1 to AC and saving throws. Cannot use exploration activities that require full exertion.' },
  { name: 'Flat-Footed',  desc: '–2 to AC. (Legacy term; "Off-Guard" in the Remaster.)' },
  { name: 'Fleeing',      desc: 'Must spend all actions moving away from the source of fear.' },
  { name: 'Frightened',   desc: '–1 per value to all checks and DCs. Reduces by 1 at the end of each turn.' },
  { name: 'Grabbed',      desc: 'Cannot move. –2 to attack rolls and AC. Flat-footed.' },
  { name: 'Hidden',       desc: 'Enemies must attempt a DC 11 flat check to target you. You are undetected to them after moving.' },
  { name: 'Immobilized',  desc: 'Cannot use actions with the move trait.' },
  { name: 'Invisible',    desc: 'Cannot be seen. Concealed to all creatures that haven\'t detected you otherwise.' },
  { name: 'Off-Guard',    desc: '–2 to AC. (Remaster term for Flat-Footed.)' },
  { name: 'Paralyzed',    desc: 'Flat-footed. Cannot take actions or reactions. Auto-fail Str and Dex checks.' },
  { name: 'Petrified',    desc: 'Turned to stone. Unconscious. Doesn\'t age. Immune to mental and most effects.' },
  { name: 'Persistent Damage', desc: 'Take the listed damage at the end of each turn. DC 15 flat check to end. Each aid attempt gives +2 circumstance bonus.' },
  { name: 'Prone',        desc: '–2 to attack rolls. Ranged attacks against you have –2. Must Stand (1 action) or crawl (5 ft per action).' },
  { name: 'Quickened',    desc: 'Gain 1 extra action per round. The extra action can only be used for the specific type listed.' },
  { name: 'Restrained',   desc: 'Cannot move. –2 to attack rolls and AC. Flat-footed. Grabbed + Immobilized.' },
  { name: 'Sickened',     desc: '–1 per value to all checks and DCs. Can attempt Fortitude save at end of turn to reduce by 1.' },
  { name: 'Slowed',       desc: 'Lose 1 action per round per value.' },
  { name: 'Stunned',      desc: 'Lose actions equal to the stunned value at the start of your turn. Reduces by 1.' },
  { name: 'Stupefied',    desc: '–1 per value to Int/Wis/Cha checks and DCs. Spellcasting requires a flat check or the spell is lost.' },
  { name: 'Unconscious',  desc: 'Helpless. –4 to AC, Perception, and Reflex. Flat-footed. Cannot act.' },
  { name: 'Undetected',   desc: 'Enemies must guess your square (DC 11 flat). You are not observed.' },
  { name: 'Wounded',      desc: 'If you are Dying, your Dying condition increases to at least 1 + your Wounded value.' },
];

const BASIC_ACTIONS = [
  { name: 'Aid', cost: '↺', desc: 'Aid an ally\'s check. DC 20 (trained), DC 15 (expert), etc. Gives +1 (or more on success/crit) circumstance bonus.' },
  { name: 'Crawl', cost: '◆', desc: 'Move 5 ft while prone.' },
  { name: 'Delay', cost: '◇', desc: 'Move your turn to later in the round.' },
  { name: 'Drop Prone', cost: '◆', desc: 'Fall prone.' },
  { name: 'Escape', cost: '◆', desc: 'Attempt to break free of Grabbed/Restrained. Roll Acrobatics, Athletics, or unarmed vs. opponent\'s Reflex DC.' },
  { name: 'Interact', cost: '◆', desc: 'Grab, manipulate, or activate an object.' },
  { name: 'Leap', cost: '◆', desc: 'Horizontal up to your Speed (Long Jump with Athletics for more). Vertical up to 3 ft + half Athletics bonus.' },
  { name: 'Raise a Shield', cost: '◆', desc: '+2 circumstance bonus to AC until start of next turn. Required for Shield Block reaction.' },
  { name: 'Ready', cost: '◆◆', desc: 'Prepare a single action or free action as a reaction with a trigger you designate.' },
  { name: 'Release', cost: '◇', desc: 'Release something you\'re holding (no action).' },
  { name: 'Seek', cost: '◆', desc: 'Attempt Perception to detect Hidden or Undetected creatures in a 30-ft cone or 15-ft burst.' },
  { name: 'Sense Motive', cost: '◆', desc: 'Attempt Perception to understand a creature\'s intent or truthfulness.' },
  { name: 'Stand', cost: '◆', desc: 'Get up from prone.' },
  { name: 'Step', cost: '◆', desc: 'Move 5 ft without triggering reactions.' },
  { name: 'Strike', cost: '◆', desc: 'Make a melee or ranged attack. MAP: –5/–10 (–4/–8 agile).' },
  { name: 'Stride', cost: '◆', desc: 'Move up to your Speed.' },
  { name: 'Take Cover', cost: '◆', desc: '+2 circumstance bonus to AC, Reflex, and Stealth against ranged attacks.' },
];

export function RulesSection() {
  const [condSearch, setCondSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<'conditions' | 'actions'>('conditions');

  const filteredConditions = CONDITIONS.filter(c =>
    c.name.toLowerCase().includes(condSearch.toLowerCase()) ||
    c.desc.toLowerCase().includes(condSearch.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Rules Reference</h1>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'conditions' ? styles.tabActive : ''}`} onClick={() => setTab('conditions')}>
            Conditions
          </button>
          <button className={`${styles.tab} ${tab === 'actions' ? styles.tabActive : ''}`} onClick={() => setTab('actions')}>
            Basic Actions
          </button>
        </div>
      </div>

      {tab === 'conditions' && (
        <div className={styles.body}>
          <input
            className={styles.search}
            type="text"
            placeholder="Filter conditions…"
            value={condSearch}
            onChange={e => setCondSearch(e.target.value)}
          />
          <div className={styles.list}>
            {filteredConditions.map(c => (
              <div key={c.name} className={styles.entry}>
                <button
                  className={styles.entryHeader}
                  onClick={() => setExpanded(prev => prev === c.name ? null : c.name)}
                >
                  <span className={styles.entryName}>{c.name}</span>
                  <span className={styles.entryChevron}>{expanded === c.name ? '▾' : '▸'}</span>
                </button>
                {expanded === c.name && (
                  <p className={styles.entryDesc}>{c.desc}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div className={styles.body}>
          <div className={styles.list}>
            {BASIC_ACTIONS.map(a => (
              <div key={a.name} className={styles.entry}>
                <button
                  className={styles.entryHeader}
                  onClick={() => setExpanded(prev => prev === a.name ? null : a.name)}
                >
                  <span className={styles.entryName}>
                    {a.name}
                    <span className={styles.actionCost}> {a.cost}</span>
                  </span>
                  <span className={styles.entryChevron}>{expanded === a.name ? '▾' : '▸'}</span>
                </button>
                {expanded === a.name && (
                  <p className={styles.entryDesc}>{a.desc}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

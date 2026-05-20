import { useRef, useState } from 'react';
import { CONDITIONS } from '../../data/conditions';
import { useNav } from '../../nav/NavContext';
import { useNavSetter } from '../../nav/useNavSetter';
import styles from './RulesSection.module.css';

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

type RulesTab = 'conditions' | 'actions';

const TAB_LABELS: Record<RulesTab, string> = {
  conditions: 'Conditions',
  actions: 'Basic Actions',
};

export function RulesSection() {
  const { push: navPush } = useNav();
  const [condSearch, setCondSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<RulesTab>('conditions');

  // Tab change is a textbook setter-with-history use case.
  const handleTabChange = useNavSetter(tab, setTab, {
    label: (prev) => `Back to ${TAB_LABELS[prev]}`,
    scope: 'rules',
  });

  // Expand needs custom logic: collapsing is a no-op for the back stack, but
  // opening/replacing pushes an undo that closes (or restores the previous open).
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  function handleExpand(name: string) {
    const prev = expandedRef.current;
    const next = prev === name ? null : name;
    if (prev !== null && next !== null) {
      // Replacing one expanded entry with another — restore previous on back.
      navPush({ undo: () => setExpanded(prev), redo: () => setExpanded(name), label: `Collapse ${name}`, scope: 'rules' });
    } else if (next !== null) {
      // Opening from a closed state — back closes it.
      navPush({ undo: () => setExpanded(null), redo: () => setExpanded(name), label: `Collapse ${name}`, scope: 'rules' });
    }
    // Closing (next === null) needs no undo — there's nothing interesting to restore.
    setExpanded(next);
  }

  const filteredConditions = CONDITIONS.filter(c =>
    c.name.toLowerCase().includes(condSearch.toLowerCase()) ||
    c.desc.toLowerCase().includes(condSearch.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Rules Reference</h1>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'conditions' ? styles.tabActive : ''}`} onClick={() => handleTabChange('conditions')}>
            Conditions
          </button>
          <button className={`${styles.tab} ${tab === 'actions' ? styles.tabActive : ''}`} onClick={() => handleTabChange('actions')}>
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
                  onClick={() => handleExpand(c.name)}
                >
                  <span className={styles.entryName}>
                    {c.name}
                    {c.valued && <span className={styles.valuedBadge}> #</span>}
                    {c.statEffect && (
                      <span className={styles.statEffect}>{c.statEffect}</span>
                    )}
                  </span>
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
                  onClick={() => handleExpand(a.name)}
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

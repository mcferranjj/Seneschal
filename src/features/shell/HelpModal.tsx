import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import styles from './HelpModal.module.css';

// ── Doc content ──────────────────────────────────────────────────────────────
// Imported as raw strings via Vite's ?raw suffix
import encounterMd from '../../../docs/encounter-manager-guide.md?raw';
import searchMd from '../../../docs/creature-search-guide.md?raw';
import statblockMd from '../../../docs/statblock-guide.md?raw';
import diceMd from '../../../docs/dice-roller-guide.md?raw';
import customMd from '../../../docs/custom-creature-guide.md?raw';
import charsMd from '../../../docs/characters-and-rules-guide.md?raw';

// ── Topic list ────────────────────────────────────────────────────────────────
const TOPICS = [
  { id: 'encounter',  label: '⚔ Encounter Manager',    icon: '⚔', content: encounterMd },
  { id: 'search',     label: '🔍 Creature Search',      icon: '🔍', content: searchMd },
  { id: 'statblock',  label: '📋 Statblock Drawer',     icon: '📋', content: statblockMd },
  { id: 'dice',       label: '🎲 Dice Roller',          icon: '🎲', content: diceMd },
  { id: 'custom',     label: '🧙 Custom Creature Wizard', icon: '🧙', content: customMd },
  { id: 'chars',      label: '✦ Characters & Rules',   icon: '✦', content: charsMd },
] as const;

type TopicId = typeof TOPICS[number]['id'];

// ── Lightweight Markdown renderer ─────────────────────────────────────────────
// Handles: h1–h3, bold, inline code, hr, blockquote, unordered/ordered lists,
// tables, and paragraphs. No external dependency needed.

function renderMd(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const nextKey = () => ++key;

  // Inline formatting: **bold**, *italic*, `code`
  // Uses [^*]+ to prevent ** from spanning across multiple bold tokens.
  function inlineFormat(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      if (m[0].startsWith('**')) {
        parts.push(<strong key={nextKey()}>{m[2]}</strong>);
      } else if (m[0].startsWith('*')) {
        parts.push(<em key={nextKey()}>{m[3]}</em>);
      } else {
        parts.push(<code key={nextKey()} className={styles.inlineCode}>{m[4]}</code>);
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') { i++; continue; }

    // HR
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={nextKey()} className={styles.hr} />);
      i++;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      nodes.push(<h1 key={nextKey()} className={styles.h1}>{inlineFormat(line.slice(2))}</h1>);
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      nodes.push(<h2 key={nextKey()} className={styles.h2}>{inlineFormat(line.slice(3))}</h2>);
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      nodes.push(<h3 key={nextKey()} className={styles.h3}>{inlineFormat(line.slice(4))}</h3>);
      i++;
      continue;
    }

    // H4 (treat same as H3 visually)
    if (line.startsWith('#### ')) {
      nodes.push(<h3 key={nextKey()} className={styles.h3}>{inlineFormat(line.slice(5))}</h3>);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote key={nextKey()} className={styles.blockquote}>
          {bqLines.map((l, idx) => <p key={idx}>{inlineFormat(l)}</p>)}
        </blockquote>
      );
      continue;
    }

    // Table (starts with |)
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // Row 0 = headers, row 1 = separator, rows 2+ = body
      const parseRow = (r: string) =>
        r.split('|').slice(1, -1).map(c => c.trim());
      const headers = parseRow(tableLines[0]);
      const bodyRows = tableLines.slice(2).map(parseRow);
      nodes.push(
        <div key={nextKey()} className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>{headers.map((h, idx) => <th key={idx}>{inlineFormat(h)}</th>)}</tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ridx) => (
                <tr key={ridx}>
                  {row.map((cell, cidx) => <td key={cidx}>{inlineFormat(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered list
    if (/^(\s*)[-*] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^(\s*)[-*] /.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)?.[1].length ?? 0;
        const text = lines[i].replace(/^\s*[-*] /, '');
        items.push(
          <li key={nextKey()} style={{ marginLeft: indent > 0 ? '1.2em' : undefined }}>
            {inlineFormat(text)}
          </li>
        );
        i++;
      }
      nodes.push(<ul key={nextKey()} className={styles.ul}>{items}</ul>);
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const text = lines[i].replace(/^\d+\. /, '');
        items.push(<li key={nextKey()}>{inlineFormat(text)}</li>);
        i++;
      }
      nodes.push(<ol key={nextKey()} className={styles.ol}>{items}</ol>);
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('> ') &&
      !lines[i].startsWith('|') &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^(\s*)[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      nodes.push(
        <p key={nextKey()} className={styles.p}>
          {inlineFormat(paraLines.join(' '))}
        </p>
      );
    } else {
      // Safety: no handler matched and paragraph collected nothing — skip the line
      // to prevent an infinite loop.
      i++;
    }
  }

  return nodes;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface HelpModalProps {
  onClose: () => void;
  initialTopic?: TopicId;
}

export function HelpModal({ onClose, initialTopic }: HelpModalProps) {
  const [activeTopic, setActiveTopic] = useState<TopicId>(initialTopic ?? 'encounter');
  const [, startTransition] = useTransition();
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Scroll content to top when topic changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTopic]);

  const topic = TOPICS.find(t => t.id === activeTopic)!;

  // Memoize rendered markdown so switching tabs never re-parses unchanged content.
  const renderedContent = useMemo(() => renderMd(topic.content), [topic.content]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>📖 Seneschal Help</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close help">✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Sidebar nav */}
          <nav className={styles.sidebar}>
            {TOPICS.map(t => (
              <button
                key={t.id}
                className={`${styles.navItem} ${t.id === activeTopic ? styles.navItemActive : ''}`}
                onClick={() => startTransition(() => setActiveTopic(t.id))}
              >
                <span className={styles.navIcon}>{t.icon}</span>
                <span className={styles.navLabel}>{t.label.replace(/^[^ ]+ /, '')}</span>
              </button>
            ))}
          </nav>

          {/* Content pane */}
          <div className={styles.content} ref={contentRef}>
            {renderedContent}
          </div>
        </div>
      </div>
    </div>
  );
}

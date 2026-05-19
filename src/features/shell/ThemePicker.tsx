import { useState } from 'react';
import type { Theme, ThemeTokens } from '../../utils/themeEngine';
import { PRESET_THEMES, ADVANCED_TOKEN_DEFAULTS, applyTheme, deriveTokens, applyTokens } from '../../utils/themeEngine';
import styles from './ThemePicker.module.css';

interface ThemePickerProps {
  activeTheme: Theme;
  onApply: (theme: Theme) => void;
  onClose: () => void;
}

type Tab = 'theme' | 'advanced';

// ── Base token descriptors ────────────────────────────────────────────────────

const BASE_TOKEN_META: { key: keyof ThemeTokens; label: string; desc: string }[] = [
  { key: 'bg',        label: 'Background',  desc: 'Page background' },
  { key: 'surface',   label: 'Surface',     desc: 'Card & panel surfaces' },
  { key: 'primary',   label: 'Primary',     desc: 'Buttons, titles, focus' },
  { key: 'accent',    label: 'Accent',      desc: 'Hover highlights, links' },
  { key: 'text',      label: 'Text',        desc: 'Body text' },
  { key: 'healing',   label: 'Healing',     desc: 'Heal buttons & badges' },
  { key: 'damage',    label: 'Damage',      desc: 'Damage buttons & badges' },
  { key: 'condition', label: 'Condition',   desc: 'Condition chips' },
  { key: 'modified',  label: 'Modified',    desc: 'Scaled-level indicator' },
];

// ── Advanced token descriptors ────────────────────────────────────────────────
// Each entry is a directly-settable CSS var (not derived) with a label + group.

interface AdvancedMeta {
  cssVar: string;
  label: string;
  group: string;
  tokenKey?: keyof ThemeTokens; // if this maps directly to a ThemeTokens field
}

const ADVANCED_META: AdvancedMeta[] = [
  // Trait badges
  { cssVar: '--color-trait-default',  label: 'Default trait',   group: 'Trait badges', tokenKey: 'traitDefault'  },
  { cssVar: '--color-trait-uncommon', label: 'Uncommon',        group: 'Trait badges', tokenKey: 'traitUncommon' },
  { cssVar: '--color-trait-rare',     label: 'Rare',            group: 'Trait badges', tokenKey: 'traitRare'     },
  { cssVar: '--color-trait-unique',   label: 'Unique',          group: 'Trait badges', tokenKey: 'traitUnique'   },
  // Structure
  { cssVar: '--color-trait-bar',         label: 'Trait bar bg',      group: 'Structure' },
  { cssVar: '--color-trait-bar-border',  label: 'Trait bar border',  group: 'Structure' },
  { cssVar: '--color-bg-banner',         label: 'Banner background', group: 'Structure' },
  { cssVar: '--color-bg-popup',          label: 'Popup background',  group: 'Structure' },
  { cssVar: '--color-surface-dark',      label: 'Dark surface',      group: 'Structure' },
  { cssVar: '--color-border',            label: 'Border',            group: 'Structure' },
  { cssVar: '--color-border-light',      label: 'Border (light)',    group: 'Structure' },
  { cssVar: '--color-border-banner',     label: 'Border (banner)',   group: 'Structure' },
  // Text
  { cssVar: '--color-text-mid',    label: 'Text mid',    group: 'Text' },
  { cssVar: '--color-text-muted',  label: 'Text muted',  group: 'Text' },
  // Primary variations
  { cssVar: '--color-primary-text',    label: 'Primary text',    group: 'Primary shades' },
  { cssVar: '--color-primary-hover',   label: 'Primary hover',   group: 'Primary shades' },
  { cssVar: '--color-primary-dark',    label: 'Primary dark',    group: 'Primary shades' },
  { cssVar: '--color-primary-darker',  label: 'Primary darker',  group: 'Primary shades' },
  // Accent variations
  { cssVar: '--color-accent-bright',  label: 'Accent bright',  group: 'Accent shades' },
  { cssVar: '--color-accent-dark',    label: 'Accent dark',    group: 'Accent shades' },
  { cssVar: '--color-accent-darker',  label: 'Accent darker',  group: 'Accent shades' },
  { cssVar: '--color-accent-deep',    label: 'Accent deep',    group: 'Accent shades' },
  { cssVar: '--color-accent-brown',   label: 'Accent brown',   group: 'Accent shades' },
  // Semantic
  { cssVar: '--color-healing-bright', label: 'Healing bright', group: 'Semantic' },
  { cssVar: '--color-healing-dark',   label: 'Healing dark',   group: 'Semantic' },
  { cssVar: '--color-damage-bright',  label: 'Damage bright',  group: 'Semantic' },
  { cssVar: '--color-fumble',         label: 'Fumble',         group: 'Semantic' },
  { cssVar: '--color-bg-error',       label: 'Error bg',       group: 'Semantic' },
];

const ADVANCED_GROUPS = Array.from(new Set(ADVANCED_META.map(m => m.group)));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read the current computed value of a CSS var on :root. */
function readCssVar(cssVar: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
}

/** Build the initial advanced overrides map from current :root values. */
function buildInitialOverrides(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { cssVar } of ADVANCED_META) {
    const v = readCssVar(cssVar);
    if (v) out[cssVar] = v;
  }
  return out;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ThemePicker({ activeTheme, onApply, onClose }: ThemePickerProps) {
  const [tab, setTab] = useState<Tab>('theme');
  const [customTokens, setCustomTokens] = useState<ThemeTokens>({ ...activeTheme.tokens });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(activeTheme.id);
  // Advanced overrides: cssVar → hex string.  Populated from :root on first advanced tab open.
  const [advOverrides, setAdvOverrides] = useState<Record<string, string>>({});
  const [advInitialised, setAdvInitialised] = useState(false);

  // Lazily read current :root values the first time the Advanced tab opens
  function ensureAdvInit() {
    if (!advInitialised) {
      setAdvOverrides(buildInitialOverrides());
      setAdvInitialised(true);
    }
  }

  // ── Preset / base color handlers ──────────────────────────────────────────

  function handlePresetClick(preset: Theme) {
    setSelectedPresetId(preset.id);
    setCustomTokens({ ...preset.tokens });
    applyTheme(preset.tokens);
    // Reset advanced overrides so they re-derive from the new preset
    setAdvOverrides(buildInitialOverrides());
  }

  function handleBaseTokenChange(key: keyof ThemeTokens, value: string) {
    const next = { ...customTokens, [key]: value };
    setCustomTokens(next);
    setSelectedPresetId(null);
    applyTheme(next);
    // Refresh advanced overrides to reflect re-derived values
    if (advInitialised) setAdvOverrides(buildInitialOverrides());
  }

  // ── Advanced handlers ─────────────────────────────────────────────────────

  function handleAdvChange(meta: AdvancedMeta, value: string) {
    const next = { ...advOverrides, [meta.cssVar]: value };
    setAdvOverrides(next);
    setSelectedPresetId(null);

    // If this var maps to a ThemeTokens field, keep customTokens in sync
    if (meta.tokenKey) {
      const nextTokens = { ...customTokens, [meta.tokenKey]: value };
      setCustomTokens(nextTokens);
      // Re-derive everything from updated base tokens, then overlay the manual overrides
      const derived = deriveTokens(nextTokens);
      applyTokens({ ...derived, ...next });
    } else {
      // Just set the single CSS var directly
      document.documentElement.style.setProperty(meta.cssVar, value);
    }
  }

  // ── Apply / Reset ─────────────────────────────────────────────────────────

  function handleApply() {
    const isPreset = selectedPresetId !== null;
    const preset = isPreset ? PRESET_THEMES.find(p => p.id === selectedPresetId) ?? null : null;
    const theme: Theme = preset ?? { id: 'custom', name: 'Custom', tokens: customTokens };
    // Persist any advanced overrides as inline style so they survive a re-apply
    // (applyTheme re-derives, so we need to re-apply overrides on top)
    onApply(theme);
    // Re-apply advanced overrides on top of what onApply just set
    for (const [k, v] of Object.entries(advOverrides)) {
      document.documentElement.style.setProperty(k, v);
    }
    onClose();
  }

  function handleReset() {
    const def = PRESET_THEMES[0];
    setSelectedPresetId(def.id);
    setCustomTokens({ ...def.tokens });
    applyTheme(def.tokens);
    if (advInitialised) setAdvOverrides(buildInitialOverrides());
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>🎨 Theme</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'theme' ? styles.tabActive : ''}`}
            onClick={() => setTab('theme')}
          >
            Presets & Colors
          </button>
          <button
            className={`${styles.tab} ${tab === 'advanced' ? styles.tabActive : ''}`}
            onClick={() => { setTab('advanced'); ensureAdvInit(); }}
          >
            Advanced
          </button>
        </div>

        <div className={styles.body}>
          {tab === 'theme' && (
            <>
              {/* Preset cards */}
              <div>
                <div className={styles.sectionLabel}>Presets</div>
                <div className={styles.presetGrid}>
                  {PRESET_THEMES.map(preset => (
                    <button
                      key={preset.id}
                      className={`${styles.presetCard} ${selectedPresetId === preset.id ? styles.presetCardActive : ''}`}
                      onClick={() => handlePresetClick(preset)}
                      title={preset.name}
                    >
                      <SwatchStrip tokens={preset.tokens} />
                      <div className={styles.presetLabel}>
                        <span>{preset.name}</span>
                        {selectedPresetId === preset.id && <span className={styles.activeCheck}>✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Base colour pickers */}
              <div className={styles.customSection}>
                <div className={styles.sectionLabel}>Custom base colours</div>
                <div className={styles.colorGrid}>
                  {BASE_TOKEN_META.map(({ key, label, desc }) => (
                    <ColorRow
                      key={key}
                      label={label}
                      desc={desc}
                      value={customTokens[key]}
                      onChange={v => handleBaseTokenChange(key, v)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'advanced' && (
            <div className={styles.advancedSection}>
              <p className={styles.advancedNote}>
                Override any individual derived color. Changes layer on top of the base theme.
              </p>
              {ADVANCED_GROUPS.map(group => (
                <div key={group} className={styles.advGroup}>
                  <div className={styles.advGroupLabel}>{group}</div>
                  <div className={styles.colorGrid}>
                    {ADVANCED_META.filter(m => m.group === group).map(meta => (
                      <ColorRow
                        key={meta.cssVar}
                        label={meta.label}
                        desc={meta.cssVar}
                        value={advOverrides[meta.cssVar] ?? '#888888'}
                        onChange={v => handleAdvChange(meta, v)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className={styles.actionRow}>
            <button className={styles.resetBtn} onClick={handleReset}>
              Reset to default
            </button>
            <button className={styles.applyBtn} onClick={handleApply}>
              Apply theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ColorRow({
  label, desc, value, onChange,
}: {
  label: string; desc: string; value: string; onChange: (v: string) => void;
}) {
  // Normalise value: CSS vars that are rgba(...) can't be put in <input type="color">,
  // so we show a best-effort hex by stripping alpha.  Changes always come back as hex.
  const displayHex = value.startsWith('#') ? value : '#888888';

  return (
    <div className={styles.colorRow}>
      <div className={styles.colorSwatch} style={{ background: value }}>
        <input
          type="color"
          className={styles.colorInput}
          value={displayHex}
          onChange={e => onChange(e.target.value)}
          aria-label={label}
        />
      </div>
      <span className={styles.colorLabel}>
        <span className={styles.colorLabelName}>{label}</span>
        <span className={styles.colorLabelDesc}>{desc}</span>
      </span>
    </div>
  );
}

/** Five-color swatch strip showing bg, surface, primary, accent, text */
function SwatchStrip({ tokens }: { tokens: ThemeTokens }) {
  const colors = [tokens.bg, tokens.surface, tokens.primary, tokens.accent, tokens.text];
  return (
    <div className={styles.swatchStrip}>
      {colors.map((c, i) => (
        <div key={i} className={styles.swatch} style={{ background: c }} />
      ))}
    </div>
  );
}

// Keep legacy export name working
export { ADVANCED_TOKEN_DEFAULTS };

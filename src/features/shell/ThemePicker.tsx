import { useCallback, useEffect, useRef, useState } from 'react';
import type { Theme, ThemeTokens } from '../../utils/themeEngine';
import { PRESET_THEMES, applyTheme, deriveTokens, applyTokens, snapshotCssVars } from '../../utils/themeEngine';
import { useBackable } from '../../nav/useBackable';
import styles from './ThemePicker.module.css';

interface ThemePickerProps {
  activeTheme: Theme;
  savedThemes: Theme[];
  onApply: (theme: Theme) => void;
  onSaveAs: (tokens: ThemeTokens, name: string) => void;
  onDeleteSaved: (id: string) => void;
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

interface AdvancedMeta {
  cssVar: string;
  label: string;
  group: string;
  tokenKey?: keyof ThemeTokens;
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

/** Snapshot current :root values for all advanced CSS vars. */
function buildInitialOverrides(): Record<string, string> {
  return snapshotCssVars(ADVANCED_META.map(m => m.cssVar));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ThemePicker({ activeTheme, savedThemes, onApply, onSaveAs, onDeleteSaved, onClose }: ThemePickerProps) {
  useBackable(true, onClose, 'Close theme picker', { escClosable: true });
  const [tab, setTab] = useState<Tab>('theme');
  const [customTokens, setCustomTokens] = useState<ThemeTokens>({ ...activeTheme.tokens });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(activeTheme.id);
  const [advOverrides, setAdvOverrides] = useState<Record<string, string>>({});
  const [advInitialised, setAdvInitialised] = useState(false);

  // "Save as…" inline prompt state
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const saveAsInputRef = useRef<HTMLInputElement>(null);

  // Whether the user has diverged from any named preset/saved theme
  const isDirty = selectedPresetId === null;

  // Debounce timer refs
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPreviewRef = useRef<(() => void) | null>(null);

  const schedulePreview = useCallback((fn: () => void) => {
    pendingPreviewRef.current = fn;
    if (previewTimerRef.current) return;
    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      pendingPreviewRef.current?.();
      pendingPreviewRef.current = null;
    }, 32);
  }, []);

  // Cancel pending preview on unmount
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
        pendingPreviewRef.current = null;
      }
    };
  }, []);

  // Focus the name input when Save As panel opens
  useEffect(() => {
    if (saveAsOpen) saveAsInputRef.current?.focus();
  }, [saveAsOpen]);

  // ── Advanced tab init ─────────────────────────────────────────────────────

  function ensureAdvInit() {
    if (!advInitialised) {
      setAdvOverrides(buildInitialOverrides());
      setAdvInitialised(true);
    }
  }

  // ── Preset / saved-theme selection ────────────────────────────────────────

  function handlePresetClick(preset: Theme) {
    setSelectedPresetId(preset.id);
    setCustomTokens({ ...preset.tokens });
    setSaveAsOpen(false);
    applyTheme(preset.tokens);
    setAdvOverrides(buildInitialOverrides());
  }

  // ── Base colour pickers ───────────────────────────────────────────────────

  function handleBaseTokenChange(key: keyof ThemeTokens, value: string) {
    const next = { ...customTokens, [key]: value };
    setCustomTokens(next);
    setSelectedPresetId(null);
    setSaveAsOpen(false);
    schedulePreview(() => {
      applyTheme(next);
      if (advInitialised) setAdvOverrides(buildInitialOverrides());
    });
  }

  // ── Advanced overrides ────────────────────────────────────────────────────

  function handleAdvChange(meta: AdvancedMeta, value: string) {
    const next = { ...advOverrides, [meta.cssVar]: value };
    setAdvOverrides(next);
    setSelectedPresetId(null);
    setSaveAsOpen(false);

    if (meta.tokenKey) {
      const nextTokens = { ...customTokens, [meta.tokenKey]: value };
      setCustomTokens(nextTokens);
      schedulePreview(() => {
        const derived = deriveTokens(nextTokens);
        applyTokens({ ...derived, ...next });
      });
    } else {
      schedulePreview(() => {
        document.documentElement.style.setProperty(meta.cssVar, value);
      });
    }
  }

  // ── Apply (activate without saving to library) ────────────────────────────

  function flushPendingPreview() {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
      pendingPreviewRef.current = null;
    }
  }

  function handleApply() {
    flushPendingPreview();
    // If a preset is selected, apply it directly; otherwise build a nameless custom theme
    const preset = selectedPresetId
      ? PRESET_THEMES.find(p => p.id === selectedPresetId) ??
        savedThemes.find(t => t.id === selectedPresetId) ?? null
      : null;
    const theme: Theme = preset ?? { id: 'custom', name: 'Custom', tokens: customTokens };
    onApply(theme);
    for (const [k, v] of Object.entries(advOverrides)) {
      document.documentElement.style.setProperty(k, v);
    }
    onClose();
  }

  // ── Save As (persist to library + activate) ───────────────────────────────

  function handleSaveAsSubmit(e: React.FormEvent) {
    e.preventDefault();
    flushPendingPreview();
    const name = saveAsName.trim();
    if (!name) return;
    onSaveAs(customTokens, name);
    // Re-apply any advanced overrides on top
    for (const [k, v] of Object.entries(advOverrides)) {
      document.documentElement.style.setProperty(k, v);
    }
    onClose();
  }

  function handleOpenSaveAs() {
    setSaveAsName('');
    setSaveAsOpen(true);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function handleReset() {
    const def = PRESET_THEMES[0];
    setSelectedPresetId(def.id);
    setCustomTokens({ ...def.tokens });
    setSaveAsOpen(false);
    applyTheme(def.tokens);
    if (advInitialised) setAdvOverrides(buildInitialOverrides());
  }

  // ── Delete saved theme ────────────────────────────────────────────────────

  function handleDeleteSaved(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    onDeleteSaved(id);
    // If the deleted theme was selected, deselect
    if (selectedPresetId === id) setSelectedPresetId(null);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>🎨 Theme</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Active theme indicator */}
        <div className={styles.savedBanner}>
          <span className={styles.savedLabel}>Active:</span>
          <span className={styles.savedName}>{activeTheme.name}</span>
          <span className={styles.savedHint}>(unsaved changes are lost on close without applying)</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'theme' ? styles.tabActive : ''}`}
            onClick={() => setTab('theme')}
          >
            Presets &amp; Colors
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
              {/* User-saved custom themes */}
              {savedThemes.length > 0 && (
                <div>
                  <div className={styles.sectionLabel}>My themes</div>
                  <div className={styles.presetGrid}>
                    {savedThemes.map(theme => (
                      <div key={theme.id} className={styles.presetCardWrap}>
                        <button
                          className={`${styles.presetCard} ${selectedPresetId === theme.id ? styles.presetCardActive : ''}`}
                          onClick={() => handlePresetClick(theme)}
                          title={theme.name}
                        >
                          <SwatchStrip tokens={theme.tokens} />
                          <div className={styles.presetLabel}>
                            <span className={styles.presetLabelName}>{theme.name}</span>
                            {selectedPresetId === theme.id && <span className={styles.activeCheck}>✓</span>}
                          </div>
                        </button>
                        <button
                          className={styles.presetDeleteBtn}
                          onClick={e => handleDeleteSaved(e, theme.id)}
                          title={`Delete "${theme.name}"`}
                          aria-label={`Delete ${theme.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Built-in preset themes */}
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

            {/* Save As inline prompt — only shown when user has made custom changes */}
            {saveAsOpen && isDirty ? (
              <form className={styles.saveAsForm} onSubmit={handleSaveAsSubmit}>
                <input
                  ref={saveAsInputRef}
                  className={styles.saveAsInput}
                  type="text"
                  value={saveAsName}
                  onChange={e => setSaveAsName(e.target.value)}
                  placeholder="Theme name…"
                  maxLength={40}
                  aria-label="Theme name"
                />
                <button
                  type="submit"
                  className={styles.applyBtn}
                  disabled={!saveAsName.trim()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={() => setSaveAsOpen(false)}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                {isDirty && (
                  <button className={styles.saveAsBtn} onClick={handleOpenSaveAs}>
                    Save as…
                  </button>
                )}
                <button className={styles.applyBtn} onClick={handleApply}>
                  Apply
                </button>
              </>
            )}
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

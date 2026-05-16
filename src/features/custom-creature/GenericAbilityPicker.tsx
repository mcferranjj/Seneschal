/**
 * GenericAbilityPicker
 *
 * An inline dropdown that lets the user search and select a generic monster
 * ability from the PF2e Bestiary Ability Glossary. After selecting an ability,
 * if it has variable fields (DC, damage, size, etc.) a small form is shown
 * inline so the user can fill them in before the ability is inserted.
 *
 * Rendered inline below the "Add generic ability" button — not a modal.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { GENERIC_ABILITIES } from '../../data/abilityGlossary';
import type { GenericAbilityDef, GenericAbilityVariable } from '../../data/abilityGlossary';
import { rankSuggestions } from '../../utils/suggestions';
import type { CustomAbility } from '../../types/encounter';
import { lookupSpellDC, lookupDamage } from '../../utils/levelScaling';
import styles from './GenericAbilityPicker.module.css';

const PF2E_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;

// ── Helper: build the full preview description from a template + filled variables ────

function buildDescription(def: GenericAbilityDef, values: Record<string, string>): string {
  let desc = def.descriptionTemplate;
  for (const v of def.variables) {
    desc = desc.replaceAll(`{${v.key}}`, values[v.key] ?? `[${v.label}]`);
  }
  return desc;
}

// ── Helper: build the short stat-block description from the short template ────

function buildShortDescription(def: GenericAbilityDef, values: Record<string, string>): string {
  if (!def.shortDescriptionTemplate) return '';
  let desc = def.shortDescriptionTemplate;
  for (const v of def.variables) {
    desc = desc.replaceAll(`{${v.key}}`, values[v.key] ?? `[${v.label}]`);
  }
  return desc;
}

// ── Helper: default values for DC/damage fields based on creature level ────────

function defaultDcForLevel(level: number): string {
  return String(lookupSpellDC(Math.max(-1, Math.min(25, level)), 'moderate'));
}

function defaultDamageForLevel(level: number): string {
  return lookupDamage(Math.max(-1, Math.min(25, level)), 'moderate');
}

/**
 * Parse a damage expression like "2d6+8" or "1d10+4" into its average (expected) value.
 * Handles XdY, XdY+Z, XdY-Z formats. Returns 0 for unparseable strings.
 */
function avgDamage(expr: string): number {
  const m = expr.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!m) return 0;
  const dice = parseInt(m[1]);
  const sides = parseInt(m[2]);
  const bonus = m[3] ? parseInt(m[3]) : 0;
  return dice * (sides + 1) / 2 + bonus;
}

/**
 * Default rupture value: midpoint between the average of high and moderate
 * single-target strike damage at the given level, rounded to the nearest integer.
 */
function defaultRuptureForLevel(level: number): string {
  const cl = Math.max(-1, Math.min(25, level));
  const high = avgDamage(lookupDamage(cl, 'high'));
  const moderate = avgDamage(lookupDamage(cl, 'moderate'));
  return String(Math.round((high + moderate) / 2));
}

// ── Action label helper ───────────────────────────────────────────────────────

function actionLabel(type: string): string {
  switch (type) {
    case 'single':   return '◆';
    case 'two':      return '◆◆';
    case 'three':    return '◆◆◆';
    case 'reaction': return '↺';
    case 'free':     return '◇';
    case 'passive':  return 'Passive';
    default:         return '';
  }
}

// ── DC field with tier quick-picks ────────────────────────────────────────────

interface DcFieldProps {
  level: number;
  value: string;
  onChange: (v: string) => void;
}

function DcField({ level, value, onChange }: DcFieldProps) {
  const cl = Math.max(-1, Math.min(25, level));
  const mdc = String(lookupSpellDC(cl, 'moderate'));
  const hdc = String(lookupSpellDC(cl, 'high'));
  const edc = String(lookupSpellDC(cl, 'extreme'));
  const tiers = [
    { label: 'M', value: mdc, title: `Moderate DC (${mdc})` },
    { label: 'H', value: hdc, title: `High DC (${hdc})`     },
    { label: 'E', value: edc, title: `Extreme DC (${edc})`  },
  ];
  return (
    <div className={styles.fieldWithTiers}>
      <input
        className={styles.varInput}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. 22"
        type="number"
        min={0}
      />
      <div className={styles.tierBtns}>
        {tiers.map(t => (
          <button
            key={t.label}
            type="button"
            className={`${styles.tierBtn} ${value === t.value ? styles.tierBtnActive : ''}`}
            title={t.title}
            onMouseDown={e => { e.preventDefault(); onChange(t.value); }}
          >{t.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Damage field with tier quick-picks ────────────────────────────────────────

interface DamageFieldProps {
  level: number;
  value: string;
  onChange: (v: string) => void;
}

function DamageField({ level, value, onChange }: DamageFieldProps) {
  const cl = Math.max(-1, Math.min(25, level));
  const ldmg = lookupDamage(cl, 'low');
  const mdmg = lookupDamage(cl, 'moderate');
  const hdmg = lookupDamage(cl, 'high');
  const edmg = lookupDamage(cl, 'extreme');
  const tiers = [
    { label: 'L', value: ldmg, title: `Low (${ldmg})`           },
    { label: 'M', value: mdmg, title: `Moderate (${mdmg})`      },
    { label: 'H', value: hdmg, title: `High (${hdmg})`          },
    { label: 'E', value: edmg, title: `Extreme (${edmg})`       },
  ];
  return (
    <div className={styles.fieldWithTiers}>
      <input
        className={styles.varInput}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. 2d6+8"
      />
      <div className={styles.tierBtns}>
        {tiers.map(t => (
          <button
            key={t.label}
            type="button"
            className={`${styles.tierBtn} ${value === t.value ? styles.tierBtnActive : ''}`}
            title={t.title}
            onMouseDown={e => { e.preventDefault(); onChange(t.value); }}
          >{t.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Size dropdown ─────────────────────────────────────────────────────────────

interface SizeFieldProps {
  value: string;
  onChange: (v: string) => void;
}

function SizeField({ value, onChange }: SizeFieldProps) {
  return (
    <select
      className={styles.varSelect}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {PF2E_SIZES.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

// ── Strike dropdown ───────────────────────────────────────────────────────────

interface StrikeFieldProps {
  strikeNames: string[];
  value: string;
  onChange: (v: string) => void;
}

function StrikeField({ strikeNames, value, onChange }: StrikeFieldProps) {
  if (strikeNames.length === 0) {
    return (
      <input
        className={styles.varInput}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. claw"
      />
    );
  }
  return (
    <select
      className={styles.varSelect}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {strikeNames.map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GenericAbilityPickerProps {
  level: number;
  strikeNames: string[];
  onInsert: (ability: CustomAbility) => void;
  onClose: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export function GenericAbilityPicker({ level, strikeNames, onInsert, onClose }: GenericAbilityPickerProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GenericAbilityDef | null>(null);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus the search box on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const allNames = GENERIC_ABILITIES.map(a => a.name);
  const filtered = query.trim().length > 0
    ? rankSuggestions(allNames, query.toLowerCase()).map(name => GENERIC_ABILITIES.find(a => a.name === name)!)
    : GENERIC_ABILITIES;

  function selectAbility(def: GenericAbilityDef) {
    setSelected(def);
    // Pre-populate variable defaults
    const defaults: Record<string, string> = {};
    for (const v of def.variables) {
      if (v.type === 'dc') defaults[v.key] = defaultDcForLevel(level);
      else if (v.type === 'damage') defaults[v.key] = defaultDamageForLevel(level);
      else if (v.type === 'size') defaults[v.key] = 'Medium';
      else if (v.type === 'strike') defaults[v.key] = strikeNames[0] ?? '';
      else if (v.key === 'rupture') defaults[v.key] = defaultRuptureForLevel(level);
      else defaults[v.key] = '';
    }
    setVarValues(defaults);
  }

  function renderVarField(v: GenericAbilityVariable, value: string, onChange: (val: string) => void) {
    switch (v.type) {
      case 'dc':
        return <DcField level={level} value={value} onChange={onChange} />;
      case 'damage':
        return <DamageField level={level} value={value} onChange={onChange} />;
      case 'size':
        return <SizeField value={value} onChange={onChange} />;
      case 'strike':
        return <StrikeField strikeNames={strikeNames} value={value} onChange={onChange} />;
      default:
        return (
          <input
            className={styles.varInput}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={v.placeholder ?? v.label}
          />
        );
    }
  }

  function handleInsert() {
    if (!selected) return;
    const description = buildShortDescription(selected, varValues);
    onInsert({
      name: selected.name,
      description,
      actionType: selected.actionType,
      genericAbilityName: selected.name,
    });
    onClose();
  }

  return (
    <div className={styles.picker}>

      {!selected ? (
        /* ── Search list ── */
        <>
          <div className={styles.searchRow}>
            <input
              ref={searchRef}
              className={styles.searchInput}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search abilities…"
            />
            <button className={styles.closeBtn} onClick={onClose} title="Cancel">×</button>
          </div>
          <div className={styles.list}>
            {filtered.map(def => (
              <div
                key={def.name}
                className={styles.listItem}
                onMouseDown={e => { e.preventDefault(); selectAbility(def); }}
              >
                <span className={styles.listItemName}>{def.name}</span>
                <span className={styles.listItemAction}>{actionLabel(def.actionType)}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className={styles.noResults}>No abilities match "{query}"</div>
            )}
          </div>
        </>
      ) : (
        /* ── Variable fill-in form ── */
        <>
          <div className={styles.searchRow}>
            <button
              className={styles.backBtn}
              onMouseDown={e => { e.preventDefault(); setSelected(null); setQuery(''); }}
              title="Back to list"
            >← Back</button>
            <span className={styles.selectedName}>{selected.name}</span>
            <button className={styles.closeBtn} onClick={onClose} title="Cancel">×</button>
          </div>

          {selected.variables.length === 0 ? (
            <p className={styles.noVarsNote}>This ability has no configurable values.</p>
          ) : (
            <div className={styles.varFields}>
              {selected.variables.map(v => (
                <div key={v.key} className={styles.varRow}>
                  <label className={styles.varLabel}>{v.label}</label>
                  {renderVarField(v, varValues[v.key] ?? '', val => setVarValues(prev => ({ ...prev, [v.key]: val })))}
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          <p className={styles.previewLabel}>Preview</p>
          <p className={styles.preview}>{buildDescription(selected, varValues)}</p>

          <button className={styles.insertBtn} onMouseDown={e => { e.preventDefault(); handleInsert(); }}>
            Insert ability
          </button>
        </>
      )}
    </div>
  );
}

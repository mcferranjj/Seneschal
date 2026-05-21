import { describe, it, expect } from 'vitest';
import { migrateActiveSection } from './useUIPrefs';

describe('migrateActiveSection', () => {
  it('migrates the removed "parties" section to "gm"', () => {
    expect(migrateActiveSection('parties')).toBe('gm');
  });

  it('passes through valid sections unchanged', () => {
    expect(migrateActiveSection('gm')).toBe('gm');
    expect(migrateActiveSection('rules')).toBe('rules');
    expect(migrateActiveSection('characters')).toBe('characters');
  });

  it('falls back to the default for unknown values', () => {
    expect(migrateActiveSection('bogus')).toBe('gm');
    expect(migrateActiveSection(undefined)).toBe('gm');
    expect(migrateActiveSection(null)).toBe('gm');
    expect(migrateActiveSection(42)).toBe('gm');
  });

  it('respects a custom fallback when supplied', () => {
    expect(migrateActiveSection('bogus', 'rules')).toBe('rules');
    // The 'parties' migration still wins over the custom fallback because
    // it is an explicit historical migration, not "unknown" data.
    expect(migrateActiveSection('parties', 'rules')).toBe('gm');
  });
});

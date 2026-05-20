import { describe, it, expect } from 'vitest';
import { titleCase } from './strings';

describe('titleCase', () => {
  it('capitalises the first letter', () => {
    expect(titleCase('elf')).toBe('Elf');
    expect(titleCase('draconic')).toBe('Draconic');
  });

  it('leaves the rest of the string untouched (no lowercasing)', () => {
    expect(titleCase('eLF')).toBe('ELF');
  });

  it('returns empty input unchanged', () => {
    expect(titleCase('')).toBe('');
  });

  it('handles single-character input', () => {
    expect(titleCase('a')).toBe('A');
  });
});

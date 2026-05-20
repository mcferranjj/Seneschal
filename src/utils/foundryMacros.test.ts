import { describe, it, expect } from 'vitest';
import { stripMechanicsSection } from './foundryMacros';

describe('stripMechanicsSection', () => {
  it('removes everything from the first "<Subject> Mechanics" heading onward', () => {
    const html =
      '<p>Lore paragraph one.</p>' +
      '<p>Lore paragraph two.</p>' +
      '<h2>Elf Mechanics</h2>' +
      '<p><strong>Hit Points</strong> 6</p>';
    expect(stripMechanicsSection(html)).toBe(
      '<p>Lore paragraph one.</p><p>Lore paragraph two.</p>',
    );
  });

  it('matches headings of any level (h1-h6)', () => {
    expect(stripMechanicsSection('<p>x</p><h3>Gnome Mechanics</h3><p>y</p>'))
      .toBe('<p>x</p>');
    expect(stripMechanicsSection('<p>x</p><h1>Mechanics</h1><p>y</p>'))
      .toBe('<p>x</p>');
  });

  it('tolerates attributes on the heading element', () => {
    const html =
      '<p>Lore.</p>' +
      '<h2 style="border-bottom:1px solid red">Gnome Mechanics</h2>' +
      '<p>summary</p>';
    expect(stripMechanicsSection(html)).toBe('<p>Lore.</p>');
  });

  it('returns the original HTML when no mechanics heading is present', () => {
    const html = '<p>Just lore, no mechanics block.</p>';
    expect(stripMechanicsSection(html)).toBe(html);
  });

  it('returns empty input unchanged', () => {
    expect(stripMechanicsSection('')).toBe('');
  });

  it('also strips any post-mechanics sections (e.g. heritages block)', () => {
    const html =
      '<p>Lore.</p>' +
      '<h2>Elf Mechanics</h2><p>HP 6</p>' +
      '<h2>Elf Heritages</h2><p>...</p>';
    expect(stripMechanicsSection(html)).toBe('<p>Lore.</p>');
  });
});

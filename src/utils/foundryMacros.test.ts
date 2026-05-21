import { describe, it, expect } from 'vitest';
import { stripMechanicsSection, toEditableText, toEditablePlainText } from './foundryMacros';

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

describe('toEditableText', () => {
  it('converts **bold** to <strong>bold</strong>', () => {
    expect(toEditableText('This is **bold** text')).toContain('<strong>bold</strong>');
  });

  it('converts __bold__ to <strong>bold</strong>', () => {
    expect(toEditableText('This is __bold__ text')).toContain('<strong>bold</strong>');
  });

  it('converts *italic* to <em>italic</em>', () => {
    expect(toEditableText('This is *italic* text')).toContain('<em>italic</em>');
  });

  it('converts _italic_ to <em>italic</em>', () => {
    expect(toEditableText('This is _italic_ text')).toContain('<em>italic</em>');
  });

  it('decodes HTML entities like &hellip;', () => {
    const result = toEditableText('dots&hellip;');
    expect(result).toContain('…');
    expect(result).not.toContain('&hellip;');
  });

  it('decodes &mdash;', () => {
    const result = toEditableText('text&mdash;more');
    expect(result).toContain('—');
  });

  it('decodes &ndash;', () => {
    const result = toEditableText('text&ndash;more');
    expect(result).toContain('–');
  });

  it('decodes &nbsp; to space', () => {
    const result = toEditableText('text&nbsp;more');
    expect(result).toContain(' ');
  });

  it('removes empty <p></p> tags', () => {
    const html = '<p>content</p><p></p><p>more</p>';
    const result = toEditableText(html);
    expect(result).not.toContain('<p></p>');
  });

  it('removes orphan <hr/> tags', () => {
    const result = toEditableText('<p>before</p><hr/><p>after</p>');
    expect(result).not.toContain('<hr');
  });

  it('unwraps <span class="pf2roll">1d6</span> to 1d6', () => {
    const result = toEditableText('<span class="pf2roll">1d6</span>');
    expect(result).toContain('1d6');
    expect(result).not.toContain('span');
  });

  it('strips all attributes from kept tags', () => {
    const result = toEditableText('<p style="color:red">text</p>');
    expect(result).toContain('<p>');
    expect(result).not.toContain('style');
  });

  it('collapses multiple whitespace', () => {
    const result = toEditableText('text   with    multiple\n\nspaces');
    expect(result).toBe('text with multiple spaces');
  });

  it('removes strikethrough markers', () => {
    const result = toEditableText('This ~~is~~ was');
    expect(result).toContain('is');
    expect(result).not.toContain('~~');
  });

  it('strips leading # headers', () => {
    const result = toEditableText('# Header\nContent here');
    expect(result).not.toContain('# Header');
    expect(result).toContain('Content');
  });

  it('handles empty/undefined input', () => {
    expect(toEditableText('')).toBe('');
    expect(toEditableText('undefined')).toContain('undefined');
  });

  it('whitelists allowed tags (p, strong, em, ul, ol, li)', () => {
    const html = '<p><strong>bold</strong> and <em>italic</em></p><ul><li>item</li></ul>';
    const result = toEditableText(html);
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('unwraps disallowed tags like <div> and <span>', () => {
    const html = '<div class="wrapper"><span>text</span></div>';
    const result = toEditableText(html);
    expect(result).toContain('text');
    expect(result).not.toContain('div');
    expect(result).not.toContain('span');
    expect(result).not.toContain('wrapper');
  });

  it('strips Foundry macros like @Damage', () => {
    const html = '@Damage[2d6+3]{damage text}';
    const result = toEditableText(html);
    // Should strip the @Damage macro and preserve label or infer text
    expect(result).not.toContain('@Damage');
  });
});

describe('toEditablePlainText', () => {
  it('strips HTML tags, returning plain text', () => {
    const result = toEditablePlainText('<p>Hello <strong>world</strong>.</p>');
    expect(result).toBe('Hello world.');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('preserves paragraph breaks as double newlines', () => {
    const result = toEditablePlainText('<p>Line 1.</p><p>Line 2.</p>');
    expect(result).toContain('Line 1.');
    expect(result).toContain('Line 2.');
    expect(result).toMatch(/Line 1\.\s*\n\n\s*Line 2\./);
  });

  it('decodes HTML entities', () => {
    const result = toEditablePlainText('Some &hellip; entity &amp; another');
    expect(result).toContain('…');
    expect(result).toContain('&');
    expect(result).not.toContain('&hellip;');
    expect(result).not.toContain('&amp;');
  });

  it('handles <hr/> and <br/> with newlines and no tags', () => {
    const result = toEditablePlainText('<hr/>Text<br/>more');
    expect(result).toContain('Text');
    expect(result).toContain('more');
    expect(result).not.toContain('<hr');
    expect(result).not.toContain('<br');
    // newlines should separate text from hr and br
    expect(result).toMatch(/Text\nmore/);
  });

  it('returns empty string for empty or whitespace input', () => {
    expect(toEditablePlainText('')).toBe('');
    expect(toEditablePlainText('   ')).toBe('');
  });

  it('handles Foundry macros mixed with HTML without crashing', () => {
    const result = toEditablePlainText('@Damage[2d6[fire]] and <p>text</p>');
    expect(result).not.toContain('@Damage');
    expect(result).not.toContain('<p>');
    expect(result).toContain('text');
  });
});

/**
 * Foundry Macro / HTML Processing Utilities
 *
 * Functions that transform raw Foundry VTT HTML into readable text or
 * clickable spans. Pure string operations — no React, no DB.
 */

import { loadTraitDescriptions } from '../sync/sync';
import type { PF2EItem } from '../types/pf2e';
import type { DamageGroupInput } from '../features/dice/DiceRoller';

/** Alias so existing callers importing DamageGroup from here continue to work. */
export type DamageGroup = DamageGroupInput;

// ── Internal helpers ──────────────────────────────────────────────────────────

// Regex that matches a dice expression including any modifier: "9d6", "3d12+4", "2d6-1"
const DICE_EXPR_RE = /^(\d+d\d+(?:[+-]\d+)?)/;

// Parse the type label from a damage group bracket: "9d6+4[fire]" → "fire"
function parseDamageType(group: string): string | null {
  const m = group.match(/\d+d\d+(?:[+-]\d+)?\[([^\]|]+)/);
  return m ? m[1] : null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Convert raw Foundry description source into clean HTML suitable for re-editing
 * in a contenteditable or textarea. Removes Foundry markup, converts markdown,
 * decodes entities, whitelists tags, and collapses whitespace.
 */
export function toEditableText(raw: string): string {
  if (!raw) return '';

  // Step 1: Strip Foundry macros (preserves inline damage/check text)
  let text = stripFoundryMacros(raw);

  // Step 2: Convert markdown to HTML
  // Bold: **text** and __text__ → <strong>text</strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* and _text_ → <em>text</em> (avoid matching inside words)
  // Use negative lookbehind/lookahead for word boundaries
  text = text.replace(/(?<!\w)\*([^\s*].+?[^\s*]|[^\s*])\*(?!\w)/g, '<em>$1</em>');
  text = text.replace(/(?<!\w)_([^\s_].+?[^\s_]|[^\s_])_(?!\w)/g, '<em>$1</em>');

  // Strikethrough: ~~text~~ → strip markers, keep text
  text = text.replace(/~~(.+?)~~/g, '$1');

  // Headers: strip leading # / ## / ### at line start
  text = text.replace(/^#{1,3}\s+/gm, '');

  // Step 3: Decode HTML entities (always use fallback for consistency)
  // Common Foundry entities
  text = text
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  // Step 4: Remove stray empty paragraphs and orphan <hr/>
  text = text.replace(/<p>\s*<\/p>/g, '');
  text = text.replace(/<hr\s*\/?>/g, '');

  // Step 5: Whitelist tags and strip attributes
  // Allowed: p, br, strong, em, u, h3, h4, ul, ol, li
  // Strip everything else (unwrap contents) and remove attributes
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<wrapper>${text}</wrapper>`, 'text/html');
    const allowedTags = new Set(['p', 'br', 'strong', 'em', 'u', 'h3', 'h4', 'ul', 'ol', 'li']);

    // Walk and modify the DOM tree
    const walk = (node: Node): void => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();

        // Process children first (bottom-up)
        const children = Array.from(el.childNodes);
        children.forEach(walk);

        if (!allowedTags.has(tagName)) {
          // Disallowed tag: unwrap by moving children before the element
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
          }
        } else {
          // Remove all attributes from allowed elements
          while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0]!.name);
          }
        }
      }
    };

    Array.from(doc.body.childNodes).forEach(walk);

    // Get inner HTML from wrapper element
    const wrapper = doc.body.querySelector('wrapper');
    text = wrapper ? wrapper.innerHTML : doc.body.innerHTML;
  } else {
    // Fallback: regex-based tag unwrapping for non-browser environments
    // Remove all attributes from tags
    text = text.replace(/<(\/?(?:p|br|strong|em|u|h3|h4|ul|ol|li))\s[^>]*>/gi, '<$1>');
    // Unwrap disallowed tags
    text = text.replace(/<(?!\/?(?:p|br|strong|em|u|h3|h4|ul|ol|li)\b)[^>]*>/g, '');
    text = text.replace(/<\/(?!(?:p|br|strong|em|u|h3|h4|ul|ol|li)\b)[^>]*>/g, '');
  }

  // Step 6: Collapse whitespace and trim
  text = text
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Convert Foundry source text to clean plain text (no HTML) suitable for a textarea.
 *
 * 1. Strips Foundry macros via `stripFoundryMacros`.
 * 2. Converts block-level closing tags to newlines so paragraph breaks survive.
 * 3. Strips all remaining HTML tags.
 * 4. Decodes common HTML entities.
 * 5. Collapses whitespace while preserving paragraph breaks (at most two
 *    consecutive newlines).
 * 6. Trims leading/trailing whitespace.
 */
export function toEditablePlainText(raw: string): string {
  if (!raw) return '';

  // Step 1: Strip Foundry macros
  let text = stripFoundryMacros(raw);

  // Step 2: Replace block-level boundaries with newlines before stripping tags
  text = text
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<hr\s*\/?>/gi, '\n');

  // Step 3: Strip all remaining HTML tags
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    text = doc.body.textContent ?? text.replace(/<[^>]*>/g, '');
  } else {
    // Regex fallback for non-browser environments
    text = text.replace(/<[^>]*>/g, '');
    // Decode common entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&hellip;/g, '…')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  // Step 4: Normalise whitespace — collapse runs of spaces/tabs on each line,
  // but preserve paragraph breaks (at most two consecutive newlines).
  text = text
    .replace(/[ \t]+/g, ' ')           // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')        // at most two consecutive newlines
    .replace(/[ \t]*\n[ \t]*/g, '\n'); // trim spaces around newlines

  return text.trim();
}

/**
 * Strip Foundry inline macros to plain readable text.
 *
 * Handles:
 *  - @Damage[...]{label} → label or parsed dice expression
 *  - @Check[...]{label}  → human-readable save/check text
 *  - [[/gmr ...]]        → display text from {label} or removed
 *  - @UUID[...]          → display name
 *  - @Template[...]      → "a 30-foot cone" etc.
 *  - @Localize / other @ → removed
 */
export function stripFoundryMacros(html: string): string {
  return html
    .replace(/@Damage\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{([^}]*)\})?/g, (_, inner, label) => {
      if (label) return label;
      const withoutOptions = inner.replace(/\|[^[,].*$/, '');
      const groups = withoutOptions.split(',');
      return groups.map((group: string) => {
        const exprMatch = group.trim().match(DICE_EXPR_RE);
        const type = parseDamageType(group.trim());
        if (exprMatch && type) return `${exprMatch[1]} ${type} damage`;
        if (exprMatch) return `${exprMatch[1]} damage`;
        return group.split('[')[0].trim();
      }).filter(Boolean).join(' + ');
    })
    .replace(
      /@Check\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{([^}]*)\})?(\s+(?:saving\s+throw|save|check)(?:\s+against\s+(?:the\s+)?(?:\w+['']s\s+)?(\w+)\s+DC)?)?/g,
      (_, inner, labelOverride, _trailingSuffix, trailingDefense) => {
        if (labelOverride) return labelOverride;
        const segments = inner.split('|');
        const checkType = segments[0]?.trim() ?? '';
        const dcMatch = inner.match(/\bdc:(\d+)/i);
        const defenseMatch = inner.match(/\bdefense:(\w+)/i);
        const againstMatch = inner.match(/\bagainst:(\w+(?:-\w+)*)/i);
        const isBasic = /\bbasic\b/i.test(inner);
        const saveTypes = new Set(['fortitude', 'reflex', 'will']);
        const isSave = saveTypes.has(checkType.toLowerCase());
        const isFlat = checkType.toLowerCase() === 'flat';
        const typeLabel = (() => {
          if (isFlat) return 'flat check';
          if (isSave) return `${checkType.charAt(0).toUpperCase() + checkType.slice(1)} save`;
          return `${checkType.charAt(0).toUpperCase() + checkType.slice(1)} check`;
        })();
        const basicPrefix = isBasic ? 'basic ' : '';
        if (dcMatch) return `DC ${dcMatch[1]} ${basicPrefix}${typeLabel}`;
        if (defenseMatch) {
          const defense = defenseMatch[1];
          const defenseLabel = defense.charAt(0).toUpperCase() + defense.slice(1);
          return `${basicPrefix}${typeLabel} against the creature's ${defenseLabel} DC`;
        }
        if (againstMatch) {
          const against = againstMatch[1].replace(/-/g, ' ');
          const againstLabel = against.charAt(0).toUpperCase() + against.slice(1);
          return `${basicPrefix}${typeLabel} against ${againstLabel} DC`;
        }
        if (trailingDefense) {
          const defenseLabel = trailingDefense.charAt(0).toUpperCase() + trailingDefense.slice(1);
          return `${basicPrefix}${typeLabel} against the creature's ${defenseLabel} DC`;
        }
        return `${basicPrefix}${typeLabel}`;
      }
    )
    .replace(/\[\[\/[^\]]+\]\]\{([^}]+)\}/g, '$1')
    .replace(/\[\[\/[^\]]+\]\]/g, '')
    .replace(/@UUID\[Compendium\.[^\]]+\]\{([^}]+)\}/g, '$1')
    .replace(/@UUID\[Actor\.[^\]]+\]\{([^}]+)\}/g, '$1')
    .replace(/@UUID\[[^\]]+\.([^\].]+)\]/g, '$1')
    .replace(/@Localize\[[^\]]+\]/g, '')
    .replace(/@Template\[([^\]]+)\]/g, (_, inner) => {
      const parts = inner.split('|');
      const type = parts[0]?.trim() ?? 'area';
      const distMatch = inner.match(/distance:(\d+)/i);
      const dist = distMatch ? `${distMatch[1]}-foot` : null;
      return dist ? `a ${dist} ${type}` : `a ${type}`;
    })
    .replace(/@[A-Z][a-zA-Z]+\[[^\]]+\]/g, '');
}

/**
 * Wrap dice expressions and modifiers in clickable spans for the dice roller.
 * Operates only on text nodes (between HTML tags).
 */
export function linkRolls(html: string): string {
  return html.replace(/>([^<]+)</g, (_match, text) => {
    const linked = text.replace(
      /\b(\d+d\d+(?:[+-]\d+)?)\b|(?<!\d)([+-]\d+)(?!\d)/g,
      (m: string) => {
        const expr = m.trim();
        const label = /d/i.test(expr) ? 'Damage' : 'Check';
        return `<span class="pf2roll" data-expr="${expr}" data-label="${label}">${m}</span>`;
      }
    );
    return `>${linked}<`;
  });
}

/**
 * Apply elite/weak adjustments to a raw Foundry HTML description.
 * Bumps the first @Damage macro's first group by dmgMod and all @Check dc: by dcMod.
 */
export function applyEliteWeakToHtml(rawHtml: string, dmgMod: number, dcMod: number): string {
  if (dmgMod === 0 && dcMod === 0) return rawHtml;

  let appliedDamageOnce = false;
  let result = dmgMod === 0 ? rawHtml : rawHtml.replace(
    /@Damage\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{([^}]*)\})?/g,
    (fullMatch, inner, label) => {
      if (appliedDamageOnce) return fullMatch;
      appliedDamageOnce = true;
      const optionsSuffix = inner.match(/\|[^[,].*$/)?.[0] ?? '';
      const withoutOptions = inner.replace(/\|[^[,].*$/, '');
      const groups = withoutOptions.split(',');
      const firstGroup = groups[0].trim();
      const exprMatch = firstGroup.match(DICE_EXPR_RE);
      if (!exprMatch) return fullMatch;
      const diceMatch = exprMatch[1].match(/^(\d+d\d+)([+-]\d+)?$/);
      let newExpr: string;
      if (diceMatch) {
        const dice = diceMatch[1];
        const existingMod = diceMatch[2] ? parseInt(diceMatch[2]) : 0;
        const totalMod = existingMod + dmgMod;
        newExpr = totalMod === 0 ? dice : `${dice}${totalMod > 0 ? `+${totalMod}` : totalMod}`;
      } else {
        newExpr = `${exprMatch[1]}${dmgMod > 0 ? `+${dmgMod}` : dmgMod}`;
      }
      const typeAndRest = firstGroup.slice(exprMatch[0].length);
      const newInner = [newExpr + typeAndRest, ...groups.slice(1)].join(',') + optionsSuffix;
      let newLabel = label as string | undefined;
      if (label) {
        const labelParts = label.split(/(\s+and\s+|\s+plus\s+)/i);
        labelParts[0] = (labelParts[0] as string).replace(DICE_EXPR_RE, newExpr);
        newLabel = labelParts.join('');
      }
      return `@Damage[${newInner}]${newLabel != null ? `{${newLabel}}` : ''}`;
    }
  );

  if (dcMod !== 0) result = result.replace(
    /@Check\[([^\]]*)\]/g,
    (fullMatch, inner) => {
      const checkType = inner.split('|')[0]?.trim().toLowerCase() ?? '';
      if (checkType === 'flat') return fullMatch;
      return fullMatch.replace(/(\bdc:)(\d+)/, (_, pre, dc) => `${pre}${parseInt(dc) + dcMod}`);
    }
  );

  return result;
}

/**
 * Extract all @Damage macros from raw Foundry HTML, returned as { expr, label } pairs
 * suitable for the multi-damage roller.
 *
 * Falls back to scanning plain text for dice expressions (e.g. custom creature abilities)
 * when no @Damage macros are present.
 */
export function extractDamageGroups(rawHtml: string): DamageGroup[] {
  const groups: DamageGroup[] = [];
  const re = /@Damage\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{([^}]*)\})?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawHtml)) !== null) {
    const inner = m[1];
    const labelText = m[2];
    const withoutOptions = inner.replace(/\|[^[,].*$/, '');
    const parts = withoutOptions.split(',');
    parts.forEach((part, i) => {
      const trimmed = part.trim();
      const exprMatch = trimmed.match(DICE_EXPR_RE);
      if (!exprMatch) return;
      const expr = exprMatch[1];
      let label: string;
      if (labelText && parts.length === 1) {
        label = labelText;
      } else if (labelText && parts.length > 1) {
        const labelParts = labelText.split(/\s+and\s+|\s+plus\s+/i);
        label = labelParts[i]?.trim() ?? labelText;
      } else {
        const type = parseDamageType(trimmed);
        label = type ? `${type} damage` : 'damage';
      }
      groups.push({ expr, label });
    });
  }

  // Fallback: if no @Damage macros found, scan plain text for dice expressions.
  // Matches patterns like "2d8+7 bludgeoning damage", "3d6 fire damage", "1d4 damage"
  // Operates on stripped text so HTML tags don't interfere.
  if (groups.length === 0) {
    const plainText = rawHtml.replace(/<[^>]*>/g, ' ');
    // Match: <dice_expr> [optional whitespace] <optional damage-type word(s)> [optional " damage"]
    // e.g. "2d8+7 bludgeoning damage", "3d6 fire damage", "1d4 damage", "2d6+3 negative damage"
    // Capture: <dice> <type-word(s)> "damage"  OR  <dice> "damage" (no type)
    // Type words are 1–2 non-"damage" words immediately before the word "damage".
    const plainRe = /\b(\d+d\d+(?:[+-]\d+)?)\s+(?:((?!damage\b)\w+(?:\s+(?!damage\b)\w+)?)\s+damage\b|(damage\b))/gi;
    let pm: RegExpExecArray | null;
    while ((pm = plainRe.exec(plainText)) !== null) {
      const expr = pm[1];
      // pm[2] is the damage type words (e.g. "bludgeoning", "fire", "negative"),
      // pm[3] is "damage" when there's no type word before it
      const damageType = pm[2] ?? null;
      const label = damageType ? `${damageType} damage` : 'damage';
      groups.push({ expr, label });
    }
  }

  return groups;
}

// ── Keyword linking (trait tooltip singleton) ─────────────────────────────────

let _keywordMap: Record<string, string> = {};
let _keywordRegex: RegExp | null = null;

function buildKeywordRegex(map: Record<string, string>): RegExp {
  return new RegExp(
    '\\b(' +
      Object.keys(map)
        .sort((a, b) => b.length - a.length)
        .map(k => k.replace(/[-]/g, '[-\\s]').replace(/[()]/g, '\\$&'))
        .join('|') +
      ')\\b',
    'gi'
  );
}

/**
 * Call once on app load (after sync). Loads Foundry trait descriptions from the DB
 * and builds the keyword map and regex used by linkKeywords().
 */
export async function initTraitDescriptions(): Promise<void> {
  const fromDb = await loadTraitDescriptions();
  if (Object.keys(fromDb).length === 0) return;
  const map: Record<string, string> = {};
  for (const [traitLower, desc] of Object.entries(fromDb)) {
    const displayKey = traitLower.charAt(0).toUpperCase() + traitLower.slice(1);
    map[displayKey] = desc;
  }
  _keywordMap = map;
  _keywordRegex = buildKeywordRegex(map);
}

/**
 * Wrap recognized trait/keyword mentions in tooltip spans.
 * Requires initTraitDescriptions() to have been called first.
 */
export function linkKeywords(html: string): string {
  if (!_keywordRegex) return html;
  return html.replace(/>([^<]+)</g, (_match, text) => {
    const linked = text.replace(_keywordRegex!, (kw: string) => {
      const key = Object.keys(_keywordMap).find(k => k.toLowerCase() === kw.toLowerCase()) ?? kw;
      const tip = _keywordMap[key] ?? '';
      return `<span class="pf2kw" data-tip="${tip.replace(/"/g, '&quot;')}">${kw}</span>`;
    });
    return `>${linked}<`;
  });
}

export interface ProcessFoundryHtmlOptions {
  /**
   * When false, skip `linkKeywords` so no `.pf2kw` tooltip spans are injected
   * into the output.  Use this in contexts where keyword popups must not fire
   * (e.g. encounter statblock descriptions).  Defaults to true.
   */
  interactive?: boolean;
}

/**
 * Apply the standard Foundry HTML processing pipeline:
 * strip macros → link keywords → link roll expressions.
 *
 * Pass `{ interactive: false }` to skip keyword linking and keep the output
 * free of `.pf2kw` spans — guaranteeing no tooltip popup can appear regardless
 * of which listeners may be active on ancestor elements.
 */
export function processFoundryHtml(raw: string, options: ProcessFoundryHtmlOptions = {}): string {
  const { interactive = true } = options;
  const stripped = stripFoundryMacros(raw);
  return linkRolls(interactive ? linkKeywords(stripped) : stripped);
}

/**
 * Drop the rules-summary "<Subject> Mechanics" section (and everything after
 * it, including any subsequent heritage block) from a Foundry journal lore
 * page. The structured detail panels in the UI already render HP, size,
 * speed, ability boosts, languages, traits, etc., so the duplicate text
 * block is just noise.
 *
 * Used for ancestry descriptions: PF2e ancestry data stores only a one-line
 * flavor blurb in `system.description.value`, with the full prose linked via
 * an `@UUID[...JournalEntryPage...]` macro that we inline during sync. That
 * inlined HTML ends with a "<Ancestry> Mechanics" heading we want to strip.
 */
export function stripMechanicsSection(html: string): string {
  if (!html) return html;
  const match = html.match(/<h[1-6]\b[^>]*>[^<]*\bMechanics\b[^<]*<\/h[1-6]>/i);
  if (!match || match.index === undefined) return html;
  return html.slice(0, match.index).trimEnd();
}

/**
 * Returns true if the PF2EItem is a limited-use ability (recharge, per-day,
 * per-encounter, etc.) rather than an at-will action. Used to determine whether
 * elite/weak adjustments apply +2 or +4 damage.
 */
export function isLimitedUse(item: PF2EItem): boolean {
  const desc = item.system?.description?.value ?? '';
  const actionType = item.system?.actionType?.value;
  // Recharge mechanic
  if (/\[\[\/gmr\b/i.test(desc)) return true;
  // "can't/cannot use X again"
  if (/can['']t use .+ again|cannot use .+ again/i.test(desc)) return true;
  // Frequency language: "N times per X" where X is not "round"
  const freqMatch = desc.match(/\b(?:once|twice|\d+ times?)\s+per\s+(round|minute|hour|day|week|encounter|combat)/i);
  if (freqMatch && freqMatch[1].toLowerCase() !== 'round') return true;
  // Free action / reaction triggered abilities are typically limited
  if (actionType === 'reaction') return true;
  return false;
}

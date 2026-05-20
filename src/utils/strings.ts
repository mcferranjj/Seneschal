/**
 * Capitalise the first letter of `input`, leaving the rest untouched.
 * Returns the original string if it's empty.
 *
 * Used wherever lower-cased PF2e data fields (rarities, sizes, language
 * codes, etc.) need to be presented as proper nouns in the UI.
 */
export function titleCase(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

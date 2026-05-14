/**
 * Suggestion ranking utility.
 *
 * Filters a list to items that contain the query string, then sorts so that
 * prefix matches (items that *start with* the query) appear before mid-word
 * matches. Within each group, original list order is preserved.
 *
 * To change how suggestions are ranked app-wide, edit only this function.
 */
export function rankSuggestions(items: readonly string[], query: string): string[] {
  const q = query.toLowerCase();
  return items
    .filter(s => s.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(q);
      const bStarts = b.toLowerCase().startsWith(q);
      if (aStarts === bStarts) return 0;
      return aStarts ? -1 : 1;
    });
}

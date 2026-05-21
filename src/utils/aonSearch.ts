/**
 * aonSearch.ts
 *
 * Utility for resolving a creature/hazard name + type to its canonical
 * Archives of Nethys URL via the AoN Elasticsearch API.
 *
 * Always returns remaster content when available (AoN returns it at higher
 * priority in search results). If legacy content is needed this would need
 * a separate query strategy.
 */

// Words that confuse the AoN sayt (search-as-you-type) index and should be
// stripped before building the per-word match clauses.
const EXCLUDE_WORDS = ['spellcaster'];

const AON_SEARCH_ENDPOINT = 'https://elasticsearch.aonprd.com/aon/_search';
const AON_BASE_URL = 'https://2e.aonprd.com';

/** Extracts the meaningful search words from a creature name. */
function extractWordlist(name: string): string[] {
  return (name.match(/\b\w+\b/g) ?? [])
    .filter(w => !EXCLUDE_WORDS.includes(w.toLowerCase()));
}

/** Builds the Elasticsearch query body as a plain object. */
function buildQueryBody(name: string, type: string): object {
  const lowerName = name.toLowerCase();
  const wordlist = extractWordlist(name);

  const wordMatches = wordlist.map(word => ({
    multi_match: {
      query: word,
      type: 'best_fields',
      fields: ['name', 'legacy_name', 'remaster_name'],
      fuzziness: 'auto',
    },
  }));

  return {
    query: {
      function_score: {
        query: {
          bool: {
            should: [
              { match_phrase_prefix: { 'name.sayt': { query: lowerName } } },
              { term: { name: lowerName } },
              {
                bool: {
                  must: [
                    ...wordMatches,
                    { term: { type } },
                  ],
                },
              },
            ],
            minimum_should_match: 1,
            must_not: [
              { term: { exclude_from_search: true } },
              { term: { category: 'item-bonus' } },
              { exists: { field: 'remaster_id' } },
              { exists: { field: 'item_child_id' } },
            ],
          },
        },
        boost_mode: 'multiply',
        functions: [
          { filter: { terms: { type: ['Ancestry', 'Class', 'Versatile Heritage'] } }, weight: 1.2 },
          { filter: { terms: { type: ['Trait'] } }, weight: 1.05 },
        ],
      },
    },
    size: 20,
    sort: ['_score', '_doc'],
    _source: { excludes: ['text'] },
  };
}

/**
 * Returns the full AoN URL for the given name + entity type, or null if not
 * found. Throws nothing — errors are logged and null is returned.
 */
export async function getAonUrl(search: { name: string; type: string }): Promise<string | null> {
  try {
    const body = JSON.stringify(buildQueryBody(search.name, search.type));

    const response = await fetch(AON_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await response.json();
    if (data.hits.total.value !== 0) {
      return AON_BASE_URL + (data.hits.hits[0]._source.url as string);
    }
    return null;
  } catch (error) {
    console.error('aonSearch: error fetching AoN URL:', error);
    return null;
  }
}

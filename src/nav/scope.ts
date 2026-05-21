/**
 * Section-scoped navigation entries are flushed when the user switches to a
 * different top-level section, so back navigation doesn't replay actions from
 * a section the user has left behind.
 *
 * Entries without a scope are "global" (e.g. modals like the help overlay)
 * and survive section changes.
 */
export type NavScope = 'gm' | 'characters' | 'rules';

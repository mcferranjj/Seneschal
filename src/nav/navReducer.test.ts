import { describe, it, expect } from 'vitest';
import { navReducer, type HistoryEntry, type NavState } from './navReducer';

const noop = () => {};

function makeEntry(id: number, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id,
    undo: noop,
    ...overrides,
  };
}

const EMPTY: NavState = { back: [], forward: [] };

describe('navReducer', () => {
  describe('push', () => {
    it('appends to back stack', () => {
      const a = makeEntry(1);
      const state = navReducer(EMPTY, { type: 'push', entry: a });
      expect(state.back).toEqual([a]);
      expect(state.forward).toEqual([]);
    });

    it('clears forward stack on push', () => {
      const a = makeEntry(1);
      const b = makeEntry(2);
      const c = makeEntry(3);
      const initial: NavState = { back: [a], forward: [b] };
      const state = navReducer(initial, { type: 'push', entry: c });
      expect(state.back).toEqual([a, c]);
      expect(state.forward).toEqual([]);
    });
  });

  describe('remove', () => {
    it('removes the entry with the matching id from back stack', () => {
      const a = makeEntry(1);
      const b = makeEntry(2);
      const initial: NavState = { back: [a, b], forward: [] };
      const state = navReducer(initial, { type: 'remove', id: 1 });
      expect(state.back).toEqual([b]);
    });

    it('leaves forward stack untouched', () => {
      const a = makeEntry(1);
      const b = makeEntry(2, { redo: noop });
      const initial: NavState = { back: [a], forward: [b] };
      const state = navReducer(initial, { type: 'remove', id: 1 });
      expect(state.forward).toEqual([b]);
    });
  });

  describe('pop', () => {
    it('moves entry to forward stack when it has a redo function', () => {
      const a = makeEntry(1, { redo: noop });
      const initial: NavState = { back: [a], forward: [] };
      const state = navReducer(initial, { type: 'pop' });
      expect(state.back).toEqual([]);
      expect(state.forward).toEqual([a]);
    });

    it('drops the entry when it has no redo function', () => {
      const a = makeEntry(1); // no redo
      const initial: NavState = { back: [a], forward: [] };
      const state = navReducer(initial, { type: 'pop' });
      expect(state.back).toEqual([]);
      expect(state.forward).toEqual([]);
    });

    it('preserves existing forward entries when popping a redoable entry', () => {
      const a = makeEntry(1, { redo: noop });
      const b = makeEntry(2, { redo: noop });
      const initial: NavState = { back: [a], forward: [b] };
      const state = navReducer(initial, { type: 'pop' });
      expect(state.forward).toEqual([b, a]);
    });

    it('returns same state when back is empty', () => {
      const state = navReducer(EMPTY, { type: 'pop' });
      expect(state).toBe(EMPTY);
    });
  });

  describe('popForward', () => {
    it('moves top forward entry back onto the back stack', () => {
      const a = makeEntry(1, { redo: noop });
      const initial: NavState = { back: [], forward: [a] };
      const state = navReducer(initial, { type: 'popForward' });
      expect(state.back).toEqual([a]);
      expect(state.forward).toEqual([]);
    });

    it('appends to existing back entries (ping-pong scenario)', () => {
      const a = makeEntry(1);
      const b = makeEntry(2, { redo: noop });
      const initial: NavState = { back: [a], forward: [b] };
      const state = navReducer(initial, { type: 'popForward' });
      expect(state.back).toEqual([a, b]);
      expect(state.forward).toEqual([]);
    });

    it('returns same state when forward is empty', () => {
      const state = navReducer(EMPTY, { type: 'popForward' });
      expect(state).toBe(EMPTY);
    });
  });

  describe('flushOtherScopes', () => {
    it('keeps entries matching the kept scope and global (no-scope) entries on both stacks', () => {
      const globalEntry = makeEntry(1);
      const rulesEntry = makeEntry(2, { scope: 'rules' });
      const gmEntry = makeEntry(3, { scope: 'gm' });
      const fwdGlobal = makeEntry(4, { redo: noop });
      const fwdRules = makeEntry(5, { scope: 'rules', redo: noop });
      const fwdGm = makeEntry(6, { scope: 'gm', redo: noop });
      const initial: NavState = {
        back: [globalEntry, rulesEntry, gmEntry],
        forward: [fwdGlobal, fwdRules, fwdGm],
      };
      const state = navReducer(initial, { type: 'flushOtherScopes', keepScope: 'rules' });
      expect(state.back).toEqual([globalEntry, rulesEntry]);
      expect(state.forward).toEqual([fwdGlobal, fwdRules]);
    });
  });

  describe('integration: back then forward ping-pong', () => {
    it('round-trips a redoable entry between stacks', () => {
      const a = makeEntry(1, { redo: noop });
      let s: NavState = EMPTY;
      s = navReducer(s, { type: 'push', entry: a });
      expect(s.back).toEqual([a]);
      s = navReducer(s, { type: 'pop' });
      expect(s.back).toEqual([]);
      expect(s.forward).toEqual([a]);
      s = navReducer(s, { type: 'popForward' });
      expect(s.back).toEqual([a]);
      expect(s.forward).toEqual([]);
      s = navReducer(s, { type: 'pop' });
      expect(s.forward).toEqual([a]);
    });

    it('pushing a new entry while forward has items wipes the forward stack', () => {
      const a = makeEntry(1, { redo: noop });
      const b = makeEntry(2);
      let s: NavState = { back: [], forward: [a] };
      s = navReducer(s, { type: 'push', entry: b });
      expect(s.forward).toEqual([]);
      expect(s.back).toEqual([b]);
    });
  });
});

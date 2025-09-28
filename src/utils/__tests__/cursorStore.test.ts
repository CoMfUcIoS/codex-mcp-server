import {
  CursorStore,
  advanceChunk,
  saveChunk,
  peekChunk,
} from '../cursorStore';

describe('CursorStore', () => {
  it('should set and get cursor', () => {
    const store = new CursorStore();
    store.set('session1', 'cursor1');
    expect(store.get('session1')).toBe('cursor1');
  });

  it('should return undefined for unknown session', () => {
    const store = new CursorStore();
    expect(store.get('unknown')).toBeUndefined();
  });

  it('should clear all cursors', () => {
    const store = new CursorStore();
    store.set('session1', 'cursor1');
    store.clear();
    expect(store.get('session1')).toBeUndefined();
  });
});

describe('advanceChunk and gc', () => {
  it('removes expired entries via gc', () => {
    const id = saveChunk('abc');
    const store = new CursorStore();
    store.set(id, { remaining: 'abc', expiresAt: Date.now() - 1000 });
    advanceChunk(id, 1);
    expect(peekChunk(id)).toBeUndefined();
  });

  it('returns early if cursor does not exist', () => {
    expect(() => advanceChunk('notfound', 1)).not.toThrow();
  });
});

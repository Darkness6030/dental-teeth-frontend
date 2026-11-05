import assert from 'node:assert/strict';
import test from 'node:test';
import { createUndoHistory, changeUndoHistory, stepUndoHistory } from '../src/utils/undoHistory.js';

test('undo and redo restore grouped photo edits and a reset as distinct actions', () => {
  const original = { zoom: 100, split: 50 };
  let history = createUndoHistory(original);
  const drag = Symbol('drag');
  history = changeUndoHistory(history, { zoom: 120, split: 50 }, drag);
  history = changeUndoHistory(history, { zoom: 140, split: 50 }, drag);
  history = changeUndoHistory(history, { zoom: 100, split: 50 });
  assert.equal(history.past.length, 2);
  history = stepUndoHistory(history, 'undo');
  assert.equal(history.present.zoom, 140);
  history = stepUndoHistory(history, 'undo');
  assert.deepEqual(history.present, original);
  history = stepUndoHistory(history, 'redo');
  assert.equal(history.present.zoom, 140);
});

test('new case can be undone, and editing after undo clears redo', () => {
  const draft = { name: 'Кейс', photos: ['before', 'after'], case_id: 5 };
  let history = changeUndoHistory(createUndoHistory(draft), {
    name: '',
    photos: [],
    case_id: null,
  });
  history = stepUndoHistory(history, 'undo');
  assert.equal(history.present, draft);
  history = changeUndoHistory(history, { ...draft, name: 'Исправленный кейс' });
  assert.equal(history.future.length, 0);
});

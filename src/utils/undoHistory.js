export const createUndoHistory = (present) => ({ present, past: [], future: [], group: null });

export function changeUndoHistory(history, present, group = null) {
  if (present === history.present) return history;
  return {
    present,
    past:
      group && group === history.group
        ? history.past
        : [...history.past, history.present].slice(-50),
    future: [],
    group,
  };
}

export function stepUndoHistory(history, direction) {
  if (direction === 'undo' && history.past.length) {
    return {
      present: history.past.at(-1),
      past: history.past.slice(0, -1),
      future: [history.present, ...history.future],
      group: null,
    };
  }
  if (direction === 'redo' && history.future.length) {
    return {
      present: history.future[0],
      past: [...history.past, history.present],
      future: history.future.slice(1),
      group: null,
    };
  }
  return history;
}

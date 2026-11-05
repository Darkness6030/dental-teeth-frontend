import { useCallback, useRef, useState } from 'react';
import { changeUndoHistory, createUndoHistory, stepUndoHistory } from '../utils/undoHistory';

export default function useUndoState(initial) {
  const [history, setHistory] = useState(() =>
    createUndoHistory(typeof initial === 'function' ? initial() : initial),
  );
  const lastEdit = useRef({ key: null, time: 0, token: null });
  const setValue = useCallback((action, key = null) => {
    const now = Date.now();
    const previous = lastEdit.current;
    const group =
      key && key === previous.key && now - previous.time < 800
        ? previous.token
        : key
          ? Symbol(key)
          : null;
    lastEdit.current = { key, time: now, token: group };
    setHistory((current) =>
      changeUndoHistory(
        current,
        typeof action === 'function' ? action(current.present) : action,
        group,
      ),
    );
  }, []);
  const undo = useCallback(() => {
    lastEdit.current = { key: null, time: 0, token: null };
    setHistory((current) => stepUndoHistory(current, 'undo'));
  }, []);
  const redo = useCallback(() => {
    lastEdit.current = { key: null, time: 0, token: null };
    setHistory((current) => stepUndoHistory(current, 'redo'));
  }, []);
  const replace = useCallback((action) => {
    lastEdit.current = { key: null, time: 0, token: null };
    setHistory((current) =>
      createUndoHistory(typeof action === 'function' ? action(current.present) : action),
    );
  }, []);
  return [
    history.present,
    setValue,
    { undo, redo, replace, canUndo: !!history.past.length, canRedo: !!history.future.length },
  ];
}

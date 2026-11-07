import { useEffect, useRef, useState } from 'react';
import useUndoState from './useUndoState';
import { getCollageDraft, saveCollageDraft } from '../api';
import { readLocalDraft, writeLocalDraft } from '../utils/collageDraft';
import { caseDate } from '../utils/caseDates';
import {
  DEFAULT_ADJUSTMENT,
  DEFAULT_EXPORT,
  normalizeExportSettings,
} from '../utils/collageCanvas';

export const emptyWorkspace = () => ({
  mode: 'website',
  doctor: '',
  description: '',
  before: null,
  after: null,
  auto_align: true,
  matrices: null,
  adjustments: null,
  settings: { ...DEFAULT_EXPORT },
  case_id: null,
  name: '',
});

export const emptyProdoctorWorkspace = () => ({
  mode: 'prodoctor',
  name: '',
  doctor: '',
  description: '',
  photos: [],
  text: '',
  services: [],
  case_id: null,
  source_case_id: null,
});

export default function useCollageWorkspace(
  userId,
  mode = 'website',
  { seed = null, fresh = false, savedAt = null } = {},
) {
  const storageKey = mode === 'website' ? userId : `${userId}:prodoctor`;
  const [workspace, setWorkspace, history] = useUndoState(
    mode === 'website' ? emptyWorkspace : emptyProdoctorWorkspace,
  );
  const replaceWorkspace = history.replace;
  const [ready, setReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('Загружаем черновик…');
  const saveChain = useRef(Promise.resolve());
  const revision = useRef(0);
  const skipInitialSave = useRef(true);
  const localSaveChain = useRef(Promise.resolve());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    Promise.allSettled([readLocalDraft(storageKey), getCollageDraft(mode)]).then(
      ([local, server]) => {
        if (cancelled) return;
        const choices = [local, server]
          .filter(
            (r) =>
              r.status === 'fulfilled' &&
              r.value?.state &&
              (!seed ||
                (!fresh &&
                  r.value.state.project_id === seed.project_id &&
                  (r.value.state.case_id || null) === (seed.case_id || null) &&
                  (!savedAt || caseDate(r.value.updated_at) > caseDate(savedAt)))),
          )
          .map((r) => r.value)
          .sort((a, b) => caseDate(b.updated_at) - caseDate(a.updated_at));
        const state =
          choices[0]?.state ||
          seed ||
          (mode === 'website' ? emptyWorkspace() : emptyProdoctorWorkspace());
        skipInitialSave.current = true;
        replaceWorkspace(
          mode === 'website'
            ? { ...state, settings: normalizeExportSettings(state.settings) }
            : state,
        );
        setReady(true);
        setDraftStatus(
          server.status === 'rejected'
            ? choices.length
              ? 'Восстановлен локальный черновик. Нет связи с сервером.'
              : 'Не удалось загрузить черновик с сервера.'
            : choices.length
              ? 'Черновик восстановлен'
              : '',
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, mode, storageKey, replaceWorkspace, seed, fresh, savedAt]);

  useEffect(() => {
    if (!ready || !userId) return;
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    const current = ++revision.current;
    let cancelled = false;
    let localSaved = false;
    const isCurrent = () => !cancelled && revision.current === current;
    const draft = { state: workspace, updated_at: new Date().toISOString() };
    localSaveChain.current = localSaveChain.current
      .catch(() => {})
      .then(async () => {
        if (!isCurrent()) return;
        try {
          await writeLocalDraft(storageKey, draft);
          localSaved = true;
          if (isCurrent()) setDraftStatus('Черновик сохранён на этом устройстве…');
        } catch {
          /* The server save still runs if browser storage is unavailable. */
        }
      });
    const timer = setTimeout(() => {
      if (isCurrent()) setDraftStatus('Сохраняем черновик…');
      saveChain.current = saveChain.current
        .catch(() => {})
        .then(async () => {
          // Skip obsolete snapshots still waiting behind a request in flight.
          if (!isCurrent()) return;
          try {
            await saveCollageDraft(workspace);
            if (isCurrent()) setDraftStatus('Черновик сохранён');
          } catch {
            if (isCurrent())
              setDraftStatus(
                localSaved
                  ? 'Черновик сохранён на этом устройстве. Нет связи с сервером.'
                  : 'Не удалось сохранить черновик. Проверьте соединение.',
              );
          }
        });
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workspace, ready, userId, storageKey]);

  const hasDraftContent = Boolean(
    workspace.before ||
    workspace.after ||
    workspace.matrices ||
    workspace.photos?.length ||
    workspace.text?.trim() ||
    workspace.description?.trim() ||
    workspace.doctor?.trim() ||
    workspace.services?.length ||
    workspace.name?.trim() ||
    workspace.case_id ||
    workspace.auto_align === false ||
    Object.entries(DEFAULT_EXPORT).some(
      ([key, value]) => (workspace.settings?.[key] ?? value) !== value,
    ) ||
    Object.values(workspace.adjustments || {}).some((photo) =>
      Object.entries(DEFAULT_ADJUSTMENT).some(([key, value]) => (photo[key] ?? value) !== value),
    ),
  );

  return {
    workspace,
    setWorkspace,
    history,
    replaceWorkspace,
    markSaved: async (saved) => {
      // Supersede pending pre-save snapshots before leaving the editor.
      revision.current += 1;
      await Promise.allSettled([saveChain.current, localSaveChain.current]);
      const state = { ...saved.state, name: saved.name, case_id: saved.id };
      await Promise.allSettled([
        saveCollageDraft(state),
        writeLocalDraft(storageKey, { state, updated_at: new Date().toISOString() }),
      ]);
      replaceWorkspace(state);
    },
    ready,
    draftStatus: hasDraftContent ? draftStatus : '',
  };
}

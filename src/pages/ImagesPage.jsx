import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import CaseLibraryPage from './CaseLibraryPage.jsx';
import CaseProjectPage, { NewCaseProjectPage } from './CaseProjectPage.jsx';
import ProdoctorPage from './ProdoctorPage.jsx';
import CollageEditor from '../components/CollageEditor.jsx';
import { CaseButton } from '../components/CaseUI.jsx';
import { getCaseProject, getCollageCase, saveCollageCase } from '../api';
import useCollageWorkspace from '../hooks/useCollageWorkspace';
import { projectSeed } from '../utils/caseWorkflow';
import { loadImage, DEFAULT_ADJUSTMENT } from '../utils/collageCanvas';
import { jpegSource } from '../utils/sourcePhotos';
import '../caseWorkspace.css';

export default function ImagesPage({ currentUser }) {
  const [params, setParams] = useSearchParams();
  const projectId = Number(params.get('project')) || null;
  const mode = params.get('format');
  const variantId = Number(params.get('variant')) || null;
  const oldCaseId = Number(params.get('case')) || null;
  useEffect(() => {
    if (projectId && ['website', 'prodoctor'].includes(mode)) return;
    const frame = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(frame);
  }, [projectId, mode, params]);
  useEffect(() => {
    if (!oldCaseId || projectId) return;
    let cancelled = false;
    getCollageCase(oldCaseId)
      .then((variant) => {
        if (!cancelled && variant.state.project_id)
          setParams({ project: String(variant.state.project_id) }, { replace: true });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [oldCaseId, projectId, setParams]);
  const back = () => {
    setParams({});
    window.scrollTo(0, 0);
  };
  const openProject = (id) => {
    setParams({ project: String(id) });
    window.scrollTo(0, 0);
  };
  const createFormat = (project, format, resume = false) => {
    setParams({ project: String(project.id), format, ...(resume ? { draft: '1' } : { new: '1' }) });
    window.scrollTo(0, 0);
  };
  const openVariant = (project, variant) => {
    setParams({ project: String(project.id), format: variant.mode, variant: String(variant.id) });
    window.scrollTo(0, 0);
  };
  return (
    <div className="case-workspace">
      {params.has('legacy') ? (
        <LegacyDraft currentUser={currentUser} mode={mode} onBack={back} />
      ) : params.has('create') ? (
        <NewCaseProjectPage
          key={mode || 'type'}
          mode={['website', 'prodoctor'].includes(mode) ? mode : null}
          onSelectType={(format) => setParams({ create: '1', format })}
          onBack={back}
          onCreated={createFormat}
        />
      ) : projectId && ['website', 'prodoctor'].includes(mode) ? (
        <FormatWorkspace
          key={params.toString()}
          currentUser={currentUser}
          projectId={projectId}
          mode={mode}
          variantId={variantId}
          fresh={params.has('new')}
          onBack={() => openProject(projectId)}
        />
      ) : projectId ? (
        <CaseProjectPage
          currentUser={currentUser}
          key={projectId}
          id={projectId}
          onBack={back}
          onEdit={openVariant}
          onCreateFormat={createFormat}
        />
      ) : (
        <CaseLibraryPage
          currentUser={currentUser}
          onCreate={() => setParams({ create: '1' })}
          onOpen={openProject}
          onResume={(state) => setParams({ format: state.mode, draft: '1', legacy: '1' })}
        />
      )}
    </div>
  );
}
function LegacyDraft({ currentUser, mode, onBack }) {
  return mode === 'prodoctor' ? (
    <ProdoctorPage currentUser={currentUser} onBack={onBack} onSaved={onBack} />
  ) : (
    <WebsiteWorkspace currentUser={currentUser} onBack={onBack} onSaved={onBack} />
  );
}
function FormatWorkspace({ currentUser, projectId, mode, variantId, fresh, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    Promise.all([getCaseProject(projectId), variantId ? getCollageCase(variantId) : null])
      .then(async ([project, requestedVariant]) => {
        if (project.mode !== mode) throw new Error('Тип редактора не соответствует типу кейса.');
        const variant =
          requestedVariant ||
          (project.variants[0] ? await getCollageCase(project.variants[0].id) : null);
        if (variant && variant.state.project_id !== project.id)
          throw new Error('Оформление относится к другому кейсу.');
        const seed = variant
          ? {
              ...variant.state,
              name: project.name,
              doctor: project.doctor,
              description: project.description,
              case_id: variant.id,
            }
          : projectSeed(project, mode);
        if (mode === 'website' && !variant) {
          // Keep full originals in the case; website's existing limit is 15 MB.
          for (const key of ['before', 'after']) {
            const src = seed[key];
            if (src && ((src.length - src.indexOf(',') - 1) * 3) / 4 > 15 * 1024 * 1024)
              seed[key] = await jpegSource(src, 15 * 1024 * 1024);
          }
        }
        if (mode === 'prodoctor')
          seed.photos = await Promise.all(
            seed.photos.map(async (photo) => {
              if (/^data:image\/(jpeg|png);base64,/.test(photo.src)) return photo;
              return { ...photo, src: await jpegSource(photo.src) };
            }),
          );
        if (!cancelled) setData({ project, seed, savedAt: variant?.updated_at });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Не удалось открыть оформление.');
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, mode, variantId]);
  if (!data)
    return (
      <main className="case-main case-project-page">
        <CaseButton onClick={onBack}>← К кейсу</CaseButton>
        <p role={error ? 'alert' : 'status'} className="case-status">
          {error || 'Открываем фотографии…'}
        </p>
      </main>
    );
  const props = {
    currentUser,
    seed: data.seed,
    fresh: fresh && !data.savedAt,
    savedAt: data.savedAt,
    project: data.project,
    onBack,
    onSaved: onBack,
  };
  return mode === 'website' ? <WebsiteWorkspace {...props} /> : <ProdoctorPage {...props} />;
}
function centeredMatrix(image) {
  const scale = Math.max(1300 / image.naturalWidth, 956 / image.naturalHeight);
  return [
    [scale, 0, (1300 - image.naturalWidth * scale) / 2],
    [0, scale, (956 - image.naturalHeight * scale) / 2],
  ];
}
function WebsiteWorkspace({ currentUser, seed, fresh = false, savedAt, onBack, onSaved }) {
  const { workspace, setWorkspace, ready, markSaved } = useCollageWorkspace(
    currentUser?.id,
    'website',
    { seed, fresh, savedAt },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const attempted = useRef(null);
  const photos = useMemo(
    () => ({
      before: workspace.before ? { src: workspace.before } : null,
      after: workspace.after ? { src: workspace.after } : null,
    }),
    [workspace.before, workspace.after],
  );
  const build = useCallback(async () => {
    if (!workspace.before || !workspace.after) return;
    setPreparing(true);
    setError('');
    try {
      const [beforeSrc, afterSrc] = await Promise.all(
        [workspace.before, workspace.after].map((src) =>
          ((src.length - src.indexOf(',') - 1) * 3) / 4 > 15 * 1024 * 1024
            ? jpegSource(src, 15 * 1024 * 1024)
            : src,
        ),
      );
      const [before, after] = await Promise.all([loadImage(beforeSrc), loadImage(afterSrc)]);
      setWorkspace((value) => ({
        ...value,
        before: beforeSrc,
        after: afterSrc,
        matrices: { before: centeredMatrix(before), after: centeredMatrix(after) },
        adjustments: { before: { ...DEFAULT_ADJUSTMENT }, after: { ...DEFAULT_ADJUSTMENT } },
      }));
    } catch {
      setError('Не удалось открыть фотографии.');
    } finally {
      setPreparing(false);
    }
  }, [workspace.before, workspace.after, setWorkspace]);
  useEffect(() => {
    if (
      ready &&
      !workspace.matrices &&
      workspace.before &&
      workspace.after &&
      !preparing &&
      (attempted.current?.[0] !== workspace.before || attempted.current?.[1] !== workspace.after)
    ) {
      attempted.current = [workspace.before, workspace.after];
      build();
    }
  }, [ready, workspace.matrices, workspace.before, workspace.after, preparing, build]);
  const changed = useCallback(
    ({ adjustments, settings }) => {
      setWorkspace(
        (value) =>
          JSON.stringify(value.adjustments) === JSON.stringify(adjustments) &&
          JSON.stringify(value.settings) === JSON.stringify(settings)
            ? value
            : { ...value, adjustments, settings },
        'editor',
      );
    },
    [setWorkspace],
  );
  const save = async (preview) => {
    setBusy(true);
    setError('');
    try {
      const saved = await saveCollageCase(workspace.case_id, {
        name: workspace.name.trim() || 'Коллаж До/После',
        state: workspace,
        preview,
      });
      await markSaved(saved);
      onSaved?.(saved);
    } catch (err) {
      setError(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Не удалось сохранить оформление. Черновик остаётся доступен.',
      );
    } finally {
      setBusy(false);
    }
  };
  if (!ready || !workspace.matrices)
    return (
      <main className="case-main case-project-page">
        <CaseButton variant="ghost" compact onClick={onBack}>
          ← К кейсу
        </CaseButton>
        <p className={error ? 'case-field-error' : 'case-status'} role={error ? 'alert' : 'status'}>
          {error ||
            (!ready || preparing || (workspace.before && workspace.after)
              ? 'Открываем редактор…'
              : 'Для коллажа нужны две фотографии. Добавьте их в сведениях кейса.')}
        </p>
        {error && workspace.before && workspace.after && (
          <CaseButton disabled={preparing} onClick={build}>
            Повторить
          </CaseButton>
        )}
      </main>
    );
  return (
    <main className="case-main case-format-workspace">
      <CollageEditor
        photos={photos}
        matrices={workspace.matrices}
        initialState={workspace}
        onChange={changed}
        caseName={workspace.name}
        onSave={save}
        saving={busy}
        saveMessage={error}
        doctor={workspace.doctor}
        description={workspace.description}
        onBack={onBack}
      />
    </main>
  );
}

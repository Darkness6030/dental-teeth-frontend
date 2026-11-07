import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import CaseLibraryPage from './CaseLibraryPage.jsx';
import CaseProjectPage, { NewCaseProjectPage } from './CaseProjectPage.jsx';
import ProdoctorPage from './ProdoctorPage.jsx';
import CollageEditor from '../components/CollageEditor.jsx';
import { CaseButton, CaseField, CasePanel } from '../components/CaseUI.jsx';
import { getCaseProject, getCollageCase, saveCollageCase } from '../api';
import useCollageWorkspace from '../hooks/useCollageWorkspace';
import { projectSeed, FORMAT_NAMES } from '../utils/caseWorkflow';
import { loadImage, DEFAULT_ADJUSTMENT } from '../utils/collageCanvas';
import { readSourcePhoto, jpegSource } from '../utils/sourcePhotos';
import '../caseWorkspace.css';

export default function ImagesPage({ currentUser }) {
  const [params, setParams] = useSearchParams();
  const projectId = Number(params.get('project')) || null;
  const mode = params.get('format');
  const variantId = Number(params.get('variant')) || null;
  const oldCaseId = Number(params.get('case')) || null;
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
        <NewCaseProjectPage onBack={back} onCreated={createFormat} />
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
      .then(async ([project, variant]) => {
        if (variant && variant.state.project_id !== project.id)
          throw new Error('Оформление относится к другому кейсу.');
        const seed = variant
          ? { ...variant.state, name: variant.name, case_id: variant.id }
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
    fresh,
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
function WebsiteWorkspace({ currentUser, seed, fresh = false, savedAt, project, onBack, onSaved }) {
  const { workspace, setWorkspace, ready, draftStatus, markSaved } = useCollageWorkspace(
    currentUser?.id,
    'website',
    { seed, fresh, savedAt },
  );
  const [sources, setSources] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photoErrors, setPhotoErrors] = useState({});
  const [session, setSession] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const first = useRef(null);
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
      setSources(false);
      setSession((value) => value + 1);
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
      !sources &&
      !preparing &&
      (attempted.current?.[0] !== workspace.before || attempted.current?.[1] !== workspace.after)
    ) {
      attempted.current = [workspace.before, workspace.after];
      build();
    }
  }, [ready, workspace.matrices, workspace.before, workspace.after, sources, preparing, build]);
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
  const choose = (key, src) => {
    setWorkspace((value) => ({ ...value, [key]: src, matrices: null, adjustments: null }));
    setPhotoErrors((value) => ({ ...value, [key]: '' }));
  };
  const upload = async (key, files) => {
    if (files.length !== 1) {
      setPhotoErrors((value) => ({ ...value, [key]: 'Выберите одно фото.' }));
      return;
    }
    setBusy(true);
    try {
      const photo = await readSourcePhoto(files[0]);
      choose(key, photo.src);
    } catch (err) {
      setPhotoErrors((value) => ({ ...value, [key]: err.message }));
    } finally {
      setBusy(false);
    }
  };
  const save = async (preview) => {
    setBusy(true);
    setError('');
    try {
      const saved = await saveCollageCase(workspace.case_id, {
        name: workspace.name,
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
  if (!ready)
    return (
      <main className="case-main case-project-page">
        <p className="case-status">Открываем оформление…</p>
      </main>
    );
  return (
    <main className="case-main case-format-workspace">
      {sources || !workspace.matrices ? (
        <section ref={first} className="case-project-page">
          <header className="case-page-heading">
            <div>
              <CaseButton compact variant="ghost" onClick={onBack}>
                ← К кейсу
              </CaseButton>
              <h1>{FORMAT_NAMES.website}</h1>
            </div>
            <CaseButton
              disabled={!workspace.before || !workspace.after || busy || preparing}
              variant="primary"
              onClick={build}
            >
              {preparing ? 'Открываем…' : 'Продолжить'}
            </CaseButton>
          </header>
          <div className="case-upload-pair source-selection">
            {[
              ['before', 'До'],
              ['after', 'После'],
            ].map(([key, title]) => (
              <section
                className="case-panel"
                key={key}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes('Files')) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy) upload(key, [...e.dataTransfer.files]);
                }}
              >
                <h2>{title}</h2>
                {photos[key] && (
                  <img
                    className="source-selection-preview"
                    src={photos[key].src}
                    alt={`Фото ${title.toLowerCase()}`}
                  />
                )}
                <label className={`case-btn case-btn--secondary ${busy ? 'is-disabled' : ''}`}>
                  Заменить фото (JPG, PNG, WebP)
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => {
                      upload(key, [...e.target.files]);
                      e.target.value = '';
                    }}
                  />
                </label>
                {photoErrors[key] && (
                  <p role="alert" className="case-field-error">
                    {photoErrors[key]}
                  </p>
                )}
                <div className="source-picker">
                  {project?.photos.map((photo, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={busy}
                      aria-pressed={workspace[key] === photo.src}
                      onClick={() => choose(key, photo.src)}
                    >
                      <img
                        src={photo.src}
                        alt={`Использовать фото ${i + 1} как ${title.toLowerCase()}`}
                      />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <CasePanel>
            <CaseField label="Описание для сайта">
              <textarea
                rows={3}
                value={workspace.description || ''}
                maxLength={10000}
                onChange={(e) =>
                  setWorkspace((value) => ({ ...value, description: e.target.value }))
                }
              />
            </CaseField>
          </CasePanel>
          {error && (
            <p className="case-field-error" role="alert">
              {error}
            </p>
          )}
        </section>
      ) : (
        <CollageEditor
          key={session}
          photos={photos}
          matrices={workspace.matrices}
          initialState={workspace}
          onChange={changed}
          caseName={workspace.name}
          onNameChange={(name) => setWorkspace((value) => ({ ...value, name }))}
          onSave={save}
          saving={busy}
          saveMessage={error}
          caseId={workspace.case_id}
          draftStatus={draftStatus}
          doctor={workspace.doctor}
          description={workspace.description}
          onSources={() => setSources(true)}
          onBack={onBack}
          simplified
        />
      )}
    </main>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProdoctorPage from "./ProdoctorPage.jsx";
import { caseDate } from "../utils/caseDates";
import { prepareCollage, listCollageCases, getCollageCase, saveCollageCase } from "../api";
import useCollageWorkspace, { emptyWorkspace } from "../hooks/useCollageWorkspace";
import { DEFAULT_ADJUSTMENT, loadImage, loadCollageFont, exportCollage, downloadBlob } from "../utils/collageCanvas";
import { CaseButton, CaseField, CasePanel, CasePageHeading } from "../components/CaseUI.jsx";
import "../caseWorkspace.css";
import Switch from "../components/Switch.jsx";
import CollageEditor from "../components/CollageEditor.jsx";

const MAX_SIZE = 15 * 1024 * 1024;

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Не удалось открыть фото. Используйте JPG, PNG или WebP."));
      image.onload = () => {
        if (image.naturalWidth * image.naturalHeight > 24000000) {
          reject(new Error("Разрешение фото не должно превышать 24 мегапикселя."));
        } else {
          resolve({ src: reader.result });
        }
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImagesPage({ currentUser }) {
  const [params, setParams] = useSearchParams();
  const [activeCaseId, setActiveCaseId] = useState(null);
  const mode = params.get('format') === 'prodoctor' ? 'prodoctor' : 'website';
  const openProdoctor = (id) => setParams({ format: 'prodoctor', case: String(id) });
  return <div className="case-workspace">
    <div className="case-format-bar"><div className="case-segmented" role="group" aria-label="Формат кейса">
      {[['website', 'Для сайта'], ['prodoctor', 'Для ПроДокторов']].map(([value, title]) =>
        <button key={value} aria-pressed={mode === value} onClick={() => setParams(value === 'website' ? {} : { format: value, ...(activeCaseId ? { case: String(activeCaseId) } : {}) })}
>{title}</button>)}
    </div></div>
    {mode === 'website' ? <WebsiteImagesPage currentUser={currentUser} onProdoctor={openProdoctor} onActiveCase={setActiveCaseId} />
      : <ProdoctorPage key={params.get('case') || 'new'} currentUser={currentUser} sourceId={Number(params.get('case')) || null} />}
  </div>;
}

function WebsiteImagesPage({ currentUser, onProdoctor, onActiveCase }) {
  const { workspace, setWorkspace, ready, draftStatus } = useCollageWorkspace(currentUser?.id);
  const firstScreenRef = useRef(null);
  const [navigationHeight, setNavigationHeight] = useState(64);
  useLayoutEffect(() => {
    const screen = firstScreenRef.current;
    const navigation = screen.closest('.case-workspace').parentElement.previousElementSibling;
    const measure = () => setNavigationHeight(screen.getBoundingClientRect().top + window.scrollY);
    measure();
    const observer = new ResizeObserver(measure);
    if (navigation) observer.observe(navigation);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  useEffect(() => { onActiveCase(workspace.case_id || null); }, [workspace.case_id, onActiveCase]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const [cases, setCases] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [caseBusy, setCaseBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [editorSession, setEditorSession] = useState(0);
  const [freshEditor, setFreshEditor] = useState(false);
  const photos = useMemo(() => ({ before: workspace.before ? { src: workspace.before } : null,
    after: workspace.after ? { src: workspace.after } : null }), [workspace.before, workspace.after]);
  const result = workspace.matrices;
  const autoAlign = workspace.auto_align;
  const locked = busy || reading || saving || caseBusy || !ready;

  useEffect(() => {
    let cancelled = false;
    listCollageCases().then((rows) => {
      if (!cancelled) { setCases(rows); setHasMore(rows.length === 24); }
    }).catch(() => { if (!cancelled) setHistoryError('Не удалось загрузить историю кейсов.'); })
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
  }, []);

  const editorChanged = useCallback(({ adjustments, settings }) => {
    setWorkspace((value) => value.adjustments === adjustments && value.settings === settings ? value
      : { ...value, adjustments, settings });
    setSaveMessage('');
  }, [setWorkspace]);

  const loadPhoto = async (key, file) => {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Загрузите фото в формате JPG, PNG или WebP.'); return;
    }
    if (file.size > MAX_SIZE) { setError('Размер каждого фото не должен превышать 15 МБ.'); return; }
    setReading(true);
    try {
      const photo = await readPhoto(file);
      setWorkspace((value) => ({ ...value, [key]: photo.src, matrices: null, adjustments: null }));
      setSaveMessage('');
    } catch (err) { setError(err.message); } finally { setReading(false); }
  };

  const dragPhoto = (event, key) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = locked ? 'none' : 'copy';
    if (!locked) setDragTarget(key);
  };

  const dropPhoto = (event, key) => {
    event.preventDefault(); setDragTarget(null);
    if (locked) return;
    const files = [...event.dataTransfer.files];
    if (files.length !== 1) { setError('Перетащите одно фото в поле «До» или «После».'); return; }
    loadPhoto(key, files[0]);
  };

  const generate = async () => {
    setBusy(true); setError('');
    try {
      const matrices = await prepareCollage(workspace.before, workspace.after, autoAlign);
      setWorkspace((value) => ({ ...value, matrices, adjustments: {
        before: { ...DEFAULT_ADJUSTMENT }, after: { ...DEFAULT_ADJUSTMENT } } }));
      setFreshEditor(true); setEditorSession((value) => value + 1); setSaveMessage('');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Не удалось создать коллаж. Попробуйте ещё раз.');
    } finally { setBusy(false); }
  };

  const saveCase = async (preview) => {
    if (!workspace.name.trim()) { setSaveMessage('Введите название кейса.'); return; }
    setSaving(true); setSaveMessage('');
    try {
      const saved = await saveCollageCase(workspace.case_id,
        { name: workspace.name, state: workspace, preview });
      setWorkspace((value) => ({ ...value, case_id: saved.id, name: saved.name }));
      setCases((rows) => [{ id: saved.id, name: saved.name, preview: saved.preview, updated_at: saved.updated_at },
        ...rows.filter((row) => row.id !== saved.id)]);
      setSaveMessage('Кейс сохранён в истории.');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = err.response?.status === 413 ? 'Фото слишком большие для сохранения.'
        : [401, 403].includes(err.response?.status) ? 'Сессия истекла. Войдите в аккаунт снова.'
        : typeof detail === 'string' ? detail : 'Не удалось сохранить кейс. Попробуйте ещё раз.';
      setSaveMessage(`${message} Черновик остаётся в редакторе.`);
    }
    finally { setSaving(false); }
  };

  const openCase = async (id, downloadOnly = false) => {
    setCaseBusy(true); setHistoryError('');
    try {
      const saved = await getCollageCase(id);
      if (downloadOnly) {
        const [before, after] = await Promise.all([loadImage(saved.state.before), loadImage(saved.state.after), loadCollageFont()]);
        const blob = await exportCollage({ before, after }, saved.state.matrices, saved.state.adjustments, saved.state.settings);
        downloadBlob(blob, `${saved.name.replace(/[/\\:*?"<>|]/g, '-')}.${saved.state.settings.format}`);
      } else {
        setWorkspace({ ...saved.state, name: saved.name, case_id: saved.id });
        setFreshEditor(false); setEditorSession((value) => value + 1); setSaveMessage(''); setError('');
      }
    } catch { setHistoryError('Не удалось открыть кейс. Попробуйте ещё раз.'); }
    finally { setCaseBusy(false); }
  };

  const loadHistory = async () => {
    setLoadingHistory(true); setHistoryError('');
    try {
      const rows = await listCollageCases(historyError ? 0 : cases.length);
      setCases((current) => historyError ? rows : [...current, ...rows]);
      setHasMore(rows.length === 24);
    } catch { setHistoryError('Не удалось загрузить историю кейсов.'); }
    finally { setLoadingHistory(false); }
  };
  return <main className="case-main">
    <section ref={firstScreenRef} aria-label="Подготовка коллажа" className="case-upload-screen"
      style={{ height: `calc(100dvh - ${navigationHeight}px)` }}>
      <CasePageHeading title="Коллаж До/После" disabled={locked} onNew={() => { setWorkspace(emptyWorkspace()); setFreshEditor(true); setSaveMessage(''); setError(''); }} />
      <div id="collage-photos" className="case-upload-pair">
        {[["before", "До"], ["after", "После"]].map(([key, title]) => <section key={key}
          onDragEnter={(e) => dragPhoto(e, key)} onDragOver={(e) => dragPhoto(e, key)}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragTarget(null); }} onDrop={(e) => dropPhoto(e, key)}
          className={`case-upload-slot ${dragTarget === key ? 'is-dragging' : ''}`}>
          <div className="case-section-heading"><h2>{title}</h2></div>
          <div className="case-upload-image">{photos[key] ? <img src={photos[key].src} draggable={false} alt={`Фото ${title.toLowerCase()}`} />
            : <div className="case-empty-upload"><span className="case-upload-plus" aria-hidden="true">+</span><span>Перетащите фото сюда</span></div>}</div>
          <label className={`case-btn case-btn--secondary ${locked ? 'is-disabled' : ''}`}>
            {photos[key] ? 'Заменить фото (JPG, PNG, WebP)' : 'Выбрать фото (JPG, PNG, WebP)'}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={locked} className="sr-only"
              onChange={(e) => { loadPhoto(key, e.target.files?.[0]); e.target.value = ''; }} /></label>
        </section>)}
      </div>
      <details className="case-details"><summary>Описание кейса и врач</summary><div className="case-metadata-grid">
        <CaseField label="Врач"><input placeholder="Имя врача" value={workspace.doctor || ''} maxLength={200} onChange={(e) => { setWorkspace((s) => ({ ...s, doctor: e.target.value })); setSaveMessage(''); }} /></CaseField>
        <CaseField label="Описание кейса"><textarea placeholder="Что было сделано" rows={2} maxLength={10000} value={workspace.description || ''}
          onChange={(e) => { setWorkspace((s) => ({ ...s, description: e.target.value })); setSaveMessage(''); }} /></CaseField>
      </div></details>
      <div className="case-step-footer">
        <div className="case-switch-label"><Switch checked={autoAlign} disabled={locked} label="Автоматически выровнять по зубам"
          handleChange={() => setWorkspace((v) => ({ ...v, auto_align: !v.auto_align }))} /><span>Выровнять по зубам</span></div>
        <div className="case-actions"><CaseButton disabled={locked || (!photos.before && !photos.after)} onClick={() => {
          setWorkspace((v) => ({ ...v, before: v.after, after: v.before, matrices: null, adjustments: null })); setError(''); }}>Поменять местами</CaseButton>
          <CaseButton variant="primary" onClick={generate} disabled={!photos.before || !photos.after || locked}>{busy ? (autoAlign ? 'Выравниваем фото…' : 'Открываем редактор…') : 'Открыть редактор'}</CaseButton></div>
      </div>
      {(error || draftStatus) && <p role={error ? 'alert' : 'status'} className={`case-status ${error ? 'is-error' : ''}`}>{error || draftStatus}</p>}
    </section>
    {result && <CollageEditor key={editorSession} photos={photos} matrices={result} initialState={freshEditor ? null : workspace} onChange={editorChanged}
      caseName={workspace.name} onNameChange={(name) => { setWorkspace((v) => ({ ...v, name })); setSaveMessage(''); }} onSave={saveCase}
      saving={saving} saveMessage={saveMessage} caseId={workspace.case_id} draftStatus={draftStatus} doctor={workspace.doctor} description={workspace.description} onProdoctor={onProdoctor} />}
    <CasePanel title="Сохранённые кейсы" className="case-history">
      {!cases.length && <p className="case-empty">{loadingHistory ? 'Загружаем кейсы…' : 'Здесь появятся ваши сохранённые кейсы.'}</p>}
      <div className="case-history-grid">{cases.map((item) => <article key={item.id} className="case-history-card"><img src={item.preview} alt={`Коллаж: ${item.name}`} />
        <div className="case-card-body"><h3>{item.name}</h3><p className="case-hint">{caseDate(item.updated_at).toLocaleString('ru-RU')}</p>
          <div className="case-actions"><CaseButton disabled={locked} onClick={() => openCase(item.id)}>Открыть</CaseButton><CaseButton variant="ghost" disabled={locked} onClick={() => openCase(item.id, true)}>Скачать</CaseButton></div>
          <CaseButton variant="ghost" disabled={locked} onClick={() => onProdoctor(item.id)}>Для ПроДокторов →</CaseButton></div></article>)}</div>
      {historyError && <p role="alert" className="case-status is-error">{historyError}</p>}
      {(hasMore || historyError) && <CaseButton disabled={loadingHistory || locked} onClick={loadHistory}>{loadingHistory ? 'Загружаем…' : historyError ? 'Повторить' : 'Показать ещё'}</CaseButton>}
    </CasePanel>
  </main>;
}

import { useEffect, useState } from 'react';
import { listCaseProjects } from '../api';
import { CaseButton, CaseField } from '../components/CaseUI.jsx';
import { workspaceDraft } from '../utils/workspaceDraft';
import { caseDate } from '../utils/caseDates';
import { FORMAT_NAMES, hasDraftContent } from '../utils/caseWorkflow';

export default function CaseLibraryPage({ currentUser, onCreate, onOpen, onResume }) {
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const [drafts, setDrafts] = useState([]);
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    const timer = setTimeout(() => {
      listCaseProjects(0, query)
        .then((rows) => {
          if (!cancelled) {
            setProjects(rows);
            setMore(rows.length === 24);
            setError('');
          }
        })
        .catch(() => {
          if (!cancelled) setError('Не удалось загрузить кейсы.');
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, retry]);
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(
      ['website', 'prodoctor'].map((mode) => workspaceDraft(currentUser?.id, mode)),
    ).then((results) => {
      if (!cancelled)
        setDrafts(
          results
            .filter(
              (r) =>
                r.status === 'fulfilled' &&
                hasDraftContent(r.value?.state) &&
                !r.value?.state.project_id,
            )
            .map((r) => r.value),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);
  const loadMore = async () => {
    setBusy(true);
    try {
      const rows = await listCaseProjects(projects.length, query);
      setProjects((old) => [...old, ...rows]);
      setError('');
      setMore(rows.length === 24);
    } catch {
      setError('Не удалось загрузить кейсы.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="case-main case-library">
      <header className="case-page-heading">
        <div>
          <h1>Кейсы До/После</h1>
          <p>Пациенты, исходные фотографии и готовые коллажи</p>
        </div>
        <CaseButton variant="primary" onClick={onCreate}>
          Создать кейс
        </CaseButton>
      </header>
      <div className="library-search">
        <CaseField label="Найти кейс">
          <input
            type="search"
            placeholder="ФИО пациента, врач или направление"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </CaseField>
      </div>
      {drafts.map((draft) => (
        <div className="case-panel draft-resume" key={draft.state.mode}>
          <span>Незавершённый кейс · {FORMAT_NAMES[draft.state.mode]}</span>
          <CaseButton onClick={() => onResume(draft.state)}>Продолжить</CaseButton>
        </div>
      ))}
      {error && (
        <p className="case-field-error" role="alert">
          {error}{' '}
          <CaseButton compact disabled={busy} onClick={() => setRetry((value) => value + 1)}>
            Повторить
          </CaseButton>
        </p>
      )}
      {!busy && !projects.length && !error && (
        <div className="library-empty">
          <h2>{query ? 'Ничего не найдено' : 'Здесь будут ваши кейсы'}</h2>
          <p className="case-hint">
            {query
              ? 'Попробуйте другое имя или направление.'
              : 'Создайте кейс пациента и загрузите фотографии.'}
          </p>
          {!query && <CaseButton onClick={onCreate}>Создать первый кейс</CaseButton>}
        </div>
      )}
      <div className="project-grid">
        {projects.map((project) => (
          <button key={project.id} className="project-card" onClick={() => onOpen(project.id)}>
            <div className="project-cover">
              {project.preview ? (
                <img src={project.preview} alt="Превью кейса" />
              ) : (
                <span>До / После</span>
              )}
            </div>
            <div className="project-card-body">
              <h2>{project.patient || project.name}</h2>
              {project.patient && <p>{project.name}</p>}
              {project.doctor && <p className="case-hint">{project.doctor}</p>}
              <div className="case-tags">
                {project.tags.map((tag) => (
                  <span className="case-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="project-card-meta">
                <span>
                  {project.photo_count} фото · {project.variants.length} оформлений
                </span>
                <time>{caseDate(project.updated_at).toLocaleDateString('ru-RU')}</time>
              </div>
            </div>
          </button>
        ))}
      </div>
      {busy && <p className="case-status">Загружаем кейсы…</p>}
      {more && (
        <CaseButton disabled={busy} onClick={loadMore}>
          Показать ещё
        </CaseButton>
      )}
    </main>
  );
}

import { useEffect, useRef, useState } from 'react';
import { getCaseProject, saveCaseProject } from '../api';
import { CaseButton, CaseField, CasePanel } from '../components/CaseUI.jsx';
import SourcePhotos from '../components/SourcePhotos.jsx';
import { sourceThumbnail } from '../utils/sourcePhotos';
import { DIRECTIONS, FORMAT_NAMES } from '../utils/caseWorkflow';
import { workspaceDraft } from '../utils/workspaceDraft';
import { caseDate } from '../utils/caseDates';

const emptyProject = () => ({
  patient: '',
  name: '',
  doctor: '',
  description: '',
  tags: [],
  photos: [],
  preview: '',
});
function ProjectFields({ value, onChange, errors = {} }) {
  const [custom, setCustom] = useState('');
  const tagOptions = [...new Set([...DIRECTIONS, ...value.tags])];
  const toggle = (tag) =>
    onChange({
      ...value,
      tags: value.tags.includes(tag) ? value.tags.filter((t) => t !== tag) : [...value.tags, tag],
    });
  return (
    <>
      <div className="project-fields">
        <CaseField label="ФИО пациента" error={errors.patient}>
          <input
            value={value.patient}
            maxLength={200}
            placeholder="Иванов Иван Иванович"
            onChange={(e) => onChange({ ...value, patient: e.target.value })}
          />
        </CaseField>
        <CaseField label="Название кейса" error={errors.name}>
          <input
            value={value.name}
            maxLength={160}
            placeholder="Например, восстановление 16 зуба"
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </CaseField>
        <CaseField label="Врач">
          <input
            value={value.doctor}
            maxLength={200}
            placeholder="ФИО врача"
            onChange={(e) => onChange({ ...value, doctor: e.target.value })}
          />
        </CaseField>
      </div>
      <div className="case-field">
        <span className="case-label">Направления</span>
        <div className="case-tags">
          {tagOptions.map((tag) => (
            <button
              type="button"
              className={`case-tag tag-choice ${value.tags.includes(tag) ? 'is-selected' : ''}`}
              aria-pressed={value.tags.includes(tag)}
              key={tag}
              disabled={!value.tags.includes(tag) && value.tags.length >= 20}
              onClick={() => toggle(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="tag-custom">
          <input
            aria-label="Другое направление"
            placeholder="Другое направление"
            maxLength={80}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (
                  custom.trim() &&
                  !value.tags.includes(custom.trim()) &&
                  value.tags.length < 20
                ) {
                  toggle(custom.trim());
                  setCustom('');
                }
              }
            }}
          />
          <CaseButton
            compact
            disabled={
              !custom.trim() || value.tags.includes(custom.trim()) || value.tags.length >= 20
            }
            onClick={() => {
              toggle(custom.trim());
              setCustom('');
            }}
          >
            Добавить
          </CaseButton>
        </div>
      </div>
      <CaseField label="Описание лечения">
        <textarea
          rows={3}
          value={value.description || ''}
          maxLength={10000}
          placeholder="Что было сделано и какой результат получили"
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </CaseField>
    </>
  );
}
function FormatChoices({ onChoose, disabled = false }) {
  return (
    <div className="format-choices">
      {[
        ['website', 'Коллаж для сайта', 'Две фотографии До/После'],
        ['prodoctor', 'Для ПроДокторов', 'От 2 до 6 фото, описание и услуги'],
      ].map(([mode, title, hint]) => (
        <button
          type="button"
          disabled={disabled}
          className="format-choice"
          key={mode}
          onClick={() => onChoose(mode)}
        >
          <strong>{title}</strong>
          <span>{hint}</span>
          <span aria-hidden="true">→</span>
        </button>
      ))}
    </div>
  );
}
export function NewCaseProjectPage({ onBack, onCreated }) {
  const [value, setValue] = useState(emptyProject);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const create = async (mode) => {
    const invalid = {
      ...(!value.patient.trim() ? { patient: 'Введите ФИО пациента.' } : {}),
      ...(!value.name.trim() ? { name: 'Введите название кейса.' } : {}),
    };
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    if (value.photos.length < 2) {
      setError('Добавьте минимум две фотографии.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const project = await saveCaseProject(null, {
        ...value,
        preview: await sourceThumbnail(value.photos[0]),
      });
      onCreated(project, mode);
    } catch (err) {
      setError(
        typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Не удалось создать кейс. Фотографии остаются на странице.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="case-main case-project-page">
      <div className="case-page-heading">
        <div>
          <CaseButton variant="ghost" compact onClick={onBack}>
            ← Все кейсы
          </CaseButton>
          <h1>Новый кейс</h1>
        </div>
      </div>
      <fieldset disabled={busy} className="case-project-form">
        <CasePanel>
          <ProjectFields value={value} onChange={setValue} errors={errors} />
        </CasePanel>
        <SourcePhotos
          photos={value.photos}
          onChange={(photos) => setValue((old) => ({ ...old, photos }))}
          disabled={busy}
          onReadingChange={setReading}
        />
        <CasePanel title="Как оформить кейс">
          <FormatChoices disabled={busy || reading} onChoose={create} />
          {error && (
            <p role="alert" className="case-field-error">
              {error}
            </p>
          )}
          {busy && <p className="case-status">Создаём кейс…</p>}
        </CasePanel>
      </fieldset>
    </main>
  );
}
export default function CaseProjectPage({ currentUser, id, onBack, onEdit, onCreateFormat }) {
  const [project, setProject] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState([]);
  const dialog = useRef(null);
  useEffect(() => {
    let cancelled = false;
    getCaseProject(id)
      .then((data) => {
        if (!cancelled) setProject(data);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось открыть кейс.');
      });
    Promise.allSettled(
      ['website', 'prodoctor'].map((mode) => workspaceDraft(currentUser?.id, mode)),
    ).then((results) => {
      if (!cancelled)
        setDrafts(
          results
            .filter(
              (r) =>
                r.status === 'fulfilled' &&
                r.value?.state.project_id === id &&
                !r.value.state.case_id,
            )
            .map((r) => r.value.state),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [id, currentUser?.id]);
  const openFormat = async (mode) => {
    if (busy || reading) return;
    setBusy(true);
    try {
      const saved = await saveCaseProject(id, {
        ...project,
        preview: await sourceThumbnail(project.photos[0]),
      });
      setProject(saved);
      onCreateFormat(saved, mode);
    } catch {
      setError('Не удалось сохранить исходники. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!project.name.trim()) {
      setError('Введите название кейса.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await saveCaseProject(id, {
        ...project,
        preview: await sourceThumbnail(project.photos[0]),
      });
      setProject(saved);
      setEditing(false);
    } catch {
      setError('Не удалось сохранить изменения.');
    } finally {
      setBusy(false);
    }
  };
  if (!project)
    return (
      <main className="case-main case-project-page">
        <CaseButton onClick={onBack}>← Все кейсы</CaseButton>
        <p className="case-status">{error || 'Открываем кейс…'}</p>
      </main>
    );
  return (
    <main className="case-main case-project-page">
      <div className="case-page-heading">
        <div>
          <CaseButton variant="ghost" compact onClick={onBack}>
            ← Все кейсы
          </CaseButton>
          <h1>{project.patient || project.name}</h1>
          {project.patient && <p>{project.name}</p>}
        </div>
        <div className="case-actions">
          <CaseButton disabled={busy} onClick={() => setEditing(!editing)}>
            {editing ? 'Закрыть сведения' : 'Сведения и исходники'}
          </CaseButton>
          <CaseButton
            variant="primary"
            disabled={busy || reading || project.photos.length < 2}
            onClick={() => dialog.current.showModal()}
          >
            Оформить кейс
          </CaseButton>
        </div>
      </div>
      {!editing && (
        <div className="project-metadata">
          {project.doctor && <span>{project.doctor}</span>}
          <div className="case-tags">
            {project.tags.map((tag) => (
              <span key={tag} className="case-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      {editing && (
        <>
          <CasePanel>
            <ProjectFields value={project} onChange={setProject} />
          </CasePanel>
          <SourcePhotos
            photos={project.photos}
            onChange={(photos) => setProject((old) => ({ ...old, photos }))}
            disabled={busy}
            onReadingChange={setReading}
          />
          <div className="case-actions">
            <CaseButton disabled={busy || reading} onClick={save}>
              {busy ? 'Сохраняем…' : 'Сохранить сведения и фото'}
            </CaseButton>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="case-field-error">
          {error}
        </p>
      )}
      {drafts.map((draft) => (
        <div className="case-panel draft-resume" key={draft.mode}>
          <span>Незавершённое оформление · {FORMAT_NAMES[draft.mode]}</span>
          <CaseButton onClick={() => onCreateFormat(project, draft.mode, true)}>
            Продолжить
          </CaseButton>
        </div>
      ))}
      <CasePanel title="Готовые оформления">
        {!project.variants.length && (
          <div className="library-empty">
            <p className="case-hint">Выберите формат, чтобы оформить фотографии.</p>
            <FormatChoices
              disabled={busy || reading || project.photos.length < 2}
              onChoose={openFormat}
            />
          </div>
        )}
        <div className="case-history-grid">
          {project.variants.map((variant) => (
            <article className="case-history-card" key={variant.id}>
              <img src={variant.preview} alt={variant.name} />
              <div className="case-card-body">
                <span className="case-tag">{FORMAT_NAMES[variant.mode]}</span>
                <h3>{variant.name}</h3>
                <span className="case-hint">
                  {caseDate(variant.updated_at).toLocaleString('ru-RU')}
                </span>
                <CaseButton onClick={() => onEdit(project, variant)}>Открыть оформление</CaseButton>
              </div>
            </article>
          ))}
        </div>
      </CasePanel>
      <dialog ref={dialog} className="case-dialog">
        <div className="case-section-heading">
          <h2>Оформить кейс</h2>
          <CaseButton onClick={() => dialog.current.close()}>Закрыть</CaseButton>
        </div>
        <FormatChoices
          onChoose={(mode) => {
            dialog.current.close();
            openFormat(mode);
          }}
        />
      </dialog>
    </main>
  );
}

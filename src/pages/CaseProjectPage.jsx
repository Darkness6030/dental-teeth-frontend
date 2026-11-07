import { useEffect, useState } from 'react';
import { getCaseProject, saveCaseProject, getCollageCase } from '../api';
import { CaseButton, CaseField, CasePanel } from '../components/CaseUI.jsx';
import SourcePhotos from '../components/SourcePhotos.jsx';
import { sourceThumbnail } from '../utils/sourcePhotos';
import { DIRECTIONS, FORMAT_NAMES } from '../utils/caseWorkflow';
import { caseDate } from '../utils/caseDates';
import { renderSavedCasePreview } from '../utils/casePreview';

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
  const [customOpen, setCustomOpen] = useState(false);
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
          {!customOpen && (
            <button
              type="button"
              className="case-tag tag-choice tag-custom-choice"
              onClick={() => setCustomOpen(true)}
            >
              + Другое
            </button>
          )}
        </div>
        {customOpen && (
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
                    setCustomOpen(false);
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
                setCustomOpen(false);
              }}
            >
              Добавить
            </CaseButton>
          </div>
        )}
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
          <div className="format-choice-visual" aria-hidden="true">
            <svg viewBox="0 0 96 64" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mode === 'website' ? (
                <>
                  <rect x="8" y="8" width="80" height="48" rx="8" />
                  <path d="M48 8v48M18 44l14-15 12 13M54 44l12-15 12 13" />
                  <circle cx="69" cy="21" r="3" />
                </>
              ) : (
                <>
                  {[8, 37, 66].map((x) => (
                    <rect key={x} x={x} y="10" width="22" height="30" rx="4" />
                  ))}
                  <path d="M8 49h56M8 55h38" />
                </>
              )}
            </svg>
          </div>
          <strong>{title}</strong>
          <p>{hint}</p>
          <span aria-hidden="true">→</span>
        </button>
      ))}
    </div>
  );
}
export function NewCaseProjectPage({ mode, onSelectType, onBack, onCreated }) {
  const [value, setValue] = useState(emptyProject);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const create = async () => {
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
        mode,
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
  if (!mode)
    return (
      <main className="case-main case-project-page case-type-page">
        <CaseButton variant="ghost" compact onClick={onBack}>
          ← Все кейсы
        </CaseButton>
        <div className="case-type-heading">
          <span className="case-eyebrow">Новый кейс</span>
          <h1>Для чего создаём кейс?</h1>
          <p>Выберите формат. Фотографии и настройки будут подготовлены для него.</p>
        </div>
        <FormatChoices onChoose={onSelectType} />
      </main>
    );
  return (
    <main className="case-main case-project-page">
      <div className="case-page-heading">
        <div>
          <CaseButton variant="ghost" compact onClick={onBack}>
            ← Все кейсы
          </CaseButton>
          <h1>Новый кейс</h1>
          <p>
            {FORMAT_NAMES[mode]} ·{' '}
            {mode === 'website' ? '2 фотографии До/После' : 'От 2 до 6 фотографий'}
          </p>
        </div>
      </div>
      <fieldset disabled={busy} className="case-project-form">
        <CasePanel>
          <ProjectFields value={value} onChange={setValue} errors={errors} />
        </CasePanel>
        <SourcePhotos
          maxPhotos={mode === 'website' ? 2 : 6}
          photos={value.photos}
          onChange={(photos) => setValue((old) => ({ ...old, photos }))}
          disabled={busy}
          onReadingChange={setReading}
        />
        <div className="case-create-footer">
          {error && (
            <p role="alert" className="case-field-error">
              {error}
            </p>
          )}
          <CaseButton variant="primary" disabled={busy || reading} onClick={create}>
            {busy ? 'Создаём кейс…' : 'Открыть редактор →'}
          </CaseButton>
        </div>
      </fieldset>
    </main>
  );
}
export default function CaseProjectPage({ id, onBack, onEdit, onCreateFormat }) {
  const [project, setProject] = useState(null);
  const [savedProject, setSavedProject] = useState(null);
  const [displayPreview, setDisplayPreview] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    getCaseProject(id)
      .then((data) => {
        if (cancelled) return;
        setProject(data);
        setSavedProject(data);
        setDisplayPreview(data.preview);
        if (data.variants[0])
          getCollageCase(data.variants[0].id)
            .then((variant) => renderSavedCasePreview(variant.state))
            .then((preview) => {
              if (!cancelled && preview) setDisplayPreview(preview);
            })
            .catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось открыть кейс.');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const persist = async () => {
    if (!project.name.trim()) throw new Error('Введите название кейса.');
    const saved = await saveCaseProject(id, {
      ...project,
      preview: project.variants.length
        ? displayPreview || project.preview
        : await sourceThumbnail(project.photos[0]),
    });
    setProject(saved);
    setSavedProject(saved);
    setDisplayPreview(saved.preview);
    setEditing(false);
    return saved;
  };
  const cancelEdit = () => {
    setProject(savedProject);
    setEditing(false);
    setError('');
  };
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await persist();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить изменения.');
    } finally {
      setBusy(false);
    }
  };
  const open = async () => {
    setBusy(true);
    setError('');
    try {
      const value = editing ? await persist() : project;
      if (value.variants[0]) onEdit(value, value.variants[0]);
      else onCreateFormat(value, value.mode, true);
    } catch (err) {
      setError(err.message || 'Не удалось открыть редактор.');
    } finally {
      setBusy(false);
    }
  };
  if (!project)
    return (
      <main className={`case-main case-project-page ${editing ? '' : 'case-detail'}`}>
        <CaseButton onClick={onBack}>← Все кейсы</CaseButton>
        <p role="status">{error || 'Открываем кейс…'}</p>
      </main>
    );
  return (
    <main className={`case-main case-project-page ${editing ? '' : 'case-detail'}`}>
      <header className="case-page-heading">
        <div>
          <CaseButton
            variant="ghost"
            compact
            disabled={busy || reading}
            onClick={editing ? cancelEdit : onBack}
          >
            {editing ? '← К кейсу' : '← Все кейсы'}
          </CaseButton>
          <h1>{project.patient || project.name}</h1>
          {project.patient && <p>{project.name}</p>}
        </div>
        <div className="case-actions">
          <span className="case-format-badge">{FORMAT_NAMES[project.mode]}</span>
          <CaseButton
            variant="primary"
            disabled={busy || reading || project.photos.length < 2}
            onClick={editing ? save : open}
          >
            {editing
              ? busy
                ? 'Сохраняем…'
                : 'Сохранить'
              : project.variants.length
                ? 'Редактировать'
                : 'Открыть редактор'}
          </CaseButton>
        </div>
      </header>
      <CasePanel
        title="Сведения о кейсе"
        action={
          <CaseButton
            compact
            disabled={busy || reading}
            onClick={editing ? cancelEdit : () => setEditing(true)}
          >
            {editing ? 'Отмена' : 'Изменить'}
          </CaseButton>
        }
      >
        {editing ? (
          <ProjectFields value={project} onChange={setProject} />
        ) : (
          <>
            <dl className="case-facts">
              <div>
                <dt>Пациент</dt>
                <dd>{project.patient || 'Не указан'}</dd>
              </div>
              <div>
                <dt>Врач</dt>
                <dd>{project.doctor || 'Не указан'}</dd>
              </div>
              <div>
                <dt>Название кейса</dt>
                <dd>{project.name}</dd>
              </div>
            </dl>
            {project.tags.length > 0 && (
              <div className="case-tags">
                {project.tags.map((tag) => (
                  <span key={tag} className="case-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {project.description && <p className="case-description">{project.description}</p>}
          </>
        )}
      </CasePanel>
      {editing && (
        <>
          <SourcePhotos
            maxPhotos={Math.max(project.mode === 'website' ? 2 : 6, project.photos.length)}
            photos={project.photos}
            onChange={(photos) => setProject((old) => ({ ...old, photos }))}
            disabled={busy}
            onReadingChange={setReading}
          />
        </>
      )}
      {error && (
        <p role="alert" className="case-field-error">
          {error}
        </p>
      )}
      {!editing && (
        <section className="case-saved-preview">
          <img
            src={displayPreview || project.preview || project.photos[0]?.src}
            alt={project.name}
          />
          <div>
            <p>{project.photos.length} фото</p>
            <time>{caseDate(project.updated_at).toLocaleDateString('ru-RU')}</time>
          </div>
        </section>
      )}
    </main>
  );
}

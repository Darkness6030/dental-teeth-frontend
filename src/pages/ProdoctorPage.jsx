import {
  CaseButton,
  CaseRange,
  CaseField,
  CasePanel,
  CaseRemoveButton,
  CasePageHeading,
} from '../components/CaseUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { getCollageCase, listCollageCases, saveCollageCase } from '../api';
import useCollageWorkspace, { emptyProdoctorWorkspace } from '../hooks/useCollageWorkspace';
import { caseDate } from '../utils/caseDates';
import {
  adaptDescription,
  downloadCasePhoto,
  readCasePhoto,
  renderCasePhoto,
  textLength,
  downloadAllCasePhotos,
} from '../utils/prodoctor';
import { validateProdoctor } from '../utils/prodoctorValidation';

function PhotoPreview({ photo, className = '' }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false;
    renderCasePhoto(photo, 400)
      .then((canvas) => {
        if (!cancelled) setSrc(canvas.toDataURL('image/jpeg', 0.85));
      })
      .catch(() => {
        if (!cancelled) setSrc('');
      });
    return () => {
      cancelled = true;
    };
  }, [photo]);
  return src ? (
    <img
      src={src}
      alt={photo.stage === 'before' ? 'До процедуры' : 'Сразу после процедуры'}
      className={`aspect-square object-cover rounded-xl ${className}`}
    />
  ) : (
    <div
      className={`aspect-square rounded-xl bg-gray-100 ${className}`}
      aria-label="Загрузка фото"
    />
  );
}

export default function ProdoctorPage({ currentUser, sourceId }) {
  const { workspace, setWorkspace, ready, draftStatus, replaceWorkspace } = useCollageWorkspace(
    currentUser?.id,
    'prodoctor',
  );
  const [history, setHistory] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(Boolean(sourceId));
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const previewRef = useRef(null);
  const formRef = useRef(null);
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState({});
  const [photoError, setPhotoError] = useState('');
  const [textWarning, setTextWarning] = useState('');
  const touch = (key) => setTouched((value) => ({ ...value, [key]: true }));
  const seeded = useRef(false);
  const photos = workspace.photos || [];
  const services = workspace.services || [];
  const locked = !ready || busy || linking;
  const errors = validateProdoctor(workspace);
  const invalid = Object.values(errors)[0];
  const fieldError = (key) => (showErrors || touched[key] ? errors[key] : '');

  useEffect(() => {
    let cancelled = false;
    listCollageCases(0, 'prodoctor')
      .then((rows) => {
        if (!cancelled) {
          setHistory(rows);
          setHasMore(rows.length === 24);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryError('Не удалось загрузить историю.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !sourceId) return;
    // Reopening the linked format must keep its restored, unfinished edits.
    if (workspace.source_case_id === sourceId) {
      seeded.current = true;
      setLinking(false);
      return;
    }
    if (seeded.current) return;
    seeded.current = true;
    let cancelled = false;
    Promise.all([getCollageCase(sourceId), listCollageCases(0, 'prodoctor', sourceId)])
      .then(([source, variants]) =>
        variants.length
          ? getCollageCase(variants[0].id)
          : Promise.resolve({
              state: {
                ...emptyProdoctorWorkspace(),
                source_case_id: source.id,
                name: source.name,
                doctor: source.state.doctor || '',
                description: source.state.description || '',
                text: adaptDescription(source.state.description || ''),
                photos: [source.state.before, source.state.after].filter(Boolean).map((src, i) => ({
                  src,
                  stage: i ? 'after' : 'before',
                  zoom: 100,
                  x: 50,
                  y: 50,
                })),
              },
            }),
      )
      .then(async (saved) => {
        const converted = await Promise.all(
          saved.state.photos.map(async (photo) => {
            if (/^data:image\/(jpeg|png);base64,/.test(photo.src)) return photo;
            const canvas = await renderCasePhoto(photo);
            return { ...photo, src: canvas.toDataURL('image/jpeg', 0.94), zoom: 100, x: 50, y: 50 };
          }),
        );
        saved = { ...saved, state: { ...saved.state, photos: converted } };
        if (!cancelled)
          replaceWorkspace({
            ...saved.state,
            ...(saved.id ? { case_id: saved.id, name: saved.name } : {}),
          });
      })
      .catch(() => {
        if (!cancelled)
          setMessage('Не удалось загрузить основной кейс. Повторите открытие из истории.');
      })
      .finally(() => {
        if (!cancelled) setLinking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, sourceId, replaceWorkspace, workspace.source_case_id]);

  const update = (patch, group = null) => {
    setWorkspace((value) => ({ ...value, ...patch }), group);
    setMessage('');
  };
  const editPhoto = (index, patch) =>
    update(
      { photos: photos.map((photo, i) => (i === index ? { ...photo, ...patch } : photo)) },
      `photo-${index}-${Object.keys(patch)[0]}`,
    );
  const upload = async (files) => {
    if (locked || !files.length) return;
    if (photos.length + files.length > 6) {
      setPhotoError('В одном кейсе может быть не больше 6 фотографий.');
      return;
    }
    setBusy(true);
    setMessage('');
    setPhotoError('');
    try {
      const loaded = await Promise.all(Array.from(files).map(readCasePhoto));
      update({
        photos: [
          ...photos,
          ...loaded.map((photo, i) => ({
            ...photo,
            stage: photos.length + i ? 'after' : 'before',
          })),
        ],
      });
    } catch (error) {
      setPhotoError(error.message);
    } finally {
      setBusy(false);
    }
  };
  const movePhoto = (index, delta) => {
    const next = [...photos];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    update({ photos: next });
  };
  const save = async () => {
    setShowErrors(true);
    if (invalid) {
      requestAnimationFrame(() => {
        const field = formRef.current?.querySelector('[aria-invalid="true"]');
        field?.focus();
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const canvas = await renderCasePhoto(photos[0], 320);
      const saved = await saveCollageCase(workspace.case_id, {
        name: workspace.name,
        state: workspace,
        preview: canvas.toDataURL('image/jpeg', 0.8),
      });
      replaceWorkspace((value) => ({ ...value, case_id: saved.id, name: saved.name }));
      setHistory((rows) => [saved, ...rows.filter((row) => row.id !== saved.id)]);
      setMessage('Кейс сохранён.');
    } catch (error) {
      setMessage(
        typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Не удалось сохранить кейс. Попробуйте ещё раз.',
      );
    } finally {
      setBusy(false);
    }
  };
  const open = async (id) => {
    setBusy(true);
    try {
      const saved = await getCollageCase(id);
      replaceWorkspace({ ...saved.state, case_id: saved.id, name: saved.name });
      setShowErrors(false);
      setTouched({});
    } catch {
      setMessage('Не удалось открыть кейс.');
    } finally {
      setBusy(false);
    }
  };
  const download = async (photo, index) => {
    setBusy(true);
    try {
      await downloadCasePhoto(photo, workspace.name, index);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const downloadAll = async () => {
    if (!photos.length || locked) return;
    setBusy(true);
    setMessage('Подготавливаем ZIP…');
    try {
      await downloadAllCasePhotos(photos, workspace.name);
      setMessage('Архив скачан.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const more = async () => {
    setBusy(true);
    try {
      const rows = await listCollageCases(historyError ? 0 : history.length, 'prodoctor');
      setHistory((old) => (historyError ? rows : [...old, ...rows]));
      setHasMore(rows.length === 24);
      setHistoryError('');
    } catch {
      setHistoryError('Не удалось загрузить историю.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="case-main case-pro-main">
      <CasePageHeading
        title="Кейс для ПроДокторов"
        disabled={locked}
        onNew={() => {
          update(emptyProdoctorWorkspace());
          setShowErrors(false);
          setTouched({});
          setPhotoError('');
          setTextWarning('');
        }}
      />
      <fieldset ref={formRef} disabled={locked} className="case-pro-form">
        <legend className="sr-only">Оформление кейса</legend>
        <CasePanel className="case-name-panel">
          <CaseField label="Название кейса" error={fieldError('name')}>
            <input
              aria-required="true"
              onBlur={() => touch('name')}
              value={workspace.name}
              maxLength={160}
              onChange={(e) => update({ name: e.target.value }, 'name')}
              placeholder="Например, лечение кариеса 16 зуба"
            />
          </CaseField>
        </CasePanel>
        <section
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) {
              e.preventDefault();
              if (!locked) setDragging(true);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files);
          }}
          tabIndex={-1}
          aria-label="Фотографии кейса"
          aria-invalid={Boolean(photoError || fieldError('photos'))}
          aria-describedby={photoError || fieldError('photos') ? 'pro-photos-error' : undefined}
          className={`case-panel ${dragging ? 'is-dragging' : ''}`}
        >
          <div className="case-section-heading">
            <div>
              <h2>
                Фотографии <span className="case-count">{photos.length}/6</span>
              </h2>
              <p className="case-hint">От 2 до 6 фото · JPG, PNG · до 16 МБ каждое</p>
            </div>
            <div className="case-actions">
              <CaseButton disabled={!photos.length} onClick={downloadAll}>
                Скачать все ZIP
              </CaseButton>
              <label
                className={`case-btn case-btn--secondary ${photos.length >= 6 ? 'is-disabled' : ''}`}
              >
                Добавить фото
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  disabled={locked || photos.length >= 6}
                  onChange={(e) => {
                    upload(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
          {!photos.length && (
            <div className="case-empty-upload">
              <span className="case-upload-plus" aria-hidden="true">
                +
              </span>
              Перетащите фотографии сюда или выберите файлы
            </div>
          )}
          {(photoError || fieldError('photos')) && (
            <p id="pro-photos-error" role="alert" className="case-field-error">
              {photoError || fieldError('photos')}
            </p>
          )}
          <div className="case-pro-photos">
            {photos.map((photo, index) => (
              <article key={index} className="case-photo-card">
                <PhotoPreview photo={photo} className="case-photo-preview" />
                <div className="case-photo-toolbar">
                  <span className="case-label">Фото {index + 1}</span>
                  <div className="case-actions">
                    <CaseButton
                      compact
                      aria-label={`Фото ${index + 1} раньше`}
                      disabled={!index}
                      onClick={() => movePhoto(index, -1)}
                    >
                      ↑
                    </CaseButton>
                    <CaseButton
                      compact
                      aria-label={`Фото ${index + 1} позже`}
                      disabled={index === photos.length - 1}
                      onClick={() => movePhoto(index, 1)}
                    >
                      ↓
                    </CaseButton>
                    <CaseRemoveButton
                      compact
                      aria-label={`Удалить фото ${index + 1}`}
                      onClick={() => update({ photos: photos.filter((_, i) => i !== index) })}
                    />
                  </div>
                </div>
                <CaseField label="Этап лечения">
                  <select
                    value={photo.stage}
                    onChange={(e) => editPhoto(index, { stage: e.target.value })}
                  >
                    <option value="before">До процедуры</option>
                    <option value="after">Сразу после процедуры</option>
                  </select>
                </CaseField>
                <details className="case-details">
                  <summary>Кадрирование</summary>
                  <div className="case-crop-sliders">
                    {[
                      ['zoom', 'Масштаб', 100, 300],
                      ['x', 'По горизонтали', 0, 100],
                      ['y', 'По вертикали', 0, 100],
                    ].map(([key, label, min, max]) => (
                      <CaseRange
                        key={key}
                        label={label}
                        ariaLabel={`${label} фото ${index + 1}`}
                        min={min}
                        max={max}
                        value={photo[key]}
                        suffix="%"
                        onChange={(value) => editPhoto(index, { [key]: value })}
                      />
                    ))}
                  </div>
                </details>
                <CaseButton className="case-full" onClick={() => download(photo, index)}>
                  Скачать JPG
                </CaseButton>
              </article>
            ))}
          </div>
        </section>
        <div className="case-pro-details">
          <CasePanel
            title="Описание"
            action={<span className="case-count">{textLength(workspace.text || '')}/500</span>}
          >
            <CaseField
              label="Текст кейса"
              hint={textWarning || 'Пробелы не учитываются.'}
              error={fieldError('text')}
            >
              <textarea
                rows={5}
                placeholder="Расскажите о лечении и результате"
                value={workspace.text || ''}
                onChange={(e) => {
                  update({ text: adaptDescription(e.target.value) }, 'text');
                  setTextWarning(
                    textLength(e.target.value) > 500
                      ? 'Текст ограничен 500 символами без пробелов.'
                      : '',
                  );
                }}
              />
            </CaseField>
            {workspace.description && (
              <div className="case-actions">
                <CaseButton
                  onClick={() => update({ text: adaptDescription(workspace.description) })}
                >
                  Взять с сайта
                </CaseButton>
              </div>
            )}
          </CasePanel>
          <CasePanel
            title="Услуги"
            hint="От 1 до 50 услуг. Количество необязательно, до 1000."
            action={
              <CaseButton
                disabled={services.length >= 50}
                onClick={() => update({ services: [...services, { name: '', quantity: null }] })}
              >
                Добавить
              </CaseButton>
            }
          >
            {fieldError('services') ? (
              <p role="alert" tabIndex={-1} aria-invalid="true" className="case-field-error">
                {fieldError('services')}
              </p>
            ) : (
              !services.length && (
                <p className="case-empty">Добавьте услуги, оказанные в рамках кейса.</p>
              )
            )}
            {services.map((service, index) => (
              <div key={index} className="case-service-row">
                <CaseField
                  label={index === 0 ? 'Название услуги' : `Услуга ${index + 1}`}
                  error={fieldError(`service-${index}`)}
                >
                  <input
                    aria-label={`Услуга ${index + 1}`}
                    onBlur={() => touch(`service-${index}`)}
                    placeholder="Например, лечение кариеса"
                    maxLength={200}
                    value={service.name}
                    onChange={(e) =>
                      update(
                        {
                          services: services.map((s, i) =>
                            i === index ? { ...s, name: e.target.value } : s,
                          ),
                        },
                        `service-${index}`,
                      )
                    }
                  />
                </CaseField>
                <CaseField label="Кол-во" error={fieldError(`quantity-${index}`)}>
                  <input
                    aria-label={`Количество услуги ${index + 1}`}
                    type="number"
                    min={1}
                    max={1000}
                    onBlur={() => touch(`quantity-${index}`)}
                    onFocus={(e) => e.target.select()}
                    placeholder="—"
                    value={service.quantity ?? ''}
                    onChange={(e) =>
                      update(
                        {
                          services: services.map((s, i) =>
                            i === index
                              ? {
                                  ...s,
                                  quantity: e.target.value === '' ? null : Number(e.target.value),
                                }
                              : s,
                          ),
                        },
                        `quantity-${index}`,
                      )
                    }
                  />
                </CaseField>
                <CaseRemoveButton
                  aria-label={`Удалить услугу ${index + 1}`}
                  onClick={() => update({ services: services.filter((_, i) => i !== index) })}
                />
              </div>
            ))}
          </CasePanel>
        </div>
        <div className="case-form-footer">
          <p role="status" className="case-status">
            {message || (showErrors && invalid ? 'Проверьте выделенные поля.' : draftStatus)}
          </p>
          <div className="case-actions">
            <CaseButton disabled={photos.length < 2} onClick={() => previewRef.current.showModal()}>
              Предпросмотр
            </CaseButton>
            <CaseButton variant="primary" disabled={locked} onClick={save}>
              {busy ? 'Сохраняем…' : workspace.case_id ? 'Сохранить изменения' : 'Сохранить кейс'}
            </CaseButton>
          </div>
        </div>
      </fieldset>
      {linking && (
        <p role="status" className="case-status">
          Открываем вариант кейса…
        </p>
      )}
      <CasePanel title="Сохранённые кейсы" className="case-history">
        {!history.length && (
          <p className="case-empty">Здесь появятся ваши сохранённые кейсы ПроДокторов.</p>
        )}
        <div className="case-history-grid">
          {history.map((item) => (
            <article key={item.id} className="case-history-card">
              <img src={item.preview} alt={item.name} />
              <div className="case-card-body">
                <h3>{item.name}</h3>
                <p className="case-hint">{caseDate(item.updated_at).toLocaleString('ru-RU')}</p>
                <CaseButton disabled={locked} onClick={() => open(item.id)}>
                  Открыть кейс
                </CaseButton>
              </div>
            </article>
          ))}
        </div>
        {historyError && <p className="case-status is-error">{historyError}</p>}
        {(hasMore || historyError) && (
          <CaseButton disabled={locked} onClick={more}>
            {historyError ? 'Повторить' : 'Показать ещё'}
          </CaseButton>
        )}
      </CasePanel>
      <dialog ref={previewRef} className="case-dialog">
        <div className="case-section-heading">
          <h2>Кейс для ПроДокторов</h2>
          <CaseButton onClick={() => previewRef.current.close()}>Закрыть</CaseButton>
        </div>
        <h3>{workspace.name || 'Кейс до/после'}</h3>
        {workspace.doctor && <p className="case-hint">{workspace.doctor}</p>}
        <div className="case-dialog-gallery">
          {photos.map((photo, i) => (
            <figure key={i}>
              <PhotoPreview photo={photo} className="case-photo-preview" />
              <figcaption className="case-hint">
                {photo.stage === 'before' ? 'До процедуры' : 'Сразу после процедуры'}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="case-description">{workspace.text}</p>
        <ul className="case-preview-services">
          {services.map((service, i) => (
            <li key={i}>
              {service.name}
              {service.quantity > 1 ? ` × ${service.quantity}` : ''}
            </li>
          ))}
        </ul>
      </dialog>
    </main>
  );
}

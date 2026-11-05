import { CaseButton, CaseField, CaseRange, CaseUndoControls } from './CaseUI.jsx';
import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_ADJUSTMENT,
  normalizeExportSettings,
  drawCollage,
  exportCollage,
  fitCollageAdjustments,
  photoRotation,
  loadCollageFont,
  loadImage,
  collageThumbnail,
  downloadBlob,
} from '../utils/collageCanvas';

import useUndoState from '../hooks/useUndoState';

const SLIDERS = [
  ['zoom', 'Масштаб', 50, 200, 1, '%'],
  ['rotation', 'Наклон', -30, 30, 0.5, '°'],
  ['x', 'Сдвиг влево / вправо', -50, 50, 0.5, '%'],
  ['y', 'Сдвиг вверх / вниз', -50, 50, 0.5, '%'],
  ['brightness', 'Яркость', 50, 150, 1, '%'],
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function CollageEditor({
  photos,
  matrices,
  initialState,
  onChange,
  caseName,
  onNameChange,
  onSave,
  saving,
  saveMessage,
  caseId,
  draftStatus,
  doctor,
  description,
  onProdoctor,
  onSources,
}) {
  const initialRef = useRef(initialState);
  const previewRef = useRef(null);
  const [websitePreview, setWebsitePreview] = useState('');
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [images, setImages] = useState(null);
  const [selected, setSelected] = useState('before');
  const [editor, setEditor, history] = useUndoState(() => ({
    adjustments: initialRef.current?.adjustments || {
      before: { ...DEFAULT_ADJUSTMENT },
      after: { ...DEFAULT_ADJUSTMENT },
    },
    settings: normalizeExportSettings(initialRef.current?.settings),
  }));
  const { adjustments, settings } = editor;
  const replaceEditor = history.replace;
  const [nameTouched, setNameTouched] = useState(false);
  const nameRef = useRef(null);
  const setAdjustments = (action, group = 'photo') =>
    setEditor((current) => {
      const next = typeof action === 'function' ? action(current.adjustments) : action;
      return next === current.adjustments ? current : { ...current, adjustments: next };
    }, group);
  const setSettings = (action, group = 'export') =>
    setEditor((current) => {
      const next = typeof action === 'function' ? action(current.settings) : action;
      return Object.keys(next).every((key) => next[key] === current.settings[key])
        ? current
        : { ...current, settings: next };
    }, group);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState('');
  const [preparedFile, setPreparedFile] = useState(null);
  const currentFile =
    preparedFile?.images === images &&
    preparedFile?.matrices === matrices &&
    preparedFile?.adjustments === adjustments &&
    preparedFile?.settings === settings
      ? preparedFile
      : null;

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadImage(photos.before.src), loadImage(photos.after.src), loadCollageFont()])
      .then(([before, after]) => {
        if (cancelled) return;
        const loaded = { before, after };
        setImages(loaded);
        replaceEditor((current) => ({
          ...current,
          adjustments:
            initialRef.current?.adjustments ||
            fitCollageAdjustments(
              loaded,
              matrices,
              { before: { ...DEFAULT_ADJUSTMENT }, after: { ...DEFAULT_ADJUSTMENT } },
              50,
              true,
            ),
        }));
        requestAnimationFrame(() =>
          sectionRef.current?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
            block: 'start',
          }),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [photos, matrices, replaceEditor]);

  useEffect(() => {
    if (images && canvasRef.current)
      drawCollage(canvasRef.current, images, matrices, adjustments, settings, true, selected);
  }, [images, matrices, adjustments, settings, selected]);

  useEffect(() => {
    if (!images) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      exportCollage(images, matrices, adjustments, settings)
        .then((blob) => {
          if (!cancelled) setPreparedFile({ images, matrices, adjustments, settings, blob });
        })
        .catch((err) => {
          if (!cancelled)
            setPreparedFile({
              images,
              matrices,
              adjustments,
              settings,
              error: err.message || 'Не удалось подготовить файл.',
            });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [images, matrices, adjustments, settings]);

  useEffect(() => {
    if (images) onChange({ adjustments, settings });
  }, [images, adjustments, settings, onChange]);

  const updatePhoto = (key, field, value) => {
    const next = field === 'rotation' ? value - photoRotation(matrices[key]) : value;
    setAdjustments(
      (current) =>
        current[key][field] === next
          ? current
          : { ...current, [key]: { ...current[key], [field]: next } },
      `${key}:${field}`,
    );
    setDownloadInfo('');
  };

  const sliderValue = (field) =>
    field === 'rotation'
      ? photoRotation(matrices[selected], adjustments[selected].rotation)
      : adjustments[selected][field];

  const updateSplit = (split) => {
    setSettings((value) => ({ ...value, split }), 'split');
    setDownloadInfo('');
  };

  const moveWithArrows = (event) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'z' &&
      !event.target.closest('input, textarea, select') &&
      !saving &&
      !downloading
    ) {
      event.preventDefault();
      if (event.shiftKey) history.redo();
      else history.undo();
      return;
    }
    if (
      !images ||
      downloading ||
      saving ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.target.closest(
        'input, select, textarea, [contenteditable]:not([contenteditable="false"])',
      )
    )
      return;
    const directions = {
      ArrowLeft: ['x', -1],
      ArrowRight: ['x', 1],
      ArrowUp: ['y', -1],
      ArrowDown: ['y', 1],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const [field, sign] = direction;
    const step = (event.shiftKey ? 10 : 2) / (field === 'x' ? 13 : 9.56);
    setAdjustments((current) => ({
      ...current,
      [selected]: { ...current[selected], [field]: current[selected][field] + sign * step },
    }));
    setDownloadInfo('');
  };

  const startDrag = (event) => {
    if (!images || downloading || saving) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const frameX = (rect.width * 40) / 1388,
      frameY = (rect.height * 78) / 1112;
    const frameWidth = (rect.width * 1300) / 1388,
      frameHeight = (rect.height * 956) / 1112;
    const localX = event.clientX - rect.left - frameX,
      localY = event.clientY - rect.top - frameY;
    if (localX < 0 || localX > frameWidth || localY < 0 || localY > frameHeight) return;
    const lineX = (frameWidth * settings.split) / 100;
    const scale = Math.min(rect.width / 1388, rect.height / 1112);
    const handleY = frameHeight - 124 * scale;
    const onHandle =
      Math.abs(localX - lineX) <= 122 * scale && Math.abs(localY - handleY) <= 88 * scale;
    const type = Math.abs(localX - lineX) < 18 || onHandle ? 'divider' : 'photo';
    event.currentTarget.focus({ preventScroll: true });
    const key = localX < lineX ? 'before' : 'after';
    if (type === 'photo') setSelected(key);
    dragRef.current = {
      type,
      key,
      x: event.clientX,
      y: event.clientY,
      frameX: rect.left + frameX,
      frameWidth,
      panWidth: 1300 * Math.max(frameWidth / 1300, frameHeight / 956),
      panHeight: 956 * Math.max(frameWidth / 1300, frameHeight / 956),
      initial: adjustments[key],
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    setDownloadInfo('');
    if (drag.type === 'divider') {
      updateSplit(clamp(((event.clientX - drag.frameX) / drag.frameWidth) * 100, 0, 100));
    } else {
      setAdjustments((value) => ({
        ...value,
        [drag.key]: {
          ...value[drag.key],
          x: drag.initial.x + ((event.clientX - drag.x) / drag.panWidth) * 100,
          y: drag.initial.y + ((event.clientY - drag.y) / drag.panHeight) * 100,
        },
      }));
    }
  };

  const cleanCanvas = () => {
    const canvas = document.createElement('canvas');
    drawCollage(canvas, images, matrices, adjustments, settings);
    return canvas;
  };

  const download = () => {
    if (!currentFile?.blob) return;
    setDownloading(true);
    setError('');
    try {
      const blob = currentFile.blob;
      downloadBlob(
        blob,
        `${caseName.trim().replace(/[/\\:*?"<>|]/g, '-') || 'dental-before-after'}.${settings.format}`,
      );
      setDownloadInfo(
        `${settings.format.toUpperCase()} · ${settings.width} × ${settings.height} · ${(blob.size / 1024 / 1024).toFixed(2)} МБ`,
      );
    } catch (err) {
      setError(err.message || 'Не удалось скачать коллаж.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      tabIndex={0}
      onKeyDown={moveWithArrows}
      aria-label="Редактор коллажа"
      className="case-editor"
    >
      <header className="case-section-heading">
        <div>
          <h2>Редактор коллажа</h2>
        </div>
        <div className="case-actions">
          <CaseUndoControls history={history} disabled={!images || saving || downloading} />
          <CaseButton onClick={onSources}>Исходные фото</CaseButton>
          <CaseButton
            disabled={!images}
            onClick={() => {
              setWebsitePreview(cleanCanvas().toDataURL('image/jpeg', 0.9));
              previewRef.current.showModal();
            }}
          >
            Предпросмотр
          </CaseButton>
          <CaseButton
            variant="ghost"
            disabled={!images || downloading || saving}
            onClick={() => {
              setEditor((current) => ({
                ...current,
                adjustments: fitCollageAdjustments(
                  images,
                  matrices,
                  { before: { ...DEFAULT_ADJUSTMENT }, after: { ...DEFAULT_ADJUSTMENT } },
                  50,
                  true,
                ),
                settings: { ...current.settings, split: 50 },
              }));
              setDownloadInfo('');
            }}
          >
            Сбросить всё
          </CaseButton>
        </div>
      </header>
      <div className="case-editor-grid">
        <div className="case-preview-column">
          <div className="case-canvas-frame">
            <canvas
              ref={canvasRef}
              tabIndex={0}
              width={1388}
              height={1112}
              role="img"
              aria-label="Предпросмотр коллажа до и после"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={() => {
                dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
              onLostPointerCapture={() => {
                dragRef.current = null;
              }}
            />
          </div>
          <p className="case-hint">
            Перетаскивайте фото или разделитель. Стрелки — точнее, Shift + стрелки — быстрее.
          </p>
        </div>
        <aside className="case-editor-controls">
          <fieldset disabled={!images || downloading || saving}>
            <legend className="case-control-title">Коррекция фото</legend>
            <div className="case-segmented" role="group" aria-label="Выбор фото для редактирования">
              {[
                ['before', 'До'],
                ['after', 'После'],
              ].map(([key, title]) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={selected === key}
                  onClick={() => setSelected(key)}
                >
                  {title}
                </button>
              ))}
            </div>
            <div className="case-sliders">
              {SLIDERS.map(([field, label, min, max, step, suffix]) => (
                <CaseRange
                  key={field}
                  label={field === 'x' ? 'По горизонтали' : field === 'y' ? 'По вертикали' : label}
                  ariaLabel={`${label}: ${selected === 'before' ? 'до' : 'после'}`}
                  value={sliderValue(field)}
                  min={Math.min(min, Math.floor(sliderValue(field)))}
                  max={Math.max(max, Math.ceil(sliderValue(field)))}
                  step={step}
                  suffix={suffix}
                  onChange={(value) => updatePhoto(selected, field, value)}
                />
              ))}
              <CaseRange
                label="Разделитель"
                ariaLabel="Положение разделителя"
                value={settings.split}
                min={0}
                max={100}
                suffix="%"
                onChange={updateSplit}
              />
            </div>
            <CaseButton
              className="case-reset-photo"
              variant="ghost"
              compact
              onClick={() => {
                setAdjustments(
                  (v) => ({
                    ...v,
                    [selected]: fitCollageAdjustments(
                      images,
                      matrices,
                      { before: { ...DEFAULT_ADJUSTMENT }, after: { ...DEFAULT_ADJUSTMENT } },
                      50,
                      true,
                    )[selected],
                  }),
                  null,
                );
                setDownloadInfo('');
              }}
            >
              Сбросить выбранное фото
            </CaseButton>
          </fieldset>
          <fieldset disabled={!images || downloading || saving} className="case-export-controls">
            <legend className="case-control-title">Скачать изображение</legend>
            <div className="case-export-options">
              <CaseField label="Формат">
                <select
                  value={settings.format}
                  onChange={(e) => {
                    setSettings((v) => ({ ...v, format: e.target.value }));
                    setDownloadInfo('');
                  }}
                >
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="webp">WebP</option>
                </select>
              </CaseField>
              {settings.format !== 'png' && (
                <CaseRange
                  label="Качество"
                  ariaLabel="Качество картинки"
                  value={settings.quality}
                  min={50}
                  max={100}
                  suffix="%"
                  onChange={(value) => {
                    setSettings((current) => ({ ...current, quality: value }), 'quality');
                    setDownloadInfo('');
                  }}
                />
              )}
            </div>
            <p role="status" className="case-hint">
              1388 × 1112 ·{' '}
              {currentFile?.blob
                ? currentFile.blob.size < 1024 * 1024
                  ? `${(currentFile.blob.size / 1024).toFixed(1)} КБ`
                  : `${(currentFile.blob.size / 1024 / 1024).toFixed(2)} МБ`
                : currentFile?.error || 'Рассчитываем вес…'}
            </p>
            <CaseButton
              className="case-full"
              onClick={download}
              disabled={!currentFile?.blob || downloading}
            >
              {downloading ? 'Подготавливаем…' : `Скачать ${settings.format.toUpperCase()}`}
            </CaseButton>
          </fieldset>
        </aside>
      </div>
      <fieldset disabled={!images || downloading || saving} className="case-editor-save">
        <CaseField
          label="Название кейса"
          error={nameTouched && !caseName.trim() ? 'Введите название кейса.' : ''}
        >
          <input
            ref={nameRef}
            onBlur={() => setNameTouched(true)}
            value={caseName}
            maxLength={160}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Например, реставрация 16 зуба"
          />
        </CaseField>
        <div className="case-actions">
          {caseId && <CaseButton onClick={() => onProdoctor(caseId)}>Для ПроДокторов</CaseButton>}
          <CaseButton
            variant="primary"
            disabled={!images || saving}
            onClick={() => {
              setNameTouched(true);
              if (!caseName.trim()) {
                nameRef.current.focus();
                return;
              }
              try {
                onSave(collageThumbnail(cleanCanvas()));
              } catch {
                setError('Не удалось подготовить превью. Попробуйте ещё раз.');
              }
            }}
          >
            {saving ? 'Сохраняем…' : caseId ? 'Сохранить изменения' : 'Сохранить кейс'}
          </CaseButton>
        </div>
        <p role="status" className="case-status">
          {saveMessage || error || downloadInfo || draftStatus}
        </p>
      </fieldset>
      <dialog ref={previewRef} className="case-dialog">
        <div className="case-section-heading">
          <h2>Кейс на сайте</h2>
          <CaseButton onClick={() => previewRef.current.close()}>Закрыть</CaseButton>
        </div>
        {websitePreview && (
          <img
            src={websitePreview}
            alt="Предпросмотр кейса на сайте"
            className="case-dialog-image"
          />
        )}
        <h3>{caseName || 'Кейс до/после'}</h3>
        {doctor && <p className="case-hint">Врач: {doctor}</p>}
        {description && <p className="case-description">{description}</p>}
      </dialog>
    </section>
  );
}

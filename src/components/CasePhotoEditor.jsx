import { useEffect, useRef, useState } from 'react';
import { CaseButton } from './CaseUI.jsx';
import PhotoTools from './PhotoTools.jsx';
import { renderCasePhoto } from '../utils/prodoctor';
import { drawCropGrid, rotatedSize } from '../utils/photoGeometry';
import { loadImage } from '../utils/collageCanvas';

export default function CasePhotoEditor({ photo, onApply, onClose }) {
  const [edit, setEdit] = useState({ ...photo });
  const [grid, setGrid] = useState(true);
  const [size, setSize] = useState(null);
  const [error, setError] = useState('');
  const canvas = useRef(null);
  const dialog = useRef(null);
  const drag = useRef(null);
  useEffect(() => {
    const modal = dialog.current;
    modal.showModal();
    return () => modal.close();
  }, []);
  useEffect(() => {
    let cancelled = false;
    loadImage(photo.src)
      .then((image) => {
        if (!cancelled) setSize({ width: image.naturalWidth, height: image.naturalHeight });
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось открыть фото.');
      });
    return () => {
      cancelled = true;
    };
  }, [photo.src]);
  useEffect(() => {
    let cancelled = false;
    renderCasePhoto(edit, 800)
      .then((preview) => {
        if (cancelled || !canvas.current) return;
        const ctx = canvas.current.getContext('2d');
        ctx.clearRect(0, 0, 800, 800);
        ctx.drawImage(preview, 0, 0);
        if (grid) drawCropGrid(ctx, 0, 0, 800, 800);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось подготовить фото.');
      });
    return () => {
      cancelled = true;
    };
  }, [edit, grid]);
  const change = (field, value) =>
    setEdit((current) => ({
      ...current,
      [field]: value,
      ...(field === 'rotation' ? { x: 50, y: 50 } : {}),
    }));
  const move = (event) => {
    if (!drag.current || !size) return;
    const bounds = rotatedSize(size.width, size.height, edit.rotation || 0);
    const side = (Math.min(bounds.width, bounds.height) * 100) / edit.zoom;
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (value) => Math.max(0, Math.min(100, value));
    setEdit((current) => ({
      ...current,
      x:
        bounds.width > side
          ? clamp(
              drag.current.edit.x -
                ((((event.clientX - drag.current.x) / rect.width) * side) / (bounds.width - side)) *
                  100,
            )
          : 50,
      y:
        bounds.height > side
          ? clamp(
              drag.current.edit.y -
                ((((event.clientY - drag.current.y) / rect.height) * side) /
                  (bounds.height - side)) *
                  100,
            )
          : 50,
    }));
  };
  return (
    <dialog ref={dialog} className="case-dialog photo-editor-dialog" onCancel={onClose}>
      <header className="case-section-heading">
        <h2>Настройка фотографии</h2>
        <CaseButton onClick={onClose}>Закрыть</CaseButton>
      </header>
      <div className="photo-editor-layout">
        <div>
          <canvas
            ref={canvas}
            width={800}
            height={800}
            aria-label="Кадрирование фотографии: перетаскивайте фото"
            tabIndex={0}
            onPointerDown={(event) => {
              drag.current = { x: event.clientX, y: event.clientY, edit };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={move}
            onPointerUp={() => {
              drag.current = null;
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
          />
          <p className="case-hint">
            Перетаскивайте фото внутри кадра. Масштаб увеличивает область для перемещения.
          </p>
        </div>
        <PhotoTools
          edit={edit}
          onChange={change}
          grid={grid}
          onGridChange={setGrid}
          minimumZoom={100}
          maximumZoom={300}
        />
      </div>
      {error && (
        <p role="alert" className="case-field-error">
          {error}
        </p>
      )}
      <footer className="case-actions">
        <CaseButton onClick={() => setEdit({ ...photo })}>Сбросить</CaseButton>
        <CaseButton variant="primary" disabled={Boolean(error)} onClick={() => onApply(edit)}>
          Применить
        </CaseButton>
      </footer>
    </dialog>
  );
}

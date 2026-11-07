import { useRef, useState } from 'react';
import { CaseButton, CaseRemoveButton } from './CaseUI.jsx';
import { readSourcePhoto } from '../utils/sourcePhotos';
import { sortSourceFiles } from '../utils/caseWorkflow';

export default function SourcePhotos({ photos, onChange, disabled = false, onReadingChange }) {
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  const upload = async (files) => {
    if (disabled || reading || !files.length) return;
    if (photos.length + files.length > 6) {
      setError('В кейсе может быть не больше 6 фотографий.');
      return;
    }
    setReading(true);
    onReadingChange?.(true);
    setError('');
    try {
      const loaded = [];
      for (const file of sortSourceFiles(files)) loaded.push(await readSourcePhoto(file));
      onChange([...photos, ...loaded]);
    } catch (err) {
      setError(err.message);
    } finally {
      setReading(false);
      onReadingChange?.(false);
    }
  };
  const move = (index, delta) => {
    const next = [...photos];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  };
  return (
    <section
      className={`case-panel source-panel ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        upload(event.dataTransfer.files);
      }}
    >
      <div className="case-section-heading">
        <div>
          <h2>
            Исходные фотографии <span className="case-count">{photos.length}/6</span>
          </h2>
          <p className="case-hint">JPG, PNG, WebP · до 16 МБ · сохраняются в кейсе</p>
        </div>
        <CaseButton
          disabled={disabled || reading || photos.length >= 6}
          onClick={() => input.current.click()}
        >
          {reading ? 'Загружаем…' : 'Добавить фото'}
        </CaseButton>
      </div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || reading}
        onChange={(event) => {
          upload(event.target.files);
          event.target.value = '';
        }}
      />
      {!photos.length && (
        <button
          className="case-empty-upload source-drop"
          type="button"
          disabled={disabled || reading}
          onClick={() => input.current.click()}
        >
          <span className="case-upload-plus">+</span>Перетащите фотографии или выберите файлы
        </button>
      )}
      <div className="source-grid">
        {photos.map((photo, index) => (
          <article key={`${photo.filename}-${index}`} className="source-card">
            <img src={photo.src} alt={`Исходное фото ${index + 1}`} />
            <div className="case-photo-toolbar">
              <span className="case-label">{index + 1}</span>
              <div className="case-actions">
                <CaseButton
                  compact
                  disabled={disabled || reading || !index}
                  aria-label={`Фото ${index + 1} раньше`}
                  onClick={() => move(index, -1)}
                >
                  ←
                </CaseButton>
                <CaseButton
                  compact
                  disabled={disabled || reading || index === photos.length - 1}
                  aria-label={`Фото ${index + 1} позже`}
                  onClick={() => move(index, 1)}
                >
                  →
                </CaseButton>
                <CaseRemoveButton
                  compact
                  disabled={disabled || reading}
                  aria-label={`Удалить фото ${index + 1}`}
                  onClick={() => onChange(photos.filter((_, i) => i !== index))}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
      {error && (
        <p className="case-field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

import { useState } from 'react';

export default function CasePhotoStack({ photos }) {
  const [index, setIndex] = useState(0);
  if (!photos.length) return null;
  const current = index % photos.length;
  const next = () => setIndex((current + 1) % photos.length);
  return (
    <button
      type="button"
      className="case-photo-stack"
      disabled={photos.length < 2}
      aria-label={`Фото ${current + 1} из ${photos.length}${photos.length > 1 ? '. Показать следующее фото' : ''}`}
      onClick={next}
      onKeyDown={(event) => {
        if (photos.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        setIndex((current + (event.key === 'ArrowLeft' ? -1 : 1) + photos.length) % photos.length);
      }}
    >
      {photos.map((photo, photoIndex) => {
        const depth = (photoIndex - current + photos.length) % photos.length;
        return (
          <img
            key={photoIndex}
            src={photo.src}
            alt={depth === 0 ? `Фото ${photoIndex + 1}` : ''}
            aria-hidden={depth !== 0}
            className={depth > 2 ? 'is-hidden' : ''}
            style={{
              '--stack-depth': depth,
              '--stack-angle': `${depth === 0 ? 0 : depth % 2 ? 2 : -2}deg`,
              zIndex: photos.length - depth,
            }}
            draggable={false}
          />
        );
      })}
      <span className="case-photo-stack-count" aria-hidden="true">
        {current + 1} / {photos.length}
      </span>
    </button>
  );
}

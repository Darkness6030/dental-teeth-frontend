import { useState } from 'react';
import { CaseButton, CaseRange } from './CaseUI.jsx';
import Switch from './Switch.jsx';
import { normalizeAngle } from '../utils/photoGeometry';

export default function PhotoTools({
  edit,
  onChange,
  grid,
  onGridChange,
  minimumZoom = 50,
  maximumZoom = 200,
}) {
  const [tab, setTab] = useState('crop');
  return (
    <div className="photo-tools">
      <div
        className="case-segmented photo-tool-tabs"
        role="group"
        aria-label="Настройки фотографии"
      >
        <button type="button" aria-pressed={tab === 'crop'} onClick={() => setTab('crop')}>
          Кадрирование
        </button>
        <button type="button" aria-pressed={tab === 'color'} onClick={() => setTab('color')}>
          Свет и цвет
        </button>
      </div>
      {tab === 'crop' ? (
        <>
          <CaseRange
            sliderOnly
            label="Масштаб"
            value={edit.zoom}
            min={Math.min(minimumZoom, edit.zoom)}
            max={Math.max(maximumZoom, edit.zoom)}
            suffix="%"
            onChange={(value) => onChange('zoom', value)}
          />
          <div className="photo-rotate-controls">
            <CaseButton
              compact
              aria-label="Повернуть фото на 90 градусов влево"
              onClick={() => onChange('rotation', normalizeAngle((edit.rotation || 0) - 90))}
            >
              ↶ 90°
            </CaseButton>
            <CaseButton
              compact
              aria-label="Повернуть фото на 90 градусов вправо"
              onClick={() => onChange('rotation', normalizeAngle((edit.rotation || 0) + 90))}
            >
              ↷ 90°
            </CaseButton>
          </div>
          <CaseRange
            sliderOnly
            label="Наклон"
            value={edit.rotation || 0}
            min={-180}
            max={180}
            step={0.5}
            suffix="°"
            onChange={(value) => onChange('rotation', value)}
          />
          <div className="photo-toggle-controls">
            <label className="case-switch-label case-grid-switch">
              <span>Отразить</span>
              <Switch
                label="Отразить"
                checked={!!edit.flipped}
                handleChange={() => onChange('flipped', !edit.flipped)}
              />
            </label>
            <label className="case-switch-label case-grid-switch">
              <span>Сетка</span>
              <Switch label="Сетка" checked={grid} handleChange={() => onGridChange(!grid)} />
            </label>
          </div>
        </>
      ) : (
        <div className="photo-color-controls">
          {[
            ['brightness', 'Яркость', 50, 150],
            ['contrast', 'Контраст', 50, 150],
            ['saturation', 'Насыщенность', 0, 200],
          ].map(([field, label, min, max]) => (
            <CaseRange
              key={field}
              label={label}
              value={edit[field] ?? 100}
              min={min}
              max={max}
              suffix="%"
              onChange={(value) => onChange(field, value)}
            />
          ))}
          <div className="photo-reset-controls">
            <CaseButton
              className="case-photo-reset"
              compact
              variant="secondary"
              onClick={() => {
                onChange('brightness', 100);
                onChange('contrast', 100);
                onChange('saturation', 100);
              }}
            >
              Сбросить цвет
            </CaseButton>
          </div>
        </div>
      )}
    </div>
  );
}

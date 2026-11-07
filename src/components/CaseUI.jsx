import { cloneElement, useEffect, useId, useState } from 'react';

export function CaseButton({
  variant = 'secondary',
  compact = false,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`case-btn case-btn--${variant} ${compact ? 'case-btn--compact' : ''} ${className}`}
      {...props}
    />
  );
}

export function CaseRemoveButton({ compact = false, ...props }) {
  return (
    <CaseButton variant="danger" compact={compact} className="case-remove" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="m4 4 8 8M12 4l-8 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </CaseButton>
  );
}

export function CasePageHeading({ title, disabled, onNew }) {
  return (
    <header className="case-page-heading">
      <div>
        <h1>{title}</h1>
      </div>
      <div className="case-actions">
        <CaseButton disabled={disabled} onClick={onNew}>
          Новый кейс
        </CaseButton>
      </div>
    </header>
  );
}

export function CaseField({ label, hint, error, className = '', children }) {
  const id = useId();
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <label className={`case-field ${className} ${error ? 'has-error' : ''}`}>
      <span className="case-label">{label}</span>
      {cloneElement(children, {
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && (
        <span id={`${id}-hint`} className="case-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="case-field-error">
          {error}
        </span>
      )}
    </label>
  );
}

export function CaseRange({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
  ariaLabel = label,
  numberOnly = false,
  sliderOnly = false,
}) {
  const id = useId();
  const [input, setInput] = useState(String(Math.round(value * 10) / 10));
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    setInput(String(Math.round(value * 10) / 10));
  }, [value]);
  return (
    <div className={`case-range ${numberOnly ? 'case-number-only' : ''}`}>
      <div className="case-range-heading">
        <label htmlFor={`${id}-${numberOnly ? 'number' : 'range'}`}>{label}</label>
        <span className="case-range-number">
          {sliderOnly ? (
            <output htmlFor={`${id}-range`}>{Math.round(value * 10) / 10}</output>
          ) : (
            <input
              id={`${id}-number`}
              aria-label={`${ariaLabel}: точное значение`}
              type="number"
              min={min}
              max={max}
              step={step}
              value={input}
              onChange={(event) => {
                const raw = event.target.value;
                setInput(raw);
                setEdited(true);
                if (
                  raw !== '' &&
                  Number.isFinite(Number(raw)) &&
                  Number(raw) >= min &&
                  Number(raw) <= max
                )
                  onChange(Number(raw));
              }}
              onBlur={() => {
                if (!edited) return;
                const next =
                  input === '' || !Number.isFinite(Number(input))
                    ? value
                    : Math.max(min, Math.min(max, Number(input)));
                onChange(next);
                setInput(String(Math.round(next * 10) / 10));
                setEdited(false);
              }}
            />
          )}
          {suffix && <span aria-hidden="true">{suffix}</span>}
        </span>
      </div>
      {!numberOnly && (
        <input
          id={`${id}-range`}
          aria-label={ariaLabel}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      )}
    </div>
  );
}

export function CasePanel({ title, hint, action, children, className = '' }) {
  return (
    <section className={`case-panel ${className}`}>
      {title && (
        <div className="case-section-heading">
          <div>
            <h2>{title}</h2>
            {hint && <p className="case-hint">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

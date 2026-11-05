export function CaseButton({ variant = 'secondary', compact = false, className = '', type = 'button', ...props }) {
  return <button type={type} className={`case-btn case-btn--${variant} ${compact ? 'case-btn--compact' : ''} ${className}`} {...props} />;
}

export function CaseRemoveButton({ compact = false, ...props }) {
  return <CaseButton variant="danger" compact={compact} className="case-remove" {...props}>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </CaseButton>;
}

export function CasePageHeading({ title, disabled, onNew }) {
  return <header className="case-page-heading"><div><h1>{title}</h1></div>
    <CaseButton disabled={disabled} onClick={onNew}>Новый кейс</CaseButton>
  </header>;
}

export function CaseField({ label, hint, className = '', children }) {
  return <label className={`case-field ${className}`}><span className="case-label">{label}</span>{children}{hint && <span className="case-hint">{hint}</span>}</label>;
}

export function CasePanel({ title, hint, action, children, className = '' }) {
  return <section className={`case-panel ${className}`}>
    {title && <div className="case-section-heading"><div><h2>{title}</h2>{hint && <p className="case-hint">{hint}</p>}</div>{action}</div>}
    {children}
  </section>;
}

// Server timestamps without a zone store UTC wall time. Local snapshots already use ISO Z.
export const caseDate = (value) =>
  new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);

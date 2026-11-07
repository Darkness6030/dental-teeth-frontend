export const DIRECTIONS = [
  'Терапия',
  'Ортопедия',
  'Ортодонтия',
  'Хирургия',
  'Имплантация',
  'Гигиена',
];
export const FORMAT_NAMES = { website: 'Для сайта', prodoctor: 'Для ПроДокторов' };
export function sortSourceFiles(files) {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru', { numeric: true, sensitivity: 'base' }),
  );
}
export function projectSeed(project, mode) {
  const common = {
    mode,
    project_id: project.id,
    name: project.name,
    doctor: project.doctor,
    description: project.description || '',
    case_id: null,
  };
  if (mode === 'prodoctor')
    return {
      ...common,
      text: Array.from(project.description || '').reduce(
        (text, char) =>
          Array.from(text.replace(/\s/gu, '')).length < 500 || /\s/u.test(char)
            ? text + char
            : text,
        '',
      ),
      services: [],
      source_case_id: null,
      photos: project.photos.map((photo, i, all) => ({
        ...photo,
        zoom: 100,
        x: 50,
        y: 50,
        stage: i === 0 ? 'before' : i === all.length - 1 ? 'after' : 'during',
      })),
    };
  return {
    ...common,
    before: project.photos[0]?.src || null,
    after: project.photos.at(-1)?.src || null,
    auto_align: false,
    matrices: null,
    adjustments: null,
  };
}
export const hasDraftContent = (state) =>
  Boolean(
    state?.before ||
    state?.after ||
    state?.photos?.length ||
    state?.name?.trim() ||
    state?.text?.trim(),
  );

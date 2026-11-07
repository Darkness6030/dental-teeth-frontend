import { getCollageDraft } from '../api';
import { readLocalDraft } from './collageDraft';
import { caseDate } from './caseDates';
export async function workspaceDraft(userId, mode) {
  const results = await Promise.allSettled([
    getCollageDraft(mode),
    readLocalDraft(mode === 'website' ? userId : `${userId}:prodoctor`),
  ]);
  return (
    results
      .filter((result) => result.status === 'fulfilled' && result.value?.state)
      .map((result) => result.value)
      .sort((a, b) => caseDate(b.updated_at) - caseDate(a.updated_at))[0] || null
  );
}

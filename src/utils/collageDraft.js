const database = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open('dental-collage-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export async function readLocalDraft(userId) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get(userId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function writeLocalDraft(userId, draft) {
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put(draft, userId);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Не удалось сохранить черновик.'));
    });
  } finally {
    db.close();
  }
}

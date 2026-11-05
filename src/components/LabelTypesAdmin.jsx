import { useEffect, useState } from 'react';
import { createLabelType, deleteLabelType, getLabelTypes, updateLabelType } from '../api';

export default function LabelTypesAdmin() {
  const [labels, setLabels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const isBusy = isSaving || isDeleting;

  const loadLabels = async () => {
    setIsLoading(true);
    setError('');
    try {
      setLabels(await getLabelTypes());
    } catch {
      setError('Не удалось загрузить типы меток.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLabels();
  }, []);

  const openForm = (label = { text: '', icon: '' }) => {
    setSaveError('');
    setForm(label);
  };

  const save = async (event) => {
    event.preventDefault();
    if (isBusy || !form.text.trim() || !form.icon.trim()) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const payload = { text: form.text.trim(), icon: form.icon.trim() };
      const saved =
        form.id == null ? await createLabelType(payload) : await updateLabelType(form.id, payload);
      setLabels((current) =>
        form.id == null
          ? [...current, saved]
          : current.map((label) => (label.id === saved.id ? saved : label)),
      );
      setForm(null);
    } catch {
      setSaveError('Не удалось сохранить метку. Попробуйте ещё раз.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (isBusy || form?.id == null) return;
    setIsDeleting(true);
    setSaveError('');
    try {
      await deleteLabelType(form.id);
      setLabels((current) => current.filter((label) => label.id !== form.id));
      setForm(null);
    } catch {
      setSaveError('Не удалось удалить метку. Попробуйте ещё раз.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="mt-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold">Типы меток</h2>
        <button
          onClick={() => openForm()}
          disabled={isLoading || !!error}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60"
        >
          Добавить тип метки
        </button>
      </div>
      <div className="rounded-2xl bg-white px-5 py-2 shadow-sm">
        {isLoading ? (
          <p className="py-4 text-gray-500">Загрузка...</p>
        ) : error ? (
          <div role="alert" className="py-4 text-red-600">
            {error}{' '}
            <button onClick={loadLabels} className="underline">
              Повторить
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {labels.map((label) => (
              <li key={label.id} className="flex items-center gap-4 py-3">
                <span className="text-2xl">{label.icon}</span>
                <span className="min-w-0 flex-1 break-words">{label.text}</span>
                <button
                  onClick={() => openForm(label)}
                  className="text-sm font-semibold hover:underline"
                  aria-label={`Редактировать метку «${label.text}»`}
                >
                  Редактировать
                </button>
              </li>
            ))}
            {labels.length === 0 && <li className="py-4 text-gray-500">Нет типов меток</li>}
          </ul>
        )}
      </div>
      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (!isBusy) setForm(null);
          }}
        >
          <form
            onSubmit={save}
            role="dialog"
            aria-modal="true"
            aria-labelledby="label-form-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !isBusy) setForm(null);
            }}
            className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-lg"
          >
            <h3 id="label-form-title" className="text-base font-semibold">
              {form.id == null ? 'Добавить тип метки' : 'Редактировать тип метки'}
            </h3>
            <label className="mt-4 block text-sm font-semibold">
              Текст
              <input
                autoFocus
                required
                maxLength={200}
                value={form.text}
                disabled={isBusy}
                onChange={(event) => setForm({ ...form, text: event.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 font-normal"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Эмодзи
              <input
                required
                maxLength={32}
                value={form.icon}
                disabled={isBusy}
                placeholder="Например, 🔄"
                onChange={(event) => setForm({ ...form, icon: event.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 font-normal"
              />
            </label>
            <p className="mt-4 break-words text-gray-600">
              Предпросмотр: {form.icon} {form.text}
            </p>
            {saveError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {saveError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              {form.id != null && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={remove}
                  className="mr-auto rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                >
                  {isDeleting ? 'Удаление...' : 'Удалить'}
                </button>
              )}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setForm(null)}
                className="rounded-xl px-4 py-2 text-sm disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isBusy || !form.text.trim() || !form.icon.trim()}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export function validateProdoctor(workspace) {
  const errors = {};
  if (!workspace.name?.trim()) errors.name = 'Введите название кейса.';
  if ((workspace.photos?.length || 0) < 2) errors.photos = 'Добавьте минимум 2 фотографии.';
  if ((workspace.photos?.length || 0) > 6)
    errors.photos = 'В кейсе может быть не больше 6 фотографий.';
  if (Array.from((workspace.text || '').replace(/\s/gu, '')).length > 500)
    errors.text = 'Не больше 500 символов без пробелов.';
  const services = workspace.services || [];
  if (!services.length) errors.services = 'Добавьте хотя бы одну услугу.';
  if (services.length > 50) errors.services = 'Не больше 50 услуг.';
  services.forEach((service, index) => {
    if (!service.name.trim()) errors[`service-${index}`] = 'Введите название услуги.';
    if (
      service.quantity != null &&
      (!Number.isInteger(service.quantity) || service.quantity < 1 || service.quantity > 1000)
    ) {
      errors[`quantity-${index}`] = 'Целое число от 1 до 1000 или пустое поле.';
    }
  });
  return errors;
}

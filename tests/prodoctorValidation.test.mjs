import assert from 'node:assert/strict';
import test from 'node:test';
import { validateProdoctor } from '../src/utils/prodoctorValidation.js';
const state = {
  name: 'Кейс',
  photos: [{}, {}],
  text: '🦷 '.repeat(500),
  services: [{ name: 'Лечение', quantity: null }],
};
test('optional quantities and emoji at the limit are valid', () => {
  for (const quantity of [undefined, null, 1, 1000])
    assert.deepEqual(
      validateProdoctor({ ...state, services: [{ name: 'Лечение', quantity }] }),
      {},
    );
});
test('validation identifies each field rather than only a footer message', () => {
  const errors = validateProdoctor({
    name: ' ',
    photos: [{}],
    text: '🦷'.repeat(501),
    services: [{ name: ' ', quantity: 1.5 }],
  });
  assert.deepEqual(Object.keys(errors), ['name', 'photos', 'text', 'service-0', 'quantity-0']);
  assert.ok(validateProdoctor({ ...state, services: [] }).services);
});

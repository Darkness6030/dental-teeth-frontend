import test from 'node:test';
import assert from 'node:assert/strict';
import { sortSourceFiles, projectSeed } from '../src/utils/caseWorkflow.js';
import { rotatedSize, normalizeAngle } from '../src/utils/photoGeometry.js';

test('source chronology uses numeric filenames and never AI ordering', () => {
  const files = [{ name: 'кадр10.jpg' }, { name: 'кадр2.jpg' }, { name: 'кадр1.jpg' }];
  assert.deepEqual(
    sortSourceFiles(files).map((file) => file.name),
    ['кадр1.jpg', 'кадр2.jpg', 'кадр10.jpg'],
  );
  assert.equal(files[0].name, 'кадр10.jpg');
});
test('one patient case seeds independent fixed-format variants from shared originals', () => {
  const project = {
    id: 5,
    name: 'Лечение',
    doctor: 'Врач',
    description: '🦷 '.repeat(501),
    photos: [{ src: 'one' }, { src: 'two' }, { src: 'three' }],
  };
  const website = projectSeed(project, 'website'),
    pro = projectSeed(project, 'prodoctor');
  assert.equal(website.project_id, pro.project_id);
  assert.equal(website.before, 'one');
  assert.equal(website.after, 'three');
  assert.deepEqual(
    pro.photos.map((photo) => photo.stage),
    ['before', 'during', 'after'],
  );
  assert.equal(Array.from(pro.text.replace(/\s/gu, '')).length, 500);
  pro.photos[0].src = 'changed';
  assert.equal(project.photos[0].src, 'one');
});
test('90 degree rotations swap image bounds without squashing pixels', () => {
  assert.deepEqual(rotatedSize(1200, 800, 90), { width: 800, height: 1200 });
  assert.deepEqual(rotatedSize(1200, 800, 180), { width: 1200, height: 800 });
  assert.equal(normalizeAngle(270), -90);
  assert.equal(normalizeAngle(-270), 90);
});

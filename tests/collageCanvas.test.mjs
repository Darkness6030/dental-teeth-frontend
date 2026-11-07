import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

// Node has no font asset loader; the renderer itself needs no DOM or loaded font.
const source = (await readFile(new URL('../src/utils/collageCanvas.js', import.meta.url), 'utf8'))
  .replace(/import fontUrl from [^;]+;/, "const fontUrl = '';")
  .replace(
    "'./photoGeometry'",
    JSON.stringify(new URL('../src/utils/photoGeometry.js', import.meta.url).href),
  );
const { drawCollage, DEFAULT_EXPORT, photoRotation, collageThumbnail } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);
const photos = { before: { width: 640, height: 480 }, after: { width: 480, height: 640 } };
const matrices = {
  before: [
    [2, 0, 0],
    [0, 2, 0],
  ],
  after: [
    [2, 0, 100],
    [0, 2, -40],
  ],
};
const edits = {
  before: { zoom: 50, x: 80, y: -60, rotation: 25, brightness: 90 },
  after: { zoom: 140, x: -90, y: 100, rotation: -15, brightness: 110 },
};
function render(
  split,
  preview = true,
  photoMatrices = matrices,
  photoEdits = edits,
  selected = null,
) {
  const transforms = [],
    fills = [],
    strokes = [],
    clips = [];
  let path;
  const ctx = Object.fromEntries(
    [
      'save',
      'restore',
      'beginPath',
      'roundRect',
      'clip',
      'rect',
      'fill',
      'fillText',
      'moveTo',
      'lineTo',
      'closePath',
    ].map((name) => [name, () => {}]),
  );
  ctx.roundRect = (...args) => {
    path = args;
  };
  ctx.rect = (...args) => clips.push(args);
  ctx.stroke = () => strokes.push({ path, color: ctx.strokeStyle, width: ctx.lineWidth });
  for (const name of ['translate', 'scale', 'transform', 'drawImage'])
    ctx[name] = (...args) => transforms.push([name, ...args]);
  ctx.fillRect = (...args) => fills.push([ctx.fillStyle, ...args]);
  const canvas = { getContext: () => ctx };
  drawCollage(
    canvas,
    photos,
    photoMatrices,
    photoEdits,
    { ...DEFAULT_EXPORT, split },
    preview,
    selected,
  );
  return { transforms, fills, strokes, clips, size: [canvas.width, canvas.height] };
}

test('divider changes clipping without moving or scaling either photo', () => {
  const original = structuredClone(edits);
  const baseline = render(50).transforms;
  for (const split of [0, 10, 30, 75, 100, 50])
    assert.deepEqual(render(split).transforms, baseline);
  assert.deepEqual(edits, original);
});

test('preview and export preserve free offsets and 50% zoom over a white background', () => {
  const preview = render(30);
  assert.deepEqual(render(30, false), { ...preview, strokes: [] });
  assert.ok(preview.transforms.some(([name, x, y]) => name === 'scale' && x === 0.5 && y === 0.5));
  assert.ok(
    preview.transforms.some(
      ([name, x, y]) => name === 'translate' && x === 650 + 80 * 13 && y === 478 - 60 * 9.56,
    ),
  );
  assert.ok(preview.fills.every(([color]) => color === 'white'));
});

test('zero total tilt cancels automatic rotation in preview and export', () => {
  for (const degrees of [-18, 12]) {
    const angle = (degrees * Math.PI) / 180;
    const matrix = [
      [2 * Math.cos(angle), -2 * Math.sin(angle), 80],
      [2 * Math.sin(angle), 2 * Math.cos(angle), -30],
    ];
    assert.ok(Math.abs(photoRotation(matrix) - degrees) < 1e-10);
    const manualRotation = 0 - photoRotation(matrix);
    assert.ok(Math.abs(photoRotation(matrix, manualRotation)) < 1e-10);
    const photoEdits = Object.fromEntries(
      Object.entries(edits).map(([key, edit]) => [key, { ...edit, rotation: manualRotation }]),
    );
    const photoMatrices = { before: matrix, after: matrix };
    for (const preview of [true, false]) {
      const transforms = render(30, preview, photoMatrices, photoEdits).transforms.filter(
        ([name]) => name === 'transform',
      );
      for (const [, a, b, c, d] of transforms) {
        assert.ok(Math.abs(b) < 1e-10 && Math.abs(c) < 1e-10);
        assert.ok(Math.abs(a - 2) < 1e-10 && Math.abs(d - 2) < 1e-10);
      }
    }
  }
});

test('editor outline follows the rounded photo boundary and stays out of exports', () => {
  assert.deepEqual(render(50).strokes, [
    { path: [40, 78, 1300, 956, 100], color: '#bfc6d0', width: 2 },
  ]);
  assert.deepEqual(render(50, false).strokes, []);
});

test('selected outline is not clipped in half along the straight frame edges', () => {
  for (const [selected, clip] of [
    ['before', [0, 0, 690, 1112]],
    ['after', [690, 0, 698, 1112]],
  ]) {
    const result = render(50, true, matrices, edits, selected);
    assert.deepEqual(result.clips.at(-1), clip);
    assert.deepEqual(result.strokes.at(-1), {
      path: [40, 78, 1300, 956, 100],
      color: '#607fa8',
      width: 3,
    });
    assert.deepEqual(render(50, false, matrices, edits, selected).strokes, []);
  }
});
test('retina preview gains resolution while downloaded dimensions remain unchanged', () => {
  const previous = globalThis.window;
  try {
    globalThis.window = { devicePixelRatio: 2 };
    assert.deepEqual(render(50).size, [2560, Math.round((1112 * 2560) / 1388)]);
    assert.deepEqual(render(50, false).size, [1388, 1112]);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
test('saved previews retain 1024 pixels with high JPEG quality and do not upscale small sources', () => {
  const previous = globalThis.document;
  const canvas = {
    getContext: () => ({ drawImage() {} }),
    toDataURL: (type, quality) => {
      assert.equal(type, 'image/jpeg');
      assert.equal(quality, 0.92);
      return 'preview';
    },
  };
  try {
    globalThis.document = { createElement: () => canvas };
    assert.equal(collageThumbnail({ width: 1388, height: 1112 }), 'preview');
    assert.equal(canvas.width, 1024);
    assert.equal(canvas.height, Math.round((1112 * 1024) / 1388));
    collageThumbnail({ width: 100, height: 80 });
    assert.deepEqual([canvas.width, canvas.height], [100, 80]);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});

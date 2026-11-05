import assert from 'node:assert/strict';
import test from 'node:test';
import { zipImages } from '../src/utils/zipImages.js';

test('photo archive keeps all six files, UTF-8 names, order and bytes', async () => {
  const entries = Array.from({ length: 6 }, (_, i) => ({
    name: `Кейс-${i + 1}-${i < 3 ? 'before' : 'after'}.jpg`,
    blob: new Blob([new Uint8Array([255, 216, i, 255, 217])]),
  }));
  const archive = await zipImages(entries);
  const bytes = new Uint8Array(await archive.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let offset = 0;
  for (const entry of entries) {
    assert.equal(view.getUint32(offset, true), 0x04034b50);
    assert.equal(view.getUint16(offset + 6, true), 0x800);
    const nameLength = view.getUint16(offset + 26, true);
    const size = view.getUint32(offset + 18, true);
    assert.equal(
      new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength)),
      entry.name,
    );
    assert.deepEqual(
      bytes.slice(offset + 30 + nameLength, offset + 30 + nameLength + size),
      new Uint8Array(await entry.blob.arrayBuffer()),
    );
    offset += 30 + nameLength + size;
  }
  assert.equal(view.getUint16(bytes.length - 22 + 10, true), 6);
});

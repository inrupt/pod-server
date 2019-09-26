import { BlobTreeInMem } from '../../../src/lib/storage/BlobTreeInMem'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'

test('QuadAndBlobStore', async () => {
  const store = new QuadAndBlobStore(new BlobTreeInMem())
  store.getBlob(new URL('http://example.com/asdf'))
  await store.getQuadStream(new URL('http://example.com/asdf'))
})

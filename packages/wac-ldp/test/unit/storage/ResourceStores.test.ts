import { BlobTreeInMem } from '../../../src/lib/storage/BlobTreeInMem'
import { BlobTreeNssCompat } from '../../../src/lib/storage/BlobTreeNssCompat'
import { IRepresentation, IRepresentationMetadata, Conditions, IResourceIdentifier, IRepresentationPreferences } from 'solid-server-ts'
import { bufferToStream, streamToBuffer } from '../../../src/lib/rdf/ResourceDataUtils'
import rimraf = require('rimraf')

const stores = {
  'in-mem': new BlobTreeInMem(),
  'nss-compat': new BlobTreeNssCompat('./tmp-data/')
}

afterAll((done) => {
  rimraf('./tmp-data', done)
})

for (let [storeName, store] of Object.entries(stores)) {
  describe(storeName, () => {
    test('setRepresentation / getRepresentation', async () => {
      const metadata = {
        raw: [],
        contentType: 'text/plain',
        profiles: []
      } as IRepresentationMetadata
      const original = Buffer.from('hello body')
      const representation = {
        metadata,
        data: await bufferToStream(original),
        dataType: 'default'
      } as IRepresentation
      const conditions = {

      } as Conditions
      const resourceIdentifier = {
        domain: 'https://rdf.rocks',
        isAcl: false,
        path: 'yes/it.does'
      } as IResourceIdentifier
      await store.setRepresentation(resourceIdentifier, representation, conditions)
      const readBackRepresentation = await store.getRepresentation(resourceIdentifier, {} as IRepresentationPreferences, {} as Conditions)
      const readBack = await streamToBuffer(readBackRepresentation.data)
      expect(readBack).toEqual(original)
    })
  })
}

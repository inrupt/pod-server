import { BlobTreeNssCompat } from '../../../src/lib/storage/BlobTreeNssCompat'
import { BlobTree, Path } from '../../../src/lib/storage/BlobTree'
import { Blob } from '../../../src/lib/storage/Blob'
import { Container } from '../../../src/lib/storage/Container'
import { streamToBuffer, bufferToStream, RdfType, objectToStream, streamToObject, ResourceData, makeResourceData } from '../../../src/lib/rdf/ResourceDataUtils'
import rimraf = require('rimraf')

let storage: BlobTree // | undefined

const TEST_DATA_DIR = './please-delete-me-after-npm-test'

describe('BlobTreeNssCompat', () => {
  beforeEach(function () {
    // FIXME: find out how to set type restrictions on mocha-context variables
    storage = new BlobTreeNssCompat(TEST_DATA_DIR)
  })
  afterEach(function () {
    // storage = undefined
    return new Promise((resolve, reject) => {
      rimraf(TEST_DATA_DIR, (err => {
        if (err) {
          reject(err)
        }
        resolve()
      }))
    })
  })
  it('adds a blob', async function () {
    // non-existing blob
    const blob = storage.getBlob(new Path(['v1', 'michielbdejong.localhost:8080', 'foo'], false))
    expect(await blob.exists()).toEqual(false)

    const testData: ResourceData = {
      body: 'bar',
      contentType: 'text/plain',
      etag: 'etag-bar',
      rdfType: RdfType.Unknown
    }
    // put data into it
    await blob.setData(objectToStream(testData))

    expect(await blob.exists()).toEqual(true)
    const stream = await blob.getData()
    const readBack2 = await streamToObject(stream)
    expect(readBack2.body).toEqual(testData.body)
    expect(readBack2.contentType).toEqual(testData.contentType)
  })

  it('adds a container', async function () {
    // non-existing container
    const container = storage.getContainer(new Path(['v1', 'michielbdejong.localhost:8080', 'foo'], true))
    expect(await container.exists()).toEqual(false)

    // add a member
    const blob = storage.getBlob(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'bar'], false))
    const testData: ResourceData = {
      body: 'contents of foo/bar',
      contentType: 'text/plain',
      etag: 'etag-bar',
      rdfType: RdfType.Unknown
    }

    await blob.setData(objectToStream(testData))
    expect(await container.exists()).toEqual(true)

    const members = await container.getMembers()
    expect(members).toEqual([
      { name: 'bar', isContainer: false }
    ])
  })

  describe('after adding some data', () => {
    beforeEach(async () => {
      await storage.getBlob(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'bar'], false)).setData(objectToStream(makeResourceData('text/plain', 'I am foo/bar')))
      await storage.getBlob(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'baz', '1'], false)).setData(objectToStream(makeResourceData('text/plain', 'I am foo/baz/1')))
      await storage.getBlob(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'baz', '2'], false)).setData(objectToStream(makeResourceData('text/plain', 'I am foo/baz/2')))
    })

    it('correctly reports the container member listings', async function () {
      const containerFoo: Container = storage.getContainer(new Path(['v1', 'michielbdejong.localhost:8080', 'foo'], true))
      const containerBaz: Container = storage.getContainer(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'baz'], true))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).toEqual([
        { name: 'bar', isContainer: false },
        { name: 'baz', isContainer: true }
      ])
      const membersBaz = await containerBaz.getMembers()
      expect(membersBaz).toEqual([
        { name: '1', isContainer: false },
        { name: '2', isContainer: false }
      ])
    })

    it('correctly deletes blobs', async function () {
      const blobFooBar: Blob = storage.getBlob(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'bar'], false))
      const blobFooBaz1: Blob = storage.getBlob(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'baz', '1'], false))

      // delete foo/bar
      expect(await blobFooBar.exists()).toEqual(true)
      await blobFooBar.delete()
      expect(await blobFooBar.exists()).toEqual(false)

      // delete foo/baz/1
      expect(await blobFooBaz1.exists()).toEqual(true)
      await blobFooBaz1.delete()
      expect(await blobFooBaz1.exists()).toEqual(false)

      const containerFoo: Container = storage.getContainer(new Path(['v1', 'michielbdejong.localhost:8080', 'foo'], true))
      const containerBaz: Container = storage.getContainer(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'baz'], true))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).toEqual([
        { name: 'baz', isContainer: true }
      ])
      const membersBaz = await containerBaz.getMembers()
      expect(membersBaz).toEqual([
        { name: '2', isContainer: false }
      ])
    })

    it('correctly deletes containers', async function () {
      const containerFooBaz: Container = storage.getContainer(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'baz'], true))

      // delete /foo/baz/1
      const blobFooBaz1: Blob = storage.getBlob(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'baz', '1'], false))
      await blobFooBaz1.delete()
      // delete /foo/baz/2
      const blobFooBaz2: Blob = storage.getBlob(new Path(['v1', 'michielbdejong.localhost:8080', 'foo', 'baz', '2'], false))
      await blobFooBaz2.delete()

      // delete foo/baz/
      expect(await containerFooBaz.exists()).toEqual(true)
      await containerFooBaz.delete()
      expect(await containerFooBaz.exists()).toEqual(false)

      const containerFoo: Container = storage.getContainer(new Path(['v1', 'michielbdejong.localhost:8080', 'foo'], true))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).toEqual([
        { name: 'bar', isContainer: false }
      ])
    })
  })
})

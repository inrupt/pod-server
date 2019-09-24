import { BlobTreeInMem } from '../../../src/lib/storage/BlobTreeInMem'
import { BlobTree, Path } from '../../../src/lib/storage/BlobTree'
import { Blob } from '../../../src/lib/storage/Blob'
import { Container } from '../../../src/lib/storage/Container'
import { streamToBuffer, bufferToStream } from '../../../src/lib/rdf/ResourceDataUtils'

let storage: BlobTree // | undefined

describe('BlobTreeInMem', () => {
  beforeEach(function () {
    // FIXME: find out how to set type restrictions on mocha-context variables
    storage = new BlobTreeInMem()
  })
  afterEach(function () {
    // storage = undefined
  })
  it('adds a blob', async function () {
    // non-existing blob
    const blob = storage.getBlob(new Path(['v1', 'foo'], false))
    expect(await blob.exists()).toEqual(false)

    // put data into it
    await blob.setData(bufferToStream(Buffer.from('bar')))
    expect(await blob.exists()).toEqual(true)
    const stream = await blob.getData()
    const readBack2 = await streamToBuffer(stream)
    expect(readBack2.toString()).toEqual('bar')
  })

  it('adds a container', async function () {
    // non-existing container
    const container = storage.getContainer(new Path(['v1', 'foo'], true))
    expect(await container.exists()).toEqual(false)

    // add a member
    const blob = storage.getBlob(new Path(['v1', 'foo', 'bar'], false))
    await blob.setData(bufferToStream(Buffer.from('contents of foo/bar')))
    expect(await container.exists()).toEqual(true)

    const members = await container.getMembers()
    expect(members).toEqual([
      { name: 'bar', isContainer: false }
    ])
  })

  describe('after adding some data', () => {
    beforeEach(async () => {
      await storage.getBlob(new Path(['v1', 'foo', 'bar'], false)).setData(bufferToStream(Buffer.from('I am foo/bar')))
      await storage.getBlob(new Path(['v1', 'foo', 'baz', '1'], false)).setData(bufferToStream(Buffer.from('I am foo/baz/1')))
      await storage.getBlob(new Path(['v1', 'foo', 'baz', '2'], false)).setData(bufferToStream(Buffer.from('I am foo/baz/2')))
    })

    it('correctly reports the container member listings', async function () {
      const containerFoo: Container = storage.getContainer(new Path(['v1', 'foo'], true))
      const containerBaz: Container = storage.getContainer(new Path(['v1', 'foo', 'baz'], true))
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
      const blobFooBar: Blob = storage.getBlob(new Path(['v1', 'foo', 'bar'], false))
      const blobFooBaz1: Blob = storage.getBlob(new Path(['v1', 'foo', 'baz', '1'], false))

      // delete foo/bar
      expect(await blobFooBar.exists()).toEqual(true)
      await blobFooBar.delete()
      expect(await blobFooBar.exists()).toEqual(false)

      // delete foo/baz/1
      expect(await blobFooBaz1.exists()).toEqual(true)
      await blobFooBaz1.delete()
      expect(await blobFooBaz1.exists()).toEqual(false)

      const containerFoo: Container = storage.getContainer(new Path(['v1', 'foo'], true))
      const containerBaz: Container = storage.getContainer(new Path(['v1', 'foo', 'baz'], true))
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
      const containerFooBaz: Container = storage.getContainer(new Path(['v1', 'foo', 'baz'], true))

      // delete foo/baz/
      expect(await containerFooBaz.exists()).toEqual(true)
      await containerFooBaz.delete()
      expect(await containerFooBaz.exists()).toEqual(false)

      const containerFoo: Container = storage.getContainer(new Path(['v1', 'foo'], true))
      const membersFoo = await containerFoo.getMembers()
      expect(membersFoo).toEqual([
        { name: 'bar', isContainer: false }
      ])
      const membersBaz = await containerFooBaz.getMembers()
      expect(membersBaz).toEqual([])
    })
  })
})

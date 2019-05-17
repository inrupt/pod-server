import { streamToBuffer, bufferToStream } from '../../src/streams'
import { BlobTreeRedis } from '../../src/BlobTreeRedis'
import { Path } from 'wac-ldp'

test('set-then-get', async () => {
  const storage = new BlobTreeRedis()
  await storage.select(1)
  const blob = storage.getBlob(new Path(['root', 'foo', 'bar']))
  await blob.setData(bufferToStream(Buffer.from('yes')))
  const readBackStream = await blob.getData()
  const readBack = await streamToBuffer(readBackStream)
  expect(readBack.toString()).toEqual('yes')
  await storage.flushdb()
  await storage.stop()

})

test('add to parent recursively (mkdir -p)', async () => {
  const storage = new BlobTreeRedis()
  await storage.select(2)
  const blob = storage.getBlob(new Path(['root', 'foo', 'bar', 'baz']))
  await blob.setData(bufferToStream(Buffer.from('yes')))
  const container1 = storage.getContainer(new Path(['root', 'foo']))
  const members1 = await container1.getMembers()
  expect(members1).toEqual([
    { name: 'root/foo/bar', isContainer: true }
  ])
  const container2 = storage.getContainer(new Path(['root', 'foo', 'bar']))
  const members2 = await container2.getMembers()
  expect(members2).toEqual([
    { name: 'root/foo/bar/baz', isContainer: false }
  ])
  await storage.flushdb()
  await storage.stop()
})

test('remove from parent but not recursively', async () => {
  const storage = new BlobTreeRedis()
  await storage.select(3)
  const blob = storage.getBlob(new Path(['root', 'foo', 'bar', 'baz']))
  await blob.setData(bufferToStream(Buffer.from('yes')))
  await blob.delete()
  const container1 = storage.getContainer(new Path(['root', 'foo']))
  const members1 = await container1.getMembers()
  expect(members1).toEqual([
    { name: 'root/foo/bar', isContainer: true }
  ])
  const container2 = storage.getContainer(new Path(['root', 'foo', 'bar']))
  const members2 = await container2.getMembers()
  expect(members2).toEqual([ ])
  await storage.flushdb()
  await storage.stop()
})

test('exists', async () => {
  const storage = new BlobTreeRedis()
  await storage.select(4)
  const blob = storage.getBlob(new Path(['root', 'foo', 'bar', 'baz']))
  const container1 = storage.getContainer(new Path(['root', 'foo']))
  const container2 = storage.getContainer(new Path(['root', 'foo', 'bar']))
  expect(await container1.exists()).toEqual(false)
  expect(await container2.exists()).toEqual(false)
  expect(await blob.exists()).toEqual(false)
  await blob.setData(bufferToStream(Buffer.from('yes')))
  expect(await container1.exists()).toEqual(true)
  expect(await container2.exists()).toEqual(true)
  expect(await blob.exists()).toEqual(true)
  await blob.delete()
  expect(await container1.exists()).toEqual(true)
  // FIXME: https://stackoverflow.com/questions/21283042/keep-empty-data-keys-in-redis
  // See also https://github.com/solid/solid-spec/issues/173
  // expect(await container2.exists()).toEqual(true)
  expect(await blob.exists()).toEqual(false)
  await storage.flushdb()
  await storage.stop()
})

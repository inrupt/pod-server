import { streamToBuffer, bufferToStream } from '../../src/streams'
import { BlobTreeRedis } from '../../src/BlobTreeRedis'
import { Path } from 'wac-ldp'

test('set-then-get', async () => {
  const storage = new BlobTreeRedis()
  const blob = storage.getBlob(new Path(['root', 'foo', 'bar']))
  await blob.setData(bufferToStream(Buffer.from('yes')))
  const readBackStream = await blob.getData()
  const readBack = await streamToBuffer(readBackStream)
  expect(readBack.toString()).toEqual('yes')
  await storage.stop()
})

test('add to container', async () => {
  const storage = new BlobTreeRedis()
  const blob = storage.getBlob(new Path(['root', 'foo', 'bar']))
  await blob.setData(bufferToStream(Buffer.from('yes')))
  const container = storage.getContainer(new Path(['root', 'foo']))
  const members = await container.getMembers()
  expect(members).toEqual([
    { name: 'root/foo/bar', isContainer: false }
  ])
  await storage.stop()
})

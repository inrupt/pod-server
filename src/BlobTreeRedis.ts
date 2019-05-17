import * as redis from 'redis'
import { BlobTree, Path } from 'wac-ldp'
import { Blob } from 'wac-ldp/src/lib/storage/Blob'
import { Container, Member } from 'wac-ldp/src/lib/storage/Container'
import { EventEmitter } from 'events'
import { promisify } from 'util'
import { streamToBuffer, bufferToStream } from './streams'

class BlobRedis implements Blob {
  path: Path
  client: any
  watched: boolean
  constructor (path: Path, client: any) {
    this.path = path
    this.client = client
    this.watched = false
  }
  async checkWatch () {
    if (this.watched) {
      return
    }
    await this.client.watch(this.path.toString())
    this.watched = true
  }
  async exists () {
    await this.checkWatch()
    const ret = await this.client.exists(this.path.toString())
    return (ret === '1')
  }
  async getData () {
    await this.checkWatch()
    const ret = await this.client.get(this.path.toString())
    return bufferToStream(Buffer.from(ret))
  }
  async setData (stream: ReadableStream) {
    const value: Buffer = await streamToBuffer(stream)
    await this.client.multi()
    await this.client.set(this.path.toString(), value.toString())
    const parentPath = this.path.toParent().toString()
    await this.client.hset(parentPath, this.path.toString(), 'yes')
    // This watch..multi..exec transaction guarantees two things:
    // 1) the blob wasn't deleted by a different thread inbetween our
    // `set` call for the blob and our `hset` call for the container.
    // 2) the contents of the blob didn't change in between any previous
    // `getData` or `exists` calls on this blob, and our execution of
    // `setData` here.
    // See https://redis.io/topics/transactions for more details,
    // specifically the 'Optimistic locking using check-and-set' section.
    await this.client.exec()
  }
  async delete () {
    await this.checkWatch()
    return void this.client.del(this.path.toString())
  }
}

class ContainerRedis implements Container {
  path: Path
  client: any
  constructor (path: Path, client: any) {
    this.path = path
    this.client = client
  }
  async exists () {
    const ret = await this.client.exists(this.path.toString())
    return (ret === '1')
  }
  async getMembers () {
    const members = await this.client.hkeys(this.path.toString())
    return members.map((a: any) => {
      return {
        name: a,
        isContainer: false
      } as Member
    })
  }
  delete () {
    return this.client.del(this.path.toString())
  }
}

export class BlobTreeRedis extends EventEmitter implements BlobTree {
  callbacksClient: any
  client: any
  constructor () {
    super()
    this.callbacksClient = redis.createClient()
    this.client = {
      get: promisify(this.callbacksClient.get).bind(this.callbacksClient),
      set: promisify(this.callbacksClient.set).bind(this.callbacksClient),
      del: promisify(this.callbacksClient.DEL).bind(this.callbacksClient) as unknown as (path: string) => Promise<void>,
      exists: promisify(this.callbacksClient.get).bind(this.callbacksClient),
      hkeys: promisify(this.callbacksClient.hkeys).bind(this.callbacksClient),
      hset: promisify(this.callbacksClient.hset).bind(this.callbacksClient),
      quit: promisify(this.callbacksClient.quit).bind(this.callbacksClient),
      watch: promisify(this.callbacksClient.watch).bind(this.callbacksClient),
      multi: promisify(this.callbacksClient.multi).bind(this.callbacksClient),
      exec: promisify(this.callbacksClient.exec).bind(this.callbacksClient)
    }
  }
  stop () {
    return this.client.quit()
  }
  getBlob (path: Path): Blob {
    const ret: Blob = new BlobRedis(path, this.client)
    return ret
  }
  getContainer (path: Path): Container {
    const ret: Container = new ContainerRedis(path, this.client)
    return ret
  }
}

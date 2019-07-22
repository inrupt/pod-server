import * as redis from 'redis'
import Debug from 'debug'
import { BlobTree, Path } from 'wac-ldp'
import { Blob } from 'wac-ldp/src/lib/storage/Blob'
import { Container, Member } from 'wac-ldp/src/lib/storage/Container'
import { EventEmitter } from 'events'
import { promisify } from 'util'
import { streamToBuffer, bufferToStream } from './streams'

const debug = Debug('BlobTreeRedis')

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
    return (ret === 1)
  }
  async getData () {
    await this.checkWatch()
    const ret = await this.client.get(this.path.toString())
    debug('got data from redis', this.path.toString(), ret)
    if (ret) {
      return bufferToStream(Buffer.from(ret))
    } else {
      return ret
    }
  }
  async setData (stream: ReadableStream) {
    await this.checkWatch() // to support optimistic locking for setData-then-delete
    const value: Buffer = await streamToBuffer(stream)

    // this.client.set(this.path.toString(), value.toString())

    const multi = this.client.multi()
    // method calls on the multi object are synchronous
    // except for multi.exec, which is asynchronous again.
    debug('setting resource itself', this.path.toString())
    multi.set(this.path.toString(), value.toString())
    // mkdir -p:
    let childPath = this.path
    let parentPath
    let isContainer = 'false'
    do {
      parentPath = childPath.toParent()
      debug('adding to ancestor', parentPath.toString(), childPath.toName(), isContainer)
      multi.hset(parentPath.toString(), childPath.toName(), isContainer)
      isContainer = 'true'
      childPath = parentPath
    } while (!parentPath.isRoot())
    // This watch..multi..exec transaction guarantees two things:
    // 1) the blob wasn't deleted by a different thread inbetween our
    // `set` call for the blob and our `hset` call for the container.
    // 2) the contents of the blob didn't change in between any previous
    // `getData` or `exists` calls on this blob, and our execution of
    // `setData` here.
    // See https://redis.io/topics/transactions for more details,
    // specifically the 'Optimistic locking using check-and-set' section.
    await multi.exec()
  }
  async delete () {
    await this.checkWatch() // to support optimistic locking for delete-then-setData
    const multi = this.client.multi()
    // method calls on the multi object are synchronous
    // except for multi.exec, which is asynchronous again.
    debug('deleting resource itself', this.path.toString())
    multi.del(this.path.toString())
    const parentPath = this.path.toParent().toString()
    debug('deleting member from parent', parentPath.toString(), this.path.toName())
    multi.hdel(parentPath, this.path.toName())
    // See https://redis.io/topics/transactions for more details,
    // specifically the 'Optimistic locking using check-and-set' section.
    await multi.exec()

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
    return (ret === 1)
  }
  async getMembers () {
    const membersObj = await this.client.hgetall(this.path.toString())
    const members = []
    for (let k in membersObj) {
      members.push({ name: k, isContainer: (membersObj[k] === 'true') } as Member)
    }
    return members
  }
  delete () {
    return this.client.del(this.path.toString())
  }
}

function promisifyRedisClient (callbacksClient: any) {
  return {
    select: callbacksClient.select.bind(callbacksClient),
    flushdb: callbacksClient.flushdb.bind(callbacksClient),
    get: promisify(callbacksClient.get).bind(callbacksClient),
    set: promisify(callbacksClient.set).bind(callbacksClient),
    del: promisify(callbacksClient.DEL).bind(callbacksClient) as unknown as (path: string) => Promise<void>,
    exists: promisify(callbacksClient.exists).bind(callbacksClient),
    hgetall: promisify(callbacksClient.hgetall).bind(callbacksClient),
    hset: promisify(callbacksClient.hset).bind(callbacksClient),
    quit: promisify(callbacksClient.quit).bind(callbacksClient),
    watch: promisify(callbacksClient.watch).bind(callbacksClient),
    multi: callbacksClient.multi.bind(callbacksClient),
    exec: promisify(callbacksClient.exec).bind(callbacksClient)
  }
}
export class BlobTreeRedis extends EventEmitter implements BlobTree {
  callbacksClient: any
  client: any
  constructor (redisUrl?: string) {
    super()
    this.callbacksClient = (redisUrl ? redis.createClient(redisUrl) : redis.createClient())
    this.client = promisifyRedisClient(this.callbacksClient)
  }
  select (dbIndex: number) {
    return this.client.select(dbIndex)
  }
  flushdb () {
    return this.client.flushdb()
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

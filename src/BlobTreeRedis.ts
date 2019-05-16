import * as redis from 'redis'
import { BlobTree, Path } from 'wac-ldp'
import { Blob } from 'wac-ldp/src/lib/storage/Blob'
import { Container, Member } from 'wac-ldp/src/lib/storage/Container'
import { EventEmitter } from 'events'
import { promisify } from 'util'

const callbacksClient = redis.createClient()
const client = {
  get: promisify(callbacksClient.get).bind(callbacksClient),
  set: promisify(callbacksClient.set).bind(callbacksClient),
  del: promisify(callbacksClient.DEL).bind(callbacksClient),
  exists: promisify(callbacksClient.get).bind(callbacksClient),
  hkeys: promisify(callbacksClient.HKEYS).bind(callbacksClient)
}

class BlobRedis implements Blob {
  path: string
  constructor (pathStr: string) {
    this.path = pathStr
  }
  async exists () {
    const ret = await client.exists(this.path)
    return (ret === '1')
  }
  async getData () {
    const ret = await client.get(this.path)
    return bufferToStream(Buffer.from(ret))
  }
  async setData (value: any) {
    return void client.set(this.path, value)
  }
  delete () {
    return void client.del(this.path)
  }
}

class ContainerRedis implements Container {
  path: string
  constructor (pathStr: string) {
    this.path = pathStr
  }
  async exists () {
    const ret = await client.exists(this.path)
    return (ret === '1')
  }
  async getMembers () {
    const members = await client.hkeys(this.path)
    return members.map(a => {
      return {
        name: a,
        isContainer: false
      } as Member
    })
  }
  delete () {
    return client.del(this.path)
  }
}

export class BlobTreeRedis extends EventEmitter implements BlobTree {
  getBlob (path: Path): Blob {
    const ret: Blob = new BlobRedis(path.toString())
    return ret
  }
  getContainer (path: Path): Container {
    const ret: Container = new ContainerRedis(path.toString())
    return ret
  }
}

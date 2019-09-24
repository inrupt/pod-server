// Modified code from https://github.com/panva/node-oidc-provider/blob/master/example/adapters/redis.js

import { Adapter } from 'oidc-provider'
import path from 'path'
import fs from 'mz/fs'
import { DefaultConfigurationConfigs } from '../../defaultConfiguration'

const consumable = new Set([
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode'
])

function grantKeyFor (id: string) {
  return `grant:${id}`
}

function sessionUidKeyFor (id: string) {
  return `sessionUid:${id}`
}

function userCodeKeyFor (userCode: string) {
  return `userCode:${userCode}`
}

interface Store {
  _ex?: number,
  payload: any
}

export default async function getFilesystemAdapater (config: DefaultConfigurationConfigs) {
  await Promise.all([
    fs.mkdir(path.join(config.storageData.folder, './oidc/openid'), { recursive: true })
  ])

  return class FilesystemAdapter implements Adapter {
    name: string

    constructor (name: string) {
      this.name = name
    }

    filename (id: string) {
      return path.join(config.storageData.folder, './oidc/openid', `./_key_${encodeURIComponent(id)}.json`)
    }

    async set (id: string, payload: any, expiresIn?: number): Promise<void> {
      const data: Store = {
        payload
      }
      if (expiresIn) {
        data._ex = new Date().getTime() + expiresIn * 1000
      }
      await fs.writeFile(this.filename(id), JSON.stringify(data))
    }

    async get (id: string): Promise<any> {
      try {
        const data: Store = JSON.parse((await fs.readFile(this.filename(id))).toString())
        if (data._ex && data._ex < new Date().getTime()) {
          await this.delete(id)
          return undefined
        }
        return data.payload
      } catch (err) {
        return undefined
      }
    }

    async delete (id: string): Promise<void> {
      await fs.unlink(this.filename(id))
    }

    key (id: string) {
      return `${this.name}:${id}`
    }

    async destroy (id: string) {
      const key = this.key(id)
      await this.delete(key)
    }

    async consume (id: string) {
      const item = (await this.get(this.key(id)))
      item.consumed = new Date().getTime()
      await this.set(this.key(id), item)
    }

    async find (id: string) {
      return this.get(this.key(id))
    }

    async findByUid (uid: string) {
      const id = await this.get(sessionUidKeyFor(uid))
      return this.find(id)
    }

    async findByUserCode (userCode: string) {
      const id = await this.get(userCodeKeyFor(userCode))
      return this.find(id)
    }

    async upsert (id: string, payload: any, expiresIn: number) {
      const key = this.key(id)

      if (this.name === 'Session') {
        await this.set(sessionUidKeyFor(payload.uid), id, expiresIn)
      }

      const { grantId, userCode } = payload
      if (grantId) {
        const grantKey = grantKeyFor(grantId)
        const grant = await this.get(grantKey)
        if (!grant) {
          await this.set(grantKey, [ key ])
        } else {
          await this.set(grantKey, [ ...grant, key ])
        }
      }

      if (userCode) {
        await this.set(userCodeKeyFor(userCode), id, expiresIn)
      }

      await this.set(key, payload, expiresIn)
    }

    async revokeByGrantId (grantId: string) { // eslint-disable-line class-methods-use-this
      const grantKey = grantKeyFor(grantId)
      const grant = (await this.get(grantKey)) as string[]
      if (grant) {
        grant.forEach(async (token) => this.delete(token))
        await this.delete(grantKey)
      }
    }
  }
}

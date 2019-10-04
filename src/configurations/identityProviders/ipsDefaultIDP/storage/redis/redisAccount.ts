// Modified code from https://github.com/panva/node-oidc-provider-example/blob/43436a969a7bd589fea7e8ba83caa3fd4bc61854/03-oidc-views-accounts/account.js

import assert from 'assert'
import _ from 'lodash'
import Redis from 'ioredis'
import bcrypt from 'bcryptjs'
import uuid from 'uuid'
import { Context } from 'koa'
import { DefaultAccountAdapter, DefaultConfigurationConfigs } from '../../defaultConfiguration'
import DefaultConfigAccount from '../../account'

const REDIS_URL = process.env.REDIS_URL || ''
const SALT_ROUNDS = 10

export default function getRedisAccount (config: DefaultConfigurationConfigs) {

  const client: Redis.Redis = new Redis(config.storageData.redisUrl, { keyPrefix: 'user' })

  return class RedisAccount implements DefaultAccountAdapter {

    async authenticate (username: string, password: string) {
      assert(password, 'Password must be provided')
      assert(username, 'Username must be provided')
      const lowercased = String(username).toLowerCase()
      const user = JSON.parse(await client.get(this.key(username)))
      assert(user, 'User does not exist')
      assert(await bcrypt.compare(password, user.password), 'Incorrect Password')
      return new DefaultConfigAccount(user.webID)
    }

    async create (email: string, password: string, username: string, webID: string): Promise<void> {
      const curUser = await client.get(this.key(username))
      assert(!curUser, 'User already exists.')
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
      await client.set(this.key(username), JSON.stringify({
        username,
        webID,
        email,
        password: hashedPassword
      }))
    }

    async changePassword (username: string, password: string): Promise<void> {
      const user = JSON.parse(await client.get(this.key(username)))
      user.password = await bcrypt.hash(password, SALT_ROUNDS)
      await client.set(this.key(username), JSON.stringify(user))
    }

    key (name: string): string {
      return `user:${name}`
    }

    async generateForgotPassword (username: string): Promise<{ email: string, uuid: string }> {
      const user = JSON.parse(await client.get(this.key(username)))
      assert(user, 'The username does not exist.')
      const forgotPasswordUUID = uuid.v4()
      await client.set(this.forgotPasswordKey(forgotPasswordUUID), username, 'EX', 60 * 60 * 24)
      return {
        email: user.email,
        uuid: forgotPasswordUUID
      }
    }

    async getForgotPassword (uuid: string): Promise<string> {
      return client.get(this.forgotPasswordKey(uuid))
    }

    async deleteForgotPassword (uuid: string): Promise<void> {
      await client.del(this.forgotPasswordKey(uuid))
    }

    forgotPasswordKey (name: string) {
      return `forgotPassword:${name}`
    }
  }
}

// Modified code from https://github.com/panva/node-oidc-provider-example/blob/43436a969a7bd589fea7e8ba83caa3fd4bc61854/03-oidc-views-accounts/account.js

import assert from 'assert'
import _ from 'lodash'
import bcrypt from 'bcryptjs'
import uuid from 'uuid'
import path from 'path'
import fs from 'mz/fs'
import { DefaultAccountAdapter, DefaultConfigurationConfigs } from '../../defaultConfiguration'
import DefaultConfigAccount from '../../account'

const SALT_ROUNDS = 10

export default async function getFilesystemAccount (config: DefaultConfigurationConfigs) {
  await Promise.all([
    fs.mkdir(path.join(config.storageData.folder, './oidc/users/users'), { recursive: true }),
    fs.mkdir(path.join(config.storageData.folder, './oidc/users/users-by-email'), { recursive: true }),
    fs.mkdir(path.join(config.storageData.folder, './oidc/users/forgot-password'), { recursive: true })
  ])

  return class FilesystemAccount implements DefaultAccountAdapter {

    async authenticate (username: string, password: string) {
      assert(password, 'Password must be provided')
      assert(username, 'Username must be provided')
      const user = await this.getUser(username)
      assert(user, 'User does not exist')
      assert(await bcrypt.compare(password, user.hashedPassword), 'Incorrect Password')
      return new DefaultConfigAccount(user.webId)
    }

    async create (email: string, password: string, username: string, webID: string): Promise<void> {
      assert(!await fs.exists(this.userLocation(webID)), 'User already exists.')
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

      await fs.writeFile(this.userLocation(webID), JSON.stringify({
        username,
        webId: webID,
        email,
        externalWebId: '',
        hashedPassword
      }), { flag: 'w' })
      await fs.writeFile(this.userByEmailLocation(email), JSON.stringify({
        id: this.userFileName(webID)
      }), { flag: 'w' })
    }

    async changePassword (username: string, password: string): Promise<void> {
      const webID = await config.webIdFromUsername(username)
      const user = await this.getUser(username)
      user.hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
      await fs.writeFile(this.userLocation(webID), JSON.stringify(user), { flag: 'w' })
    }

    userLocation (webID: string): string {
      return path.join(
        config.storageData.folder,
        './oidc/users/users',
        `./_key_${this.userFileName(webID)}.json`
      )
    }
    userFileName (webID: string) {
      const webIDUrl = new URL(webID)
      return encodeURIComponent(`${webIDUrl.host}${webIDUrl.pathname}${webIDUrl.hash}`)
    }
    userByEmailLocation (email: string): string {
      return path.join(
        config.storageData.folder,
        './oidc/users/users-by-email',
        `./_key_${
          encodeURIComponent(email)
        }.json`
      )
    }
    forgotPasswordLocation (name: string) {
      return path.join(
        config.storageData.folder,
        './oidc/users/forgot-password',
        `./_key_${name}.json`
      )
    }

    async getUser (username: string) {
      const webID = await config.webIdFromUsername(username)
      try {
        return JSON.parse((await fs.readFile(this.userLocation(webID))).toString())
      } catch (err) {
        return undefined
      }
    }

    async generateForgotPassword (username: string): Promise<{ email: string, uuid: string }> {
      const user = await this.getUser(username)
      assert(user, 'The username does not exist.')
      const forgotPasswordUUID = uuid.v4()
      await fs.writeFile(this.forgotPasswordLocation(forgotPasswordUUID), JSON.stringify({
        username,
        ex: new Date().getTime() + (1000 * 60 * 60 * 24)
      }), { flag: 'w' })
      return {
        email: user.email,
        uuid: forgotPasswordUUID
      }
    }

    async getForgotPassword (uuid: string): Promise<string> {
      try {
        const forgotPasswordInfo = JSON.parse((await fs.readFile(this.forgotPasswordLocation(uuid))).toString())
        if (!forgotPasswordInfo || forgotPasswordInfo.ex < new Date().getTime()) {
          // @ts-ignore
          return undefined
        }
        return forgotPasswordInfo.username
      } catch (err) {
        // @ts-ignore
        return undefined
      }
    }

    async deleteForgotPassword (uuid: string): Promise<void> {
      await fs.unlink(this.forgotPasswordLocation(uuid))
    }
  }
}

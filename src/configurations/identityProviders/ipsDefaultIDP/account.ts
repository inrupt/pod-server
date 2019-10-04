// Modified code from https://github.com/panva/node-oidc-provider-example/blob/43436a969a7bd589fea7e8ba83caa3fd4bc61854/03-oidc-views-accounts/account.js

import _ from 'lodash'
import { Context } from 'koa'
import { Account } from 'oidc-provider'

export default class DefaultConfigAccount implements Account {
  accountId: string

  constructor (id: string) {
    this.accountId = id
  }

  async claims () {
    return {
      sub: this.accountId
    }
  }

  static async findById (ctx: Context, sub: string) {
    return new DefaultConfigAccount(sub)
  }
}

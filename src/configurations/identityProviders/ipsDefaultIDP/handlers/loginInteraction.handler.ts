import Provider from '../../core/SolidIdp'
import assert from 'assert'
import Router from 'koa-router'
import { Context } from 'koa'
import { InteractionResult } from 'oidc-provider'
import { DefaultConfigurationConfigs, DefaultAccountAdapter } from '../defaultConfiguration'

export default function loginInteractionHandler (oidc: Provider, config: DefaultConfigurationConfigs): Router {
  const router = new Router<any, Context>()
  const accountAdapter = new config.storage.accountAdapter()

  router.get(`/login`, async (ctx, next) => {
    return ctx.render('login', {
      errorMessage: '',
      prefilled: {}
    })
  })

  router.post(`/login`, async (ctx, next) => {
    try {
      assert(ctx.request.body.username, 'Username is required')
      assert(ctx.request.body.password, 'Password is required')
      return await login(ctx.request.body.username, ctx.request.body.password, ctx, oidc, accountAdapter)
    } catch (err) {
      return ctx.render('login', {
        errorMessage: err.message,
        prefilled: {
          username: ctx.request.body.username
        }
      })
    }
  })

  return router
}

export async function login (username: string, password: string, ctx: Context, oidc: Provider, accountAdapter: DefaultAccountAdapter) {
  const account = await accountAdapter.authenticate(username, password)

  return getTokenAndLogin(account.accountId, ctx, oidc)
}

export async function getTokenAndLogin (accountId: string, ctx: Context, oidc: Provider) {
  const result: InteractionResult = {
    login: {
      account: accountId,
      remember: !!ctx.request.body.remember,
      ts: Math.floor(Date.now() / 1000)
    },
    consent: {
      rejectedScopes: ctx.request.body.remember ? [] : ['offline_access']
    }
  }

  return oidc.interactionFinished(ctx.req, ctx.res, result)
}

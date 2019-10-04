import Provider from '../../core/SolidIdp'
import Router from 'koa-router'
import { getTokenAndLogin } from './loginInteraction.handler'
import { Context } from 'koa'

export default function confirmInteractionHandler (oidc: Provider): Router {
  const router = new Router<any, Context>()

  router.get(`/confirm`, async (ctx, next) => {
    return ctx.render('confirm', ctx.state.details)
  })

  router.post(`/confirm`, async (ctx, next) => {
    return getTokenAndLogin(ctx.state.details.session.accountId, ctx, oidc)
  })

  return router
}

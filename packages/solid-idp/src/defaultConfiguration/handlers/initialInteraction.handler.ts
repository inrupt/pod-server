import Provider from '../../core/SolidIdp'
import Router from 'koa-router'

export default function initialInteractionHandler (oidc: Provider): Router {
  const router = new Router()

  router.get('/', async (ctx) => {
    const details = ctx.state.details
    const view = (() => {
      switch (details.prompt.name) {
        case 'consent':
          return 'confirm'
        default:
          return 'login'
      }
    })()

    return ctx.render(view, {
      details,
      errorMessage: '',
      prefilled: {}
    })
  })

  return router
}

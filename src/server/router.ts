import Router, { IRouterParamContext } from 'koa-router'
import { PodServerManditoryOptionsConfiguration } from '../types/configuration.types';
import { Context, ParameterizedContext } from 'koa';

// TODO: this whole file will be changed once routing configuration is enabled. But for now, we hard code the subdomain routing strategy

function getSubdomainRouter(config: PodServerManditoryOptionsConfiguration): Router {
  const router = new Router()
  router.get('/', (ctx) => {
    console.log('Subdomain')
    ctx.res.end()
  })
  return router
}

function getRootRouter(config: PodServerManditoryOptionsConfiguration): Router {
  const router = new Router()
  router.get('/', (ctx) => {
    console.log('root')
    ctx.res.end()
  })
  return router
}

export default function getPodServerRouter(config: PodServerManditoryOptionsConfiguration): Router {
  // const passIfSubdomain = async (shouldPass: boolean, ctx: ParameterizedContext<any, IRouterParamContext>, next: () => Promise<any>, givenRouter: Router): Promise<any> => {
  //   console.log('getting called')
  //   if ((ctx.origin !== config.network.url.origin) === (shouldPass)) {
  //     await givenRouter.routes()(ctx, async () => {
  //       await givenRouter.allowedMethods()(ctx, next)
  //     })
  //   }
  //   await next()
  // }

  const router = new Router()
  // const subdomainRouter = getSubdomainRouter(config)
  // const rootRouter = getRootRouter(config)

  router.use('/', async (ctx, next) => {
    console.log('beep boop')
    await next()
  })
  // router.use(async (ctx, next) => await passIfSubdomain(true, ctx, next, subdomainRouter))
  // router.use(async (ctx, next) => await passIfSubdomain(false, ctx, next, rootRouter))

  return router
}


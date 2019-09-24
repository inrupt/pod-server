// Modified code from https://github.com/panva/node-oidc-provider-example/blob/43436a969a7bd589fea7e8ba83caa3fd4bc61854/03-oidc-views-accounts/index.js

import logger from 'debug'
import path from 'path'
import Router from 'koa-router'
import views from 'koa-views'
import bodyParser from 'koa-body'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import Provider from '../core/SolidIdp'
import confirmInteractionHandler from './handlers/confirmInteraction.handler'
import initialInteractionHandler from './handlers/initialInteraction.handler'
import loginInteractionHandler from './handlers/loginInteraction.handler'
import forgotPasswordInteractionHandler from './handlers/forgotPasswordInteraction.handler'
import registerInteractionHandler from './handlers/registerInteraction.handler'
import resetPasswordHandler from './handlers/resetPassword.handler'
import { Adapter, Account } from 'oidc-provider'
import DefaultConfigAccount from './account'
import getFilesystemAdapater from './storage/filesystem/filesystemAdapter'
import getRedisAdapter from './storage/redis/redisAdapter'
import getRedisAccount from './storage/redis/redisAccount'
import getFilesystemAccount from './storage/filesystem/filesystemAccount'
import { Middleware, ParameterizedContext } from 'koa'

const debug = logger('defaultConfiguration')

/**
 * Types ================================================
 */

export interface DefaultAccountAdapter {
  authenticate (username: string, password: string): Promise<Account>
  create (email: string, password: string, username: string, webID: string): Promise<void>
  changePassword (username: string, password: string): Promise<void>
  generateForgotPassword (username: string): Promise<{ email: string, uuid: string }>
  getForgotPassword (uuid: string): Promise<string>
  deleteForgotPassword (uuid: string): Promise<void>
}

export interface SolidIDPStorage {
  sessionAdapter: new (name: string, config?: DefaultConfigurationConfigs) => Adapter
  accountAdapter: new (config?: DefaultConfigurationConfigs) => DefaultAccountAdapter
}

export interface SolidIDPStorage {

}

export interface DefaultConfigurationConfigs {
  keystore: any
  issuer: string
  pathPrefix?: string
  mailConfiguration?: SMTPTransport.Options
  webIdFromUsername: (username: string) => Promise<string>
  onNewUser: (username: string) => Promise<string>
  storagePreset?: 'redis' | 'filesystem'
  storage?: SolidIDPStorage,
  storageData?: any
}

export interface InternalConfigs {
  keystore: any
  issuer: string
  pathPrefix: string
  mailConfiguration?: SMTPTransport.Options
  webIdFromUsername: (username: string) => Promise<string>
  onNewUser: (username: string) => Promise<string>
  storage: SolidIDPStorage,
  storageData?: any
}

/**
 * ================================================
 */

const handlers: ((oidc: Provider, config: InternalConfigs) => Router)[] = [
  initialInteractionHandler,
  confirmInteractionHandler,
  loginInteractionHandler,
  forgotPasswordInteractionHandler,
  registerInteractionHandler
]

const getStorage = async (config: DefaultConfigurationConfigs): Promise<SolidIDPStorage> => {
  let storage;
  if (config.storagePreset) {
    switch (config.storagePreset) {
      case 'redis':
        storage = {
          sessionAdapter: getRedisAdapter(config),
          accountAdapter: getRedisAccount(config)
        }
        break
      case 'filesystem':
      default:
        storage = {
          sessionAdapter: await getFilesystemAdapater(config),
          accountAdapter: await getFilesystemAccount(config)
        }
    }
    return storage
  }
  if (config.storage) {
    return config.storage
  }
  throw new Error('Storage not provided')
}

export default async function defaultConfiguration (config: DefaultConfigurationConfigs) {
  const internalConfigs: InternalConfigs = {
    ...config,
    pathPrefix: config.pathPrefix || '',
    storage: await getStorage(config),
  }

  const oidc = new Provider(config.issuer, {
    // @ts-ignore
    adapter: config.storage.sessionAdapter,
    findAccount: DefaultConfigAccount.findById,
    jwks: config.keystore,
    claims: {
      openid: ['sub'],
      email: ['email', 'email_verified']
    },
    interactions: {
      url: async (ctx) => {
        return `${internalConfigs.pathPrefix}/interaction/${ctx.oidc.uid}`
      }
    },
    formats: {
      AccessToken: 'jwt',
      // Manually setting default because default setting is disabled when running tests
      default: 'opaque'
    },
    features: {
      devInteractions: { enabled: false },
      dangerouslyEnableLocalhost: new URL(config.issuer).protocol !== 'https:'
    },
    routes: {
      authorization: `${internalConfigs.pathPrefix}/auth`,
      jwks: `${internalConfigs.pathPrefix}/certs`,
      check_session: `${internalConfigs.pathPrefix}/session/check`,
      device_authorization: `${internalConfigs.pathPrefix}/device/auth`,
      end_session: `${internalConfigs.pathPrefix}/session/end`,
      introspection: `${internalConfigs.pathPrefix}/token/introspection`,
      registration: `${internalConfigs.pathPrefix}/reg`,
      revocation: `${internalConfigs.pathPrefix}/token/revocation`,
      token: `${internalConfigs.pathPrefix}/token`,
      userinfo: `${internalConfigs.pathPrefix}/me`,
      code_verification: `${internalConfigs.pathPrefix}/device`
    }
  })

  oidc.proxy = true
  // TODO: re-enable this for cookie security
  // oidc.keys = process.env.SECURE_KEY.split(',')

  const router = new Router()

  const parse = bodyParser({})

  router.all(`${internalConfigs.pathPrefix}/*`, views(path.join(__dirname, 'views'), { extension: 'ejs' }))

  router.use(async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      debug(err)
      return ctx.render('error', { message: err.message })
    }
  })

  const resetPasswordRouter = resetPasswordHandler(oidc, internalConfigs)
  router.use(`${internalConfigs.pathPrefix}/resetpassword`, parse, resetPasswordRouter.routes(), resetPasswordRouter.allowedMethods())

  const handlerMiddlewares: Middleware<any, any>[] = []
  handlers.forEach(handler => {
    const handlerRoute = handler(oidc, internalConfigs)
    handlerMiddlewares.push(handlerRoute.routes())
    handlerMiddlewares.push(handlerRoute.allowedMethods())
  })

  router.use(`${internalConfigs.pathPrefix}/interaction/:grant`,
      parse,
      async (ctx, next) => {
        ctx.state.details = {
          ...await oidc.interactionDetails(ctx.req),
          pathPrefix: internalConfigs.pathPrefix
        }
        await next()
      },
      ...handlerMiddlewares
    )

  router.all(`/.well-known/openid-configuration`, (ctx, next) => oidc.callback(ctx.req, ctx.res, ctx.next))
  router.all(`${internalConfigs.pathPrefix}/*`, (ctx, next) => oidc.callback(ctx.req, ctx.res, ctx.next))

  return router
}

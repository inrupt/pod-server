import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs'
import Debug from 'debug'
import path from 'path'
import { BlobTree, WacLdp, WacLdpOptions, QuadAndBlobStore } from 'wac-ldp'
import * as WebSocket from 'ws'
import { Hub } from 'websockets-pubsub'
import Koa from 'koa'
import session from 'koa-session'
import Router from 'koa-router'
import { provisionProfile, provisionStorage } from './provision'
import { defaultConfiguration } from 'solid-idp'
import getRootRenderRouter from './rootRender'
// import { default as Accepts } from 'accepts'

import IResourceStore from 'solid-server-ts/src/ldp/IResourceStore'
import IOperationFactory from 'solid-server-ts/src/ldp/operations/IOperationFactory'
import IHttpHandler from 'solid-server-ts/src/ldp/IHttpHandler'

const debug = Debug('server')

const LOGIN_HTML = fs.readFileSync('./static/popup.html')
const DATA_BROWSER_HTML = fs.readFileSync(path.join(__dirname, '../node_modules/mashlib/dist/index.html'))
const DATA_BROWSER_CSS = fs.readFileSync(path.join(__dirname, '../node_modules/mashlib/dist/mash.css'))
const DATA_BROWSER_JS = fs.readFileSync(path.join(__dirname, '../node_modules/mashlib/dist/mashlib.min.js'))

interface HttpsConfig {
  key: Buffer
  cert: Buffer
}

interface OptionsObject {
  port: number
  rootDomain: string
  httpsConfig?: HttpsConfig
  storage: BlobTree
  keystore: any,
  useHttps: boolean
  mailConfiguration: any
  idpStorage: any
}

export class Server {
  storage: BlobTree
  server: http.Server | undefined
  hub: Hub | undefined
  port: number
  wsServer: any
  app: Koa | undefined
  idpRouter: any
  rootDomain: string
  rootOrigin: string
  wacLdp: WacLdp
  httpsConfig: HttpsConfig | undefined
  useHttps: boolean
  keystore: any
  mailConfiguration: any
  idpStorage: any
  constructor (options: OptionsObject) {
    this.port = options.port
    this.rootDomain = options.rootDomain
    this.httpsConfig = options.httpsConfig
    this.useHttps = options.useHttps
    this.keystore = options.keystore
    this.rootOrigin = `http${(this.useHttps ? 's' : '')}://${this.rootDomain}`
    this.storage = options.storage
    this.wacLdp = new WacLdp({
      storage: new QuadAndBlobStore(this.storage),
      aud: this.rootOrigin,
      updatesViaUrl: this.webSocketUrl(),
      skipWac: false,
      idpHost: options.rootDomain,
      usesHttps: true
    } as WacLdpOptions)
    this.mailConfiguration = options.mailConfiguration
    this.idpStorage = options.idpStorage
  }
  webSocketUrl () {
    return new URL(`ws${(this.useHttps ? 's' : '')}://${this.rootDomain}`)
  }
  storageRootStrToWebIdStr (storageRoot: string) {
    return storageRoot + (storageRoot.substr(-1) === '/' ? '' : '/') + 'profile/card#me'
  }
  screenNameToStorageRootStr (screenName: string) {
    // no need to append portSuffix here since it's already part of this.rootDomain
    // const defaultPort: Number = (this.useHttps ? 443 : 80)
    // const portIsDefault: boolean = (this.port === defaultPort)
    // const portSuffix: string = (portIsDefault ? '' : `:${this.port}`)
    // return `http${(this.useHttps ? 's' : '')}://${screenName}.${this.rootDomain}${portSuffix}`
    return `http${(this.useHttps ? 's' : '')}://${screenName}.${this.rootDomain}`
  }
  async listen () {
    debug('setting IDP issuer to', this.rootDomain)
    this.idpRouter = await defaultConfiguration({
      issuer: this.rootOrigin,
      pathPrefix: '',
      mailConfiguration: this.mailConfiguration,
      webIdFromUsername: async screenname => this.storageRootStrToWebIdStr(this.screenNameToStorageRootStr(screenname)),
      onNewUser: async (screenName: string) => {
        debug('new user', screenName)
        const storageRootStr = this.screenNameToStorageRootStr(screenName)
        const webIdStr = this.storageRootStrToWebIdStr(storageRootStr)
        await provisionStorage(this.wacLdp, new URL(storageRootStr), new URL(webIdStr))
        return webIdStr
      },
      keystore: this.keystore,
      storagePreset: 'filesystem',
      storageData: {
        folder: this.idpStorage.rootFolder
      }
    })
    this.app = new Koa()
    this.app.proxy = true
    this.app.keys = [ 'REPLACE_THIS_LATER' ]
    this.app.use(session(this.app))
    this.app.use(async (ctx, next) => {
      ctx.req.headers['x-forwarded-proto'] = `http${this.useHttps ? 's' : ''}`
      await next()
    })

    const rootRenderRouter = getRootRenderRouter(this.rootOrigin)
    this.app.use(rootRenderRouter.routes())
    this.app.use(rootRenderRouter.allowedMethods())

    // TODO: this way of handling the if statement is ugly
    this.app.use(async (ctx, next) => {
      if (ctx.origin === this.rootOrigin) {
        await this.idpRouter.routes()(ctx, async () => {
          await this.idpRouter.allowedMethods()(ctx, next)
        })
      } else {
        await next()
      }
    })

    // HACK: in order for the login page to show up, a separate file must be run at /.well-known/solid/login which I find very dirty -- jackson
    const loginRouter = new Router()
    loginRouter.get('/.well-known/solid/login', (ctx, next) => {
      debug('sending login html')
      ctx.res.writeHead(200, {})
      ctx.res.end(LOGIN_HTML)
      ctx.respond = false
    })
    this.app.use(loginRouter.routes())
    this.app.use(loginRouter.allowedMethods())

    // Data Browser
    const dataBrowserFilesRouter = new Router()
    dataBrowserFilesRouter.get('/mash.css', (ctx, next) => {
      ctx.res.writeHead(200, {})
      ctx.res.end(DATA_BROWSER_CSS)
    })
    dataBrowserFilesRouter.get('/mashlib.min.js', (ctx, next) => {
      ctx.res.writeHead(200, {})
      ctx.res.end(DATA_BROWSER_JS)
    })
    this.app.use(dataBrowserFilesRouter.routes())
    this.app.use(dataBrowserFilesRouter.allowedMethods())
    this.app.use(async (ctx, next) => {
      if (ctx.accepts(['text/turtle', 'application/ld+json', 'html']) === 'html') {
        debug('redirect to data browser!')
        ctx.res.writeHead(200, {})
        ctx.res.end(DATA_BROWSER_HTML)
      } else {
        debug('skipping data browser')
        await next()
      }
    })
    // END HACK

    this.app.use(async (ctx, next) => {
      debug('LDP handler', ctx.req.method, ctx.req.url)
      await this.wacLdp.handler(ctx.req, ctx.res)
      ctx.respond = false
    })
    if (this.httpsConfig) {
      this.server = https.createServer(this.httpsConfig, this.app.callback())
    } else {
      this.server = http.createServer(this.app.callback())
    }
    this.server.listen(this.port)
    this.wsServer = new WebSocket.Server({
      server: this.server
    })
    this.hub = new Hub(this.wacLdp, this.rootOrigin)
    this.wsServer.on('connection', this.hub.handleConnection.bind(this.hub))
    this.wacLdp.on('change', (event: { url: URL }) => {
      if (this.hub) {
        this.hub.publishChange(event.url)
      }
    })
    debug('listening on port', this.port, (this.httpsConfig ? 'https' : 'http'))
  }
  close () {
    if (this.server) {
      this.server.close()
    }
    if (this.wsServer) {
      this.wsServer.close()
    }
    debug('closing port', this.port)
  }
}

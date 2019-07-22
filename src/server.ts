import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs'
import Debug from 'debug'
import { BlobTree, WacLdp } from 'wac-ldp'
import * as WebSocket from 'ws'
import { Hub } from 'websockets-pubsub'
import Koa from 'koa'
import session from 'koa-session'
import Router from 'koa-router'
import { provisionProfile, provisionStorage } from './provision'
import { defaultConfiguration } from 'solid-idp'
import getRootRenderRouter from './rootRender'
// import { default as Accepts } from 'accepts'

const debug = Debug('server')

const DATA_BROWSER_PREFIX = 'https://datasister.5apps.com/?idp='
const LOGIN_HTML = fs.readFileSync('./static/popup.html')

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
  constructor (options: OptionsObject) {
    this.port = options.port
    this.rootDomain = options.rootDomain
    this.httpsConfig = options.httpsConfig
    this.useHttps = options.useHttps
    this.keystore = options.keystore
    this.rootOrigin = `http${(this.useHttps ? 's' : '')}://${this.rootDomain}`
    this.storage = options.storage
    // FIXME: https://github.com/inrupt/wac-ldp/issues/87
    this.wacLdp = new WacLdp(this.storage, this.rootDomain, this.webSocketUrl(), false /* skipWac */, options.rootDomain, true)
  }
  webSocketUrl () {
    return new URL(`ws${(this.useHttps ? 's' : '')}://${this.rootDomain}`)
  }
  storageRootStrToWebIdStr (storageRoot: string) {
    return storageRoot + (storageRoot.substr(-1) === '/' ? '' : '/') + 'profile/card#me'
  }
  screenNameToStorageRootStr (screenName: string) {
    return `http${(this.useHttps ? 's' : '')}://${this.rootDomain}/${screenName}/`
  }
  async listen () {
    debug('setting IDP issuer to', this.rootDomain)
    this.idpRouter = await defaultConfiguration({
      issuer: this.rootOrigin,
      pathPrefix: ''
    })

    this.app = new Koa()
    this.app.proxy = true
    this.app.keys = [ 'REPLACE_THIS_LATER' ]
    this.app.use(session(this.app))
    this.app.use(async (ctx, next) => {
      ctx.req.headers['x-forwarded-proto'] = 'https'
      await next()
    })

    this.app.use(this.idpRouter.routes())
    this.app.use(this.idpRouter.allowedMethods())

    const rootRenderRouter = getRootRenderRouter(this.rootOrigin)
    this.app.use(rootRenderRouter.routes())
    this.app.use(rootRenderRouter.allowedMethods())

    this.app.use(async (ctx, next) => {
      if (ctx.accepts(['text/turtle', 'application/ld+json', 'html']) === 'html') {
        debug('redirect to data browser!')
        ctx.res.writeHead(302, {
          Location: DATA_BROWSER_PREFIX + encodeURIComponent(this.rootOrigin)
        })
        ctx.res.end('See ' + DATA_BROWSER_PREFIX + encodeURIComponent(this.rootOrigin))
        ctx.respond = false
      } else {
        await next()
      }
    })

    // HACK: in order for the login page to show up, a separate file must be run at /.well-known/solid/login which I find very dirty -- jackson
    const loginRouter = new Router()
    loginRouter.get('/.well-known/solid/login', (ctx, next) => {
      ctx.res.writeHead(200, {})
      ctx.res.end(LOGIN_HTML)
      ctx.respond = false
    })
    this.app.use(loginRouter.routes())
    this.app.use(loginRouter.allowedMethods())
    // END HACK

    this.app.use(async (ctx, next) => {
      // debug(ctx.req.headers, ctx.req.headers['accept'] && ctx.req.headers['accept'].indexOf('text/html'))
      // if ((ctx.req.headers['accept']) && (ctx.req.headers['accept'].indexOf('text/html') !== -1)) {
      //   ctx.res.writeHead(200, {})
      //   ctx.res.end(DATA_BROWSER_HTML)
      //   ctx.respond = false
      // } else {
      debug('LDP handler', ctx.req.method, ctx.req.url)
      await this.wacLdp.handler(ctx.req, ctx.res)
      ctx.respond = false
      // }
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

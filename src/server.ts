import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs'
import Debug from 'debug'
import { BlobTreeRedis } from './BlobTreeRedis'
import { BlobTree, WacLdp } from 'wac-ldp'
import * as WebSocket from 'ws'
import { Hub } from 'websockets-pubsub'
import Koa from 'koa'
import Router from 'koa-router'
import { defaultConfiguration } from 'solid-idp'

const debug = Debug('server')

const DATA_BROWSER_HTML = fs.readFileSync('./static/index.html')
const LOGIN_HTML = fs.readFileSync('./static/popup.html')

interface HttpsConfig {
  key: Buffer
  cert: Buffer
}

interface OptionsObject {
  port: number
  aud: string
  httpsConfig?: HttpsConfig
  owner?: URL
}

export class Server {
  storage: BlobTree
  server: http.Server | undefined
  hub: Hub | undefined
  port: number
  wsServer: any
  app: Koa | undefined
  idpRouter: any
  aud: string
  wacLdp: WacLdp
  httpsConfig: HttpsConfig | undefined
  owner: URL | undefined
  constructor (options: OptionsObject) {
    this.port = options.port
    this.aud = options.aud
    this.httpsConfig = options.httpsConfig
    this.owner = options.owner
    this.storage = new BlobTreeRedis() // singleton in-memory storage
    const skipWac = (options.owner === undefined)
    this.wacLdp = new WacLdp(this.storage, this.aud, new URL(`ws://localhost:${this.port}/`), skipWac)
  }
  provision () {
    if (this.owner) {
      return this.wacLdp.setRootAcl(this.owner)
    }
  }
  async listen () {
    this.idpRouter = await defaultConfiguration({
      issuer: this.aud,
      pathPrefix: '/account'
    })

    this.app = new Koa()
    debug(this.idpRouter)
    this.app.use(this.idpRouter.routes())
    this.app.use(this.idpRouter.allowedMethods())

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
      debug('yes!')
      debug(ctx.req.headers, ctx.req.headers['accept'] && ctx.req.headers['accept'].indexOf('text/html'))
      if ((ctx.req.headers['accept']) && (ctx.req.headers['accept'].indexOf('text/html') !== -1)) {
        ctx.res.writeHead(200, {})
        ctx.res.end(DATA_BROWSER_HTML)
        ctx.respond = false
      } else {
        debug('LDP handler', ctx.req.method, ctx.req.url)
        await this.wacLdp.handler(ctx.req, ctx.res)
        ctx.respond = false
      }
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
    this.hub = new Hub(this.wacLdp, this.aud)
    this.wsServer.on('connection', this.hub.handleConnection.bind(this.hub))
    this.storage.on('change', (event: { url: URL }) => {
      if (this.hub) {
        this.hub.publishChange(event.url)
      }
    })
    this.storage.on('delete', (event: { url: URL }) => {
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

import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs'
import Debug from 'debug'
import { BlobTreeRedis } from './BlobTreeRedis'
import { BlobTree, makeHandler, Path, setRootAcl } from 'wac-ldp'
import * as WebSocket from 'ws'
import { Hub } from 'websockets-pubsub'
import Koa from 'koa'
import { defaultConfiguration } from 'solid-idp'

const debug = Debug('server')

const OPENID_CONFIG_URL_PATH = '/.well-known/openid-configuration'
const OPENID_CONFIG_JSON = fs.readFileSync('./static/openid-configuration.json')
const DATA_BROWSER_HTML = fs.readFileSync('./static/index.html')
const MASHLIB_JS = fs.readFileSync('./static/index.html')

type HttpsConfig = {
  key: Buffer,
  cert: Buffer
}

type OptionsObject = {
  port: number,
  aud: string,
  skipWac: boolean,
  httpsConfig: HttpsConfig | undefined,
  owner: string
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
  handler: any
  httpsConfig: HttpsConfig | undefined
  owner: string
  constructor (options: OptionsObject) {
    this.port = options.port
    this.aud = options.aud
    this.httpsConfig = options.httpsConfig
    this.owner = options.owner
    this.storage = new BlobTreeRedis() // singleton in-memory storage
    this.handler = makeHandler(this.storage, options.aud, options.skipWac)
  }
  provision () {
    return setRootAcl(this.storage, this.owner)
  }
  async listen () {
    //  this.idpRouter = await defaultConfiguration({
    //    issuer: this.aud
    //  })

    this.app = new Koa()
    // debug(this.idpRouter)
    // this.app.use(this.idpRouter.routes())
    // this.app.use(this.idpRouter.allowedMethods())
    this.app.use(async (ctx, next) => {
      debug('yes!')
      debug(ctx.req.headers, ctx.req.headers['accept'] && ctx.req.headers['accept'].indexOf('text/html'))
      if (ctx.req.url === OPENID_CONFIG_URL_PATH) {
        ctx.res.writeHead(200, {})
        ctx.res.end(OPENID_CONFIG_JSON)
        ctx.respond = false
      } else if ((ctx.req.headers['accept']) && (ctx.req.headers['accept'].indexOf('text/html') !== -1)) {
        ctx.res.writeHead(200, {})
        ctx.res.end(DATA_BROWSER_HTML)
        ctx.respond = false
      } else {
        debug('LDP handler', ctx.req.method, ctx.req.url)
        this.handler(ctx.req, ctx.res)
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
    this.hub = new Hub(this.aud)
    this.wsServer.on('connection', this.hub.handleConnection.bind(this.hub))
    this.storage.on('change', (event: { path: Path }) => {
      if (this.hub) {
        this.hub.publishChange(event.path, this.storage)
      }
    })
    this.storage.on('delete', (event: { path: Path }) => {
      if (this.hub) {
        this.hub.publishChange(event.path, this.storage)
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

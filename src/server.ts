import * as http from 'http'
import * as fs from 'fs'
import Debug from 'debug'
import { BlobTreeInMem, BlobTree, makeHandler, Path } from 'wac-ldp'
import * as WebSocket from 'ws'
import { Hub } from 'websockets-pubsub'
import Koa from 'koa'
import { defaultConfiguration } from 'solid-idp'

const debug = Debug('server')

const IDP_PREFIX = '/account/'
const DATA_BROWSER_HTML = fs.readFileSync('./static/index.html')

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
  constructor (port: number, aud: string) {
    this.port = port
    this.aud = aud
    this.storage = new BlobTreeInMem() // singleton in-memory storage
    this.handler = makeHandler(this.storage, aud)
  }
  async listen () {
    this.idpRouter = await defaultConfiguration({
      issuer: this.aud,
      pathPrefix: IDP_PREFIX
    })
    this.app = new Koa()
    debug(this.idpRouter)
    this.app.use(this.idpRouter.routes())
    this.app.use(this.idpRouter.allowedMethods())
    this.server = this.app.listen(this.port)
    this.app.use(async (ctx, next) => {
      debug(ctx.req.headers, ctx.req.headers['accept'] && ctx.req.headers['accept'].indexOf('text/html'))
      if ((ctx.req.headers['accept']) && (ctx.req.headers['accept'].indexOf('text/html') !== -1)) {
        ctx.res.writeHead(200, {})
        ctx.res.end(DATA_BROWSER_HTML)
        ctx.respond = false
      } else {
        debug('LDP handler', ctx.req.method, ctx.req.url)
        this.handler(ctx.req, ctx.res)
        ctx.respond = false
      }
    })
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
    debug('listening on port', this.port)
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

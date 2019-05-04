import * as http from 'http'
import Debug from 'debug'
import { BlobTreeInMem, BlobTree, makeHandler, Path } from 'wac-ldp'
import * as WebSocket from 'ws'
import { Hub } from 'websockets-pubsub'
import Koa from 'koa'
import { defaultConfiguration } from 'solid-idp'

const debug = Debug('server')

const IDP_PREFIX = '/account/'

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
      issuer: 'https://api.swype.io'
    })
    this.app = new Koa()
    debug(this.idpRouter)
    this.app.use(async (ctx, next) => {
      if (ctx.req.url && ctx.req.url.substr(IDP_PREFIX.length) === IDP_PREFIX) {
        return next()
      } else {
        debug('LDP handler')
        this.handler(ctx.req, ctx.res)
        ctx.respond = false
      }
    })
    this.app.use(this.idpRouter.routes())
    this.app.use(this.idpRouter.allowedMethods())
    this.server = this.app.listen(this.port)
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
    // this.server.close()
    if (this.server) {
      this.server.close()
    }
    if (this.wsServer) {
      this.wsServer.close()
    }
    debug('closing port', this.port)
  }
}

// // on startup:
// const port = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 8080

// const aud = process.env.AUD || 'https://localhost:8443'
// const server = new Server(port, aud)
// server.listen()
// // server.close()

// export function closeServer () {
//   debug('closing server')
//   server.close()
// }

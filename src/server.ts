import * as http from 'http'
import Debug from 'debug'
import { BlobTreeInMem, BlobTree, makeHandler, Path } from 'wac-ldp'
import * as WebSocket from 'ws'
import { Hub } from 'websockets-pubsub'

const debug = Debug('server')

export class Server {
  storage: BlobTree
  server: http.Server
  hub: Hub
  port: number
  wsServer: any
  constructor (port: number, aud: string) {
    this.port = port
    this.storage = new BlobTreeInMem() // singleton in-memory storage
    const handler = makeHandler(this.storage, aud)
    this.server = http.createServer(handler)
    this.wsServer = new WebSocket.Server({
      server: this.server
    })
    this.hub = new Hub(aud)
    this.wsServer.on('connection', this.hub.handleConnection.bind(this.hub))
    this.storage.on('change', (event: { path: Path }) => {
      this.hub.publishChange(event.path, this.storage)
    })
    this.storage.on('delete', (event: { path: Path }) => {
      this.hub.publishChange(event.path, this.storage)
    })
  }
  listen () {
    this.server.listen(this.port)
    debug('listening on port', this.port)
  }
  close () {
    this.server.close()
    this.wsServer.close()
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

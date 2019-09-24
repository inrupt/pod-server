// START VSCode debugging settings, see https://github.com/visionmedia/debug/issues/641#issuecomment-490706752
declare global {
	namespace NodeJS {
    interface Process {
      browser: boolean
    }
    interface Global {
      window: object
    }
  }
}
process.browser = true
global.window = { process: { type: 'renderer' } }
process.env.DEBUG = '*'
// END VSCode debugging settings

import * as http from 'http'
import Debug from 'debug'
import { BlobTreeNssCompat } from './lib/storage/BlobTreeNssCompat'
import { WacLdp } from './lib/core/WacLdp'
import { BlobTree, Path } from './lib/storage/BlobTree'
import { QuadAndBlobStore } from './lib/storage/QuadAndBlobStore'
import { NssCompatResourceStore, DefaultOperationFactory, AclBasedAuthorizer } from './exports'
import { IResourceStore, IOperationFactory, IAuthorizer } from 'solid-server-ts'
import { StoreManager } from './lib/rdf/StoreManager'

const debug = Debug('server')

const dataDir = process.env.DATA_DIR || './data'

class Server {
  highLevelResourceStore: IResourceStore
  operationFactory: IOperationFactory
  authorizer: IAuthorizer
  server: http.Server
  port: number
  wacLdp: WacLdp
  constructor (port: number, aud: string, skipWac: boolean) {
    this.port = port
    const lowLevelResourceStore = new NssCompatResourceStore(dataDir)
    const midLevelResourceStore = new QuadAndBlobStore(lowLevelResourceStore) // singleton on-disk storage
    const serverRootDomain: string = new URL(aud).host
    this.highLevelResourceStore = new StoreManager(serverRootDomain, midLevelResourceStore)
    this.operationFactory = new DefaultOperationFactory(this.highLevelResourceStore)
    this.authorizer = new AclBasedAuthorizer(this.highLevelResourceStore as StoreManager)

    this.wacLdp = new WacLdp(this.operationFactory, this.authorizer, {
      storage: midLevelResourceStore,
      aud,
      updatesViaUrl: new URL('wss://localhost:8443'),
      skipWac,
      idpHost: 'localhost:8443',
      usesHttps: false
    })
    this.server = http.createServer(this.wacLdp.handler.bind(this.wacLdp))
  }
  listen () {
    console.log('mee mah')
    this.server.listen(this.port)
    debug('listening on port', this.port)
  }
  close () {
    this.server.close()
    debug('closing port', this.port)
  }
}

// on startup:
const port: number = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 8080
const skipWac: boolean = !!process.env.SKIP_WAC

const aud = process.env.AUD || `http://localhost:${port}`
const server = new Server(port, aud, skipWac)
server.listen()
// server.close()

export function closeServer () {
  debug('closing server')
  server.close()
}

import { Server } from './server'
import { BlobTreeRedis } from './BlobTreeRedis'
import * as fs from 'fs'
import { BlobTreeNssCompat, BlobTree } from 'wac-ldp'
import Debug from 'debug'

const debug = Debug('standalone')

// on startup:
const port = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 8080

const rootDomain = process.env.ROOT_DOMAIN || `localhost:${port}`

const skipWac: boolean = !!process.env.SKIP_WAC

const tlsDir = process.env.TLS_DIR
let httpsConfig
if (tlsDir) {
  httpsConfig = {
    key: fs.readFileSync(`${tlsDir}/privkey.pem`),
    cert: fs.readFileSync(`${tlsDir}/fullchain.pem`)
  }
}
const useHttps = process.env.USE_HTTPS === 'true' || !!tlsDir

let ownerStr: string | undefined = process.env.OWNER
if (!ownerStr) {
  // throw new Error('OWNER environment variable required')
  ownerStr = 'https://jackson.solid.community/profile/card#me'
}

let storage: BlobTree
storage = new BlobTreeNssCompat(process.env.DATA_DIR || './data-dir/')

let keystore: any
if (process.env.KEY_STORE) {
  try {
    keystore = JSON.parse(fs.readFileSync(process.env.KEY_STORE).toString())
  } catch (e) {
    console.error('failed to read IDP keystore from ', process.env.KEY_STORE)
  }
}

const server = new Server({
  port,
  rootDomain,
  httpsConfig,
  storage,
  keystore,
  useHttps
})

async function startServer () {
  // await server.provision()
  await server.listen()
  console.log('listening on ' + port)
}

// tslint:disable-next-line: no-floating-promises
startServer()

// server.close()

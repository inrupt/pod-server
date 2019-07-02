import { Server } from './server'
import { BlobTreeRedis } from './BlobTreeRedis'
import * as fs from 'fs'
import { BlobTreeInMem } from 'wac-ldp'
import Debug from 'debug'

const debug = Debug('standalone')

// on startup:
const port = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 8080

const aud = process.env.AUD || `http://localhost:${port}`

const skipWac: boolean = !!process.env.SKIP_WAC

const tlsDir = process.env.TLS_DIR
let httpsConfig
if (tlsDir) {
  httpsConfig = {
    key: fs.readFileSync(`${tlsDir}/privkey.pem`),
    cert: fs.readFileSync(`${tlsDir}/fullchain.pem`)
  }
}

let ownerStr: string | undefined = process.env.OWNER
if (!ownerStr) {
  // throw new Error('OWNER environment variable required')
  ownerStr = 'https://jackson.solid.community/profile/card#me'
}

let storage
if (process.env.REDIS_URL) {
  debug('using redis backend')
  storage = new BlobTreeRedis(process.env.REDIS_URL)
} else {
  debug('using in-memory backend')
  storage = new BlobTreeInMem()
}
const server = new Server({
  port,
  aud,
  httpsConfig,
  owner: new URL(ownerStr),
  storage
})

async function startServer () {
  await server.provision()
  await server.listen()
  console.log('listening on ' + port)
}

// tslint:disable-next-line: no-floating-promises
startServer()

// server.close()

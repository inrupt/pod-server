import { Server } from './server'
import { BlobTreeRedis } from './BlobTreeRedis'
import * as fs from 'fs'

// on startup:
const port = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 3000

const aud = process.env.AUD || 'http://localhost:3000'

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

const server = new Server({
  port,
  aud,
  httpsConfig,
  owner: new URL(ownerStr),
  storage: new BlobTreeRedis(process.env.REDIS_URL) // Redis-based BlobTree storage
})

async function startServer () {
  await server.provision()
  await server.listen()
  console.log('listening on ' + port)
}

// tslint:disable-next-line: no-floating-promises
startServer()

// server.close()

import { Server } from './server'
import * as fs from 'fs'

// on startup:
const port = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 3000

const aud = process.env.AUD || 'https://localhost:8443'

const skipWac: boolean = !!process.env.SKIP_WAC

const tlsDir = process.env.TLS_DIR
let httpsConfig
if (tlsDir) {
  httpsConfig = {
    key: fs.readFileSync(`${tlsDir}/privkey.pem`),
    cert: fs.readFileSync(`${tlsDir}/fullchain.pem`)
  }
}

const ownerStr: string | undefined = process.env.OWNER
if (!ownerStr) {
  throw new Error('OWNER environment variable required')
}

const server = new Server({ port, aud, httpsConfig, owner: new URL(ownerStr) })

async function startServer () {
  await server.provision()
  await server.listen()
  console.log('listening on ' + port)
}

// tslint:disable-next-line: no-floating-promises
startServer()

// server.close()

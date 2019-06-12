import { Server } from './server'
import * as fs from 'fs'

// on startup:
const port = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 8080

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

const owner = process.env.OWNER
if (!owner) {
  throw new Error('OWNER environment variable required')
}

const server = new Server({ port, aud, skipWac, httpsConfig, owner })

async function startServer () {
  await server.provision()
  await server.listen()
}

// tslint:disable-next-line: no-floating-promises
startServer()

// server.close()

import { Server } from './server'

// on startup:
const port = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 3000

const aud = process.env.AUD || 'https://localhost:8443'

const skipWac: boolean = !!process.env.SKIP_WAC

const server = new Server(port, aud, skipWac)

// tslint:disable-next-line: no-floating-promises
server.listen()

// server.close()

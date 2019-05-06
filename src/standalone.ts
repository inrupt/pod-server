import { Server } from './server'

// on startup:
const port = parseInt((process.env.PORT ? process.env.PORT : ''), 10) || 8080

const aud = process.env.AUD || 'https://localhost:8443'
const server = new Server(port, aud)

// tslint:disable-next-line: no-floating-promises
server.listen()

// server.close()

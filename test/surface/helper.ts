import { Server } from '../../src/server'

let server: Server

export function startServer (port: number) {
  server = new Server(port, `http://localhost:${port}`)
  server.listen()
}

export function stopServer () {
  server.close()
}

import { Server } from '../../src/server'

let server: Server

export async function startServer (port: number) {
  server = new Server(port, `http://localhost:${port}`, true)
  await server.listen()
}

export function stopServer () {
  server.close()
}

import { Server } from '../../src/server'

let server: Server

export async function startServer (port: number) {
  server = new Server({ port, aud: `http://localhost:${port}` })
  await server.listen()
}

export function stopServer () {
  server.close()
}

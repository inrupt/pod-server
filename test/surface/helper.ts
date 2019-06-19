import { Server } from '../../src/server'

let server: Server

export function startServer (port: number): Promise<void> {
  server = new Server({
    port,
    aud: `http://localhost:${port}`,
    owner: new URL('https://jackson.solid.community/profile/card#me')
  })
  return server.listen()
}

export function stopServer () {
  server.close()
}

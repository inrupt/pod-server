import { Server } from '../../src/server'
import { BlobTreeInMem } from 'wac-ldp'

let server: Server

export function startServer (port: number): Promise<void> {
  server = new Server({
    storage: new BlobTreeInMem(),
    port,
    aud: `http://localhost:${port}`,
    owner: new URL('https://jackson.solid.community/profile/card#me')
  })
  return server.listen()
}

export function stopServer () {
  server.close()
}

import { Server } from '../../src/server'
import { BlobTreeInMem } from 'wac-ldp'

const PORT = 8082

let server: Server

test('server', async () => {
  server = new Server({ port: PORT, aud: `http://localhost:${PORT}`, owner: new URL('https://localhost/#me'), storage: new BlobTreeInMem() })
  await server.listen()
  server.close()
})

import { Server } from '../../src/server'

const PORT = 8082

let server: Server

test('server', async () => {
  server = new Server({ port: PORT, aud: `http://localhost:${PORT}`, owner: 'https://localhost/#me' })
  await server.listen()
  server.close()
})

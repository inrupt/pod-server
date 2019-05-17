import { Server } from '../../src/server'

const PORT = 8082

let server: Server

test('server', async () => {
  server = new Server(PORT, `http://localhost:${PORT}`, false)
  await server.listen()
  server.close()
})

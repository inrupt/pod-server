import { Server } from '../../src/server'
let server: Server

test('server', () => {
  server = new Server(8080, `http://localhost:${8080}`)
  server.listen()
  server.close()
})

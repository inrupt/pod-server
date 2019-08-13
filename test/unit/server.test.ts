import { Server } from '../../src/server'
import { BlobTreeInMem, QuadAndBlobStore } from 'wac-ldp'

const PORT = 8082

let server: Server

// interface OptionsObject {
//   port: number
//   rootDomain: string
//   httpsConfig?: HttpsConfig
//   storage: BlobTree
//   keystore: any,
//   useHttps: boolean
// }

test('server', async () => {
  server = new Server({
    port: PORT,
    rootDomain: `localhost:${PORT}`,
    storage: new BlobTreeInMem(),
    keystore: {},
    useHttps: false
  })
  await server.listen()
  server.close()
})

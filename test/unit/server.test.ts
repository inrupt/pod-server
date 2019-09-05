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
//   mailConfiguration: any
//   idpStorage: any
// }

test('server', async () => {
  server = new Server({
    port: PORT,
    rootDomain: `localhost:${PORT}`,
    storage: new BlobTreeInMem(),
    keystore: {},
    useHttps: false,
    mailConfiguration: undefined,
    idpStorage:  {
      type: 'filesystem',
      rootFolder: './.db'
    }
  })
  await server.listen()
  server.close()
})

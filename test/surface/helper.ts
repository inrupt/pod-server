import { Server } from '../../src/server'
import { BlobTreeInMem, QuadAndBlobStore } from 'wac-ldp'

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

export function startServer (port: number): Promise<void> {
  server = new Server({
    port,
    rootDomain: `localhost:${port}`,
    storage:  new BlobTreeInMem(),
    keystore: {},
    useHttps: false,
    mailConfiguration: undefined,
    idpStorage: {
      type: 'filesystem',
      rootFolder: ''
    }
  })
  return server.listen()
}

export function stopServer () {
  server.close()
}

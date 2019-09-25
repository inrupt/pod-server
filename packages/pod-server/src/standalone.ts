import { Server } from './server'
import * as fs from 'fs'
import { BlobTreeNssCompat, BlobTree } from 'wac-ldp'
import Debug from 'debug'
import semver from 'semver'

const debug = Debug('standalone')

const config = JSON.parse(
  (process.env.CONFIG_PATH ? fs.readFileSync(process.env.CONFIG_PATH) : fs.readFileSync('./config.json')).toString()
)

console.log(config)

const version = '12'
if (!semver.satisfies(process.version, version)) {
  console.log(`Required node version ${version} not satisfied with current version ${process.version}.`)
  process.exit(1)
}
console.log(`Checked that Node version ${process.version} satisfied ${version}.`)

// on startup:
const port = parseInt((config.network.port ? config.network.port : ''), 10) || 8080

const rootDomain = config.network.host || `localhost:${port}`

const skipWac: boolean = !!process.env.SKIP_WAC

const tlsDir = process.env.TLS_DIR
let httpsConfig
if (config.network.ssl) {
  httpsConfig = {
    key: fs.readFileSync(config.network.ssl.key),
    cert: fs.readFileSync(config.network.ssl.cert)
  }
}
const useHttps = config.network.useHttps || !!config.network.ssl

// TODO: come back to allow configs to have multi user mode
// let ownerStr: string | undefined = process.env.OWNER
// if (!ownerStr) {
//   // throw new Error('OWNER environment variable required')
//   ownerStr = 'https://jackson.solid.community/profile/card#me'
// }

let storage: BlobTree
storage = new BlobTreeNssCompat(config.storage.rootFolder || './data-dir/')

let keystore: any
if (config.identityProvider.keystore) {
  try {
    keystore = JSON.parse(fs.readFileSync(config.identityProvider.keystore).toString())
  } catch (e) {
    console.error('failed to read IDP keystore from ', config.identityProvider.keystore)
  }
}

const server = new Server({
  port,
  rootDomain,
  httpsConfig,
  storage,
  keystore,
  useHttps,
  mailConfiguration: config.identityProvider.email,
  idpStorage: config.identityProvider.storage
})

async function startServer () {
  // await server.provision()
  await server.listen()
  console.log('listening on ' + port)
}

// tslint:disable-next-line: no-floating-promises
startServer()

// server.close()

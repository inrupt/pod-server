
import Debug from 'debug'
import { ACL, RDF } from '../rdf/rdf-constants'
import { StoreManager, quadStreamFromBlob, urlToRdfNode, stringToRdfNode, RdfNode, rdfNodeToString } from '../rdf/StoreManager'

const debug = Debug('appIsTrustedForMode')
const OWNER_PROFILES_FETCH_TIMEOUT = 2000

export interface OriginCheckTask {
  origin: string
  mode: URL
  resourceOwners: Array<URL>
}

// FIXME: It's weird that setAppModes is in the RDF module, but getAppModes is in the authorization module.

export function urlToDocUrl (url: URL): URL {
  return new URL(url.toString().split('#')[0])
}

export async function getAppModes (webId: URL, origin: string, storeManager: StoreManager): Promise<Array<URL>> {
  const webIdDoc: URL = urlToDocUrl(webId)
  const webIdDocNode: RdfNode = urlToRdfNode(webIdDoc)
  debug(storeManager)
  // await storeManager.load(webIdDoc)
  const trustedAppNodes = await storeManager.statementsMatching({
    predicate: urlToRdfNode(ACL.origin),
    object: stringToRdfNode(origin),
    why: webIdDocNode
  })
  debug({ trustedAppNodes })
  const modes: any = {}
  await Promise.all(trustedAppNodes.map(async (quad: any) => {
    const trustStatements = await storeManager.statementsMatching({
      subject: urlToRdfNode(webId),
      predicate: urlToRdfNode(ACL.trustedApp),
      object: quad.subject,
      why: webIdDocNode
    })
    debug({ trustStatements })
    if (trustStatements.length > 0) {
      const modeStatements = await storeManager.statementsMatching({
        subject: quad.subject,
        predicate: urlToRdfNode(ACL.mode),
        why: webIdDocNode
      })
      await Promise.all(modeStatements.map(async (quad: any) => {
        modes[rdfNodeToString(quad.object)] = true
      }))
    }
  }))
  return Object.keys(modes).map(str => new URL(str))
}
async function checkOwnerProfile (webId: URL, origin: string, mode: URL, storeManager: StoreManager): Promise<boolean> {
  debug('checking app modes', webId, origin, storeManager)
  const appModes = await getAppModes(webId, origin, storeManager)
  for (let i = 0; i < appModes.length; i++) {
    if (appModes[i].toString() === mode.toString()) {
      return true
    }
  }
  debug('returning false')
  return false
}

export async function appIsTrustedForMode (task: OriginCheckTask, storeManager: StoreManager): Promise<boolean> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(false)
    }, OWNER_PROFILES_FETCH_TIMEOUT)
    const done = Promise.all(task.resourceOwners.map(async (webId: URL) => {
      if (await checkOwnerProfile(webId, task.origin, task.mode, storeManager)) {
        resolve(true)
      }
    }))
    // tslint:disable-next-line: no-floating-promises
    done.then(() => {
      resolve(false)
    })
  })
}

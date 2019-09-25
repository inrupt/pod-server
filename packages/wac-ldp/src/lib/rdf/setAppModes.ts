import Debug from 'debug'
import * as rdflib from 'rdflib'
import { urlToPath } from '../storage/BlobTree'
import { streamToObject, ResourceData, objectToStream, makeResourceData } from './ResourceDataUtils'
import { ACL } from './rdf-constants'
import { QuadAndBlobStore } from '../storage/QuadAndBlobStore'
import * as url from 'url'

const debug = Debug('setAppModes')

// FIXME: It's weird that setAppModes is in the RDF module, but getAppModes is in the auth module.

export async function setAppModes (webId: URL, origin: string, modes: Array<URL>, storage: QuadAndBlobStore): Promise<void> {
  debug(`Registering app (${origin}) with accessModes ${modes.map(url => url.toString()).join(', ')} for webId ${webId.toString()}`)
  const webIdDocUrl = new URL(url.format(webId, { fragment: false }))
  const blob = storage.getBlob(webIdDocUrl)
  const stream = await blob.getData()
  debug('stream', typeof stream)
  let resourceData
  if (stream) {
    resourceData = await streamToObject(stream) as ResourceData
  } else {
    throw new Error(`WebId ${webId.toString()} not found on this server`)
  }
  const store = rdflib.graph()
  const parse = rdflib.parse as (body: string, store: any, url: string, contentType: string) => void
  parse(resourceData.body, store, webId.toString(), resourceData.contentType)
  debug('before patch', store.toNT())

  const originSym = rdflib.sym(origin)
  // remove existing statements on same origin - if it exists
  debug('finding statements about ', origin)
  store.statementsMatching(null, rdflib.sym(ACL['origin'].toString()), originSym).forEach((st: any) => {
    debug('found', st)
    debug('removing trustedApp statements with object ', st.subject)
    store.removeStatements([...store.statementsMatching(null, rdflib.sym(ACL['trustedApp'].toString()), st.subject)])
    debug('removing statements with subject ', st.subject)
    store.removeStatements([...store.statementsMatching(st.subject)])
  })
  debug('after removing', store.toNT())

  // add new triples
  const application = new rdflib.BlankNode()
  store.add(rdflib.sym(webId.toString()), rdflib.sym(ACL['trustedApp'].toString()), application, rdflib.sym(webId.toString()))
  store.add(application, rdflib.sym(ACL['origin'].toString()), originSym, rdflib.sym(webId.toString()))

  modes.forEach(mode => {
    debug('adding', application, ACL['mode'], mode)
    store.add(application, rdflib.sym(ACL['mode'].toString()), rdflib.sym(mode.toString()))
  })
  debug('after patch', store.toNT())
  const turtleDoc: string = rdflib.serialize(undefined, store, webId.toString(), 'text/turtle')
  await blob.setData(await objectToStream(makeResourceData(resourceData.contentType, turtleDoc)))
}

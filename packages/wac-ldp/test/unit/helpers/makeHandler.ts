import { WacLdp } from '../../../src/lib/core/WacLdp'
import { BlobTree } from '../../../src/lib/storage/BlobTree'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'
import { NssCompatResourceStore, DefaultOperationFactory, AclBasedAuthorizer } from '../../../src/exports'
import { StoreManager } from '../../../src/lib/rdf/StoreManager'

export function makeHandler (blobTree: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean, idpHost: string, usesHttps: boolean) {
  const lowLevelResourceStore = blobTree
  const midLevelResourceStore = new QuadAndBlobStore(lowLevelResourceStore) // singleton on-disk storage
  const serverRootDomain: string = new URL(aud).host
  const highLevelResourceStore = new StoreManager(serverRootDomain, midLevelResourceStore)
  const operationFactory = new DefaultOperationFactory(highLevelResourceStore)
  const authorizer = new AclBasedAuthorizer(highLevelResourceStore)
  const wacLdp = new WacLdp(operationFactory, authorizer, { storage: midLevelResourceStore, aud, updatesViaUrl, skipWac, idpHost, usesHttps })
  return wacLdp.handler.bind(wacLdp)
}

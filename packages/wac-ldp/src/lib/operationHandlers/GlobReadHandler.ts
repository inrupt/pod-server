import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { ResultType, WacLdpResponse, ErrorResult } from '../api/http/HttpResponder'

import Debug from 'debug'
import { StoreManager } from '../rdf/StoreManager'
import { AccessCheckTask, checkAccess } from '../authorization/checkAccess'
import { ResourceData, streamToObject } from '../rdf/ResourceDataUtils'
import { mergeRdfSources } from '../rdf/mergeRdfSources'
import { ACL } from '../rdf/rdf-constants'
import { IResourceIdentifier,IRepresentationPreferences, IOperation, PermissionSet, ResponseDescription, IResourceStore } from 'solid-server-ts'

const debug = Debug('glob-read-handler')

export class GlobReadHandler implements IOperation {
  preferences: IRepresentationPreferences
  target: IResourceIdentifier
  resourceStore: IResourceStore
  operationOptions: any
  constructor (method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, resourceStore: StoreManager, operationOptions: any) {
    this.preferences = representationPreferences
    this.target = target
    this.resourceStore = resourceStore
    this.operationOptions = operationOptions
  }
  canHandle = () => {
    debug('canHandle called for glob read handler', (this.preferences as WacLdpTask).wacLdpTaskType(), TaskType)
    return ((this.preferences as WacLdpTask).wacLdpTaskType() === TaskType.globRead)
  }
  requiredPermissions = PermissionSet.READ_ONLY
  async execute (): Promise<ResponseDescription> {
    return this.handle(this.preferences as WacLdpTask, this.resourceStore as StoreManager,
      this.operationOptions.aud, this.operationOptions.skipWac, this.operationOptions.appendOnly)
  }
  handle = async function (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    // At this point will have checked read access over the
    // container, but need to collect all RDF sources, filter on access, and then
    // concatenate them.

    const containerMembers = await storeManager.getLocalContainer(wacLdpTask.fullUrl()).getMembers()
    const webId = await wacLdpTask.webId()
    const rdfSources: { [indexer: string]: ResourceData } = {}
    await Promise.all(containerMembers.map(async (member) => {
      debug('glob, considering member', member)
      if (member.isContainer) {// not an RDF source
        return
      }
      const blobUrl = new URL(member.name, wacLdpTask.fullUrl())
      const data = await storeManager.getLocalBlob(blobUrl).getData()
      const resourceData = await streamToObject(data)
      if (['text/turtle', 'application/ld+json'].indexOf(resourceData.contentType) === -1) { // not an RDF source
        return
      }
      try {
        if (!skipWac) {
          await checkAccess({
            url: blobUrl,
            isContainer: false,
            webId,
            origin: await wacLdpTask.origin(),
            requiredPermissions: new PermissionSet({ read: true }),
            storeManager
          } as AccessCheckTask) // may throw if access is denied
        }
        rdfSources[member.name] = resourceData
        debug('Found RDF source', member.name)
      } catch (error) {
        if (error instanceof ErrorResult && error.resultType === ResultType.AccessDenied) {
          debug('access denied to blob in glob, skipping', blobUrl.toString())
        } else {
          debug('unexpected error for blob in glob, skipping', error.message, blobUrl.toString())
        }
      }
    }))

    const ret: WacLdpResponse = {
      resultType: (wacLdpTask.omitBody() ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
      resourceData: await mergeRdfSources(rdfSources, wacLdpTask.rdfType()),
      createdLocation: undefined,
      isContainer: true
    }
    debug('glob-read returns', ret)
    return ret
  }
}

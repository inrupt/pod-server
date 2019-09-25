import { Blob } from '../storage/Blob'

import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { streamToObject } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/StoreManager'
import { Member } from '../storage/Container'
import { membersListAsResourceData } from '../storage/membersListAsResourceData'
import { IResourceIdentifier, IOperation, IRepresentationPreferences, IResourceStore, ResponseDescription, PermissionSet } from 'solid-server-ts'

const debug = Debug('read-container-handler')

export class ReadContainerHandler implements IOperation {
  preferences: IRepresentationPreferences
  target: IResourceIdentifier
  resourceStore: IResourceStore
  operationOptions: any
  async execute (): Promise<ResponseDescription> {
    return this.handle(this.preferences as WacLdpTask, this.resourceStore as StoreManager,
      this.operationOptions.aud, this.operationOptions.skipWac, this.operationOptions.appendOnly)
  }
  constructor (method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, resourceStore: StoreManager, operationOptions: any) {
    this.preferences = representationPreferences
    this.target = target
    this.resourceStore = resourceStore
    this.operationOptions = operationOptions
  }
  canHandle = () => ((this.preferences as WacLdpTask).wacLdpTaskType() === TaskType.containerRead)
  requiredPermissions = new PermissionSet({ read: true })
  handle = async function (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    let container: any
    container = storeManager.getLocalContainer(task.fullUrl())

    debug('operation readContainer!')
    debug(container)
    let membersList: Array<Member>
    if (task.preferMinimalContainer()) {
      membersList = []
    } else {
      membersList = await container.getMembers()
    }
    debug(membersList)
    const resourceData = await membersListAsResourceData(task.fullUrl(), membersList, task.rdfType())
    debug(resourceData)
    return {
      resultType: (task.omitBody() ? ResultType.OkayWithoutBody : ResultType.OkayWithBody),
      resourceData,
      isContainer: true
    } as WacLdpResponse
  }
}

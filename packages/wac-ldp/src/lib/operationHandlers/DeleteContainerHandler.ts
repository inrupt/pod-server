import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { StoreManager } from '../rdf/StoreManager'
import { IResourceIdentifier, IRepresentationPreferences, ResponseDescription, PermissionSet, IOperation, IResourceStore } from 'solid-server-ts'

const debug = Debug('delete-container-handler')

export class DeleteContainerHandler implements IOperation {
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
  canHandle = () => ((this.preferences as WacLdpTask).wacLdpTaskType() === TaskType.containerDelete)
  requiredPermissions = new PermissionSet({ write: true })
  async handle (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    let container: any
    container = storeManager.getLocalContainer(task.fullUrl())

    debug('operation deleteContainer!')
    debug(container)
    await container.delete()
    return {
      resultType: ResultType.OkayWithoutBody,
      resourcesChanged: [ task.fullUrl() ]
    } as WacLdpResponse
  }
}

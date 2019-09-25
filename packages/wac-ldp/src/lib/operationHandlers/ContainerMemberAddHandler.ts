
import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse } from '../api/http/HttpResponder'

import Debug from 'debug'

import { streamToObject, makeResourceData, objectToStream } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/StoreManager'
import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'
import { WriteBlobHandler } from './WriteBlobHandler'
import { ACL } from '../rdf/rdf-constants'
import OperationHandler from './OperationHandler'
import { IResourceIdentifier, IRepresentationPreferences, IOperation, PermissionSet, ResponseDescription, IResourceStore } from 'solid-server-ts'

const debug = Debug('container-member-add-handler')

export class ContainerMemberAddHandler implements IOperation {
  preferences: IRepresentationPreferences
  target: IResourceIdentifier
  method: string
  resourceStore: IResourceStore
  operationOptions: any
  async execute (): Promise<ResponseDescription> {
    return this.handle(this.preferences as WacLdpTask, this.resourceStore as StoreManager,
      this.operationOptions.aud, this.operationOptions.skipWac, this.operationOptions.appendOnly)
  }
  canHandle () {
    return ((this.preferences as WacLdpTask).wacLdpTaskType() === TaskType.containerMemberAdd)
  }
  requiredPermissions: PermissionSet
  constructor (method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, resourceStore: StoreManager, operationOptions: any) {
    this.preferences = representationPreferences
    this.requiredPermissions = new PermissionSet({ append: true })
    this.target = target
    this.method = method
    this.resourceStore = resourceStore
    this.operationOptions = operationOptions
  }
  async handle (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    // We will convert ContainerMemberAdd tasks to WriteBlob tasks on the new child
    // but notice that access check for this is append on the container,
    // write access on the Blob is not required!
    // See https://github.com/solid/web-access-control-spec#aclappend

    wacLdpTask.convertToBlobWrite(wacLdpTask.childNameToCreate())
    return (new WriteBlobHandler(this.method, this.target, this.preferences, this.resourceStore as StoreManager, this.operationOptions)).handle(wacLdpTask, storeManager, aud, skipWac, appendOnly)
  }
}

import { IOperationFactory, IResourceStore, IResourceIdentifier, IRepresentationPreferences, IOperation } from 'solid-server-ts'
import { OptionsHandler } from '../operationHandlers/OptionsHandler'
import { GlobReadHandler } from '../operationHandlers/GlobReadHandler'
import { ContainerMemberAddHandler } from '../operationHandlers/ContainerMemberAddHandler'
import { ReadContainerHandler } from '../operationHandlers/ReadContainerHandler'
import { DeleteContainerHandler } from '../operationHandlers/DeleteContainerHandler'
import { ReadBlobHandler } from '../operationHandlers/ReadBlobHandler'
import { WriteBlobHandler } from '../operationHandlers/WriteBlobHandler'
import { UpdateBlobHandler } from '../operationHandlers/UpdateBlobHandler'
import { DeleteBlobHandler } from '../operationHandlers/DeleteBlobHandler'
import { UnknownOperationCatchAll } from '../operationHandlers/UnknownOperationCatchAll'
import { WacLdpTask } from '../api/http/HttpParser'
import { StoreManager } from '../rdf/StoreManager'
import { WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { checkAccess, AccessCheckTask } from '../authorization/checkAccess'
import debug from 'debug'
import OperationHandler from '../operationHandlers/OperationHandler'

export class DefaultOperationFactory implements IOperationFactory {
  resourceStore: IResourceStore
  constructor (resourceStore: IResourceStore) {
    this.resourceStore = resourceStore
  }
  createOperation (method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, operationOptions: any): IOperation {
    const operationHandlers = [
      new OptionsHandler(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions),
      new GlobReadHandler(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions),
      new ContainerMemberAddHandler(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions),
      new ReadContainerHandler(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions),
      new DeleteContainerHandler(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions),
      new ReadBlobHandler(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions),
      new WriteBlobHandler(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions),
      new UpdateBlobHandler(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions),
      new DeleteBlobHandler(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions),
      new UnknownOperationCatchAll(method, target, representationPreferences, this.resourceStore as StoreManager, operationOptions)
    ]
    for (let i = 0; i < operationHandlers.length; i++) {
      if (operationHandlers[i].canHandle()) {
        return operationHandlers[i]
      }
    }
    throw new ErrorResult(ResultType.InternalServerError)
  }
}

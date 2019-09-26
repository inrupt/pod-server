import { WacLdpTask } from '../api/http/HttpParser'
import { StoreManager } from '../rdf/StoreManager'
import { WacLdpResponse } from '../api/http/HttpResponder'

export default interface OperationHandler {
  canHandle: (wacLdpTask: WacLdpTask) => boolean
  requiredPermissions: Array<URL>
  handle: (wacLdpTask: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean) => Promise<WacLdpResponse>
}

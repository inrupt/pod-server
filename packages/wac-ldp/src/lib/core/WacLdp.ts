import * as http from 'http'
import Debug from 'debug'
import { QuadAndBlobStore } from '../storage/QuadAndBlobStore'
import { WacLdpTask } from '../api/http/HttpParser'
import { sendHttpResponse, WacLdpResponse, ErrorResult, ResultType } from '../api/http/HttpResponder'
import { EventEmitter } from 'events'
import { StoreManager } from '../rdf/StoreManager'
import { checkAccess, AccessCheckTask } from '../authorization/checkAccess'
import { getAppModes } from '../authorization/appIsTrustedForMode'
import { setAppModes } from '../rdf/setAppModes'
import { BlobTree } from '../storage/BlobTree'
import { AclManager } from '../authorization/AclManager'
import { objectToStream, makeResourceData } from '../rdf/ResourceDataUtils'
import { IHttpHandler, IOperationFactory, IAuthorizer, PermissionSet } from 'solid-server-ts'
import { DefaultOperationFactory } from './DefaultOperationFactory'
import { ACL } from '../rdf/rdf-constants'

export const BEARER_PARAM_NAME = 'bearer_token'

const debug = Debug('app')

function addBearerToken (baseUrl: URL, bearerToken: string | undefined): URL {
  const ret = new URL(baseUrl.toString())
  if (bearerToken) {
    ret.searchParams.set(BEARER_PARAM_NAME, bearerToken)
  }
  return ret
}

export interface WacLdpOptions {
  storage: QuadAndBlobStore
  aud: string
  updatesViaUrl: URL,
  skipWac: boolean,
  idpHost: string,
  usesHttps: boolean
}

export class WacLdp extends EventEmitter implements IHttpHandler {
  operationFactory: IOperationFactory
  authorizer: IAuthorizer
  aud: string
  storeManager: StoreManager
  aclManager: AclManager
  updatesViaUrl: URL
  skipWac: boolean
  idpHost: string
  usesHttps: boolean
  constructor (operationFactory: IOperationFactory, authorizer: IAuthorizer, options: WacLdpOptions) {
    super()
    this.operationFactory = operationFactory
    this.authorizer = authorizer
    const serverRootDomain: string = new URL(options.aud).host
    debug({ serverRootDomain })
    this.storeManager = new StoreManager(serverRootDomain, options.storage)
    this.aclManager = new AclManager(this.storeManager)
    this.aud = options.aud
    this.updatesViaUrl = options.updatesViaUrl
    this.skipWac = options.skipWac
    this.idpHost = options.idpHost
    this.usesHttps = options.usesHttps
  }
  setRootAcl (storageRoot: URL, owner: URL) {
    return this.aclManager.setRootAcl(storageRoot, owner)
  }
  setPublicAcl (inboxUrl: URL, owner: URL, modeName: string) {
    return this.aclManager.setPublicAcl(inboxUrl, owner, modeName)
  }
  createLocalDocument (url: URL, contentType: string, body: string) {
    return this.storeManager.setResourceData(url, objectToStream(makeResourceData(contentType, body)))
  }
  containerExists (url: URL) {
    return this.storeManager.getLocalContainer(url).exists()
  }

  async canHandle (httpReq: http.IncomingMessage): Promise<boolean> {
    return true
  }

  // legacy synonym:
  async handler (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void> {
    return this.handle(httpReq, httpRes)
  }

  async handleOperation (task: WacLdpTask, skipWac: boolean, aud: string): Promise<WacLdpResponse> {
    let handler = (this.operationFactory as DefaultOperationFactory).createOperation(task.method, task.target, task, {
      aud: this.aud,
      appendOnly: false,
      skipWac: this.skipWac
    })
    let appendOnly = false
    if (!skipWac) {
      appendOnly = await checkAccess({
        url: task.fullUrl(),
        isContainer: task.isContainer(),
        webId: await task.webId(),
        origin: await task.origin(),
        requiredPermissions: handler.requiredPermissions,
        storeManager: this.storeManager
      } as AccessCheckTask) // may throw if access is denied
    }
    if (appendOnly) {
      handler = (this.operationFactory as DefaultOperationFactory).createOperation(task.method, task.target, task, {
        aud: this.aud,
        appendOnly: true,
        skipWac: this.skipWac
      })
    }
    // debug('calling operation handler', i, task, this.aud, skipWac, appendOnly)
    const responseDescription = await handler.execute()
    return responseDescription as WacLdpResponse
  }

  async handle (httpReq: http.IncomingMessage, httpRes: http.ServerResponse): Promise<void> {
    debug(`\n\n`, httpReq.method, httpReq.url, httpReq.headers)

    let response: WacLdpResponse
    let storageOrigin: string | undefined
    let requestOrigin: string | undefined
    let bearerToken: string | undefined
    try {
      const wacLdpTask: WacLdpTask = new WacLdpTask(this.aud, httpReq, this.usesHttps)
      storageOrigin = wacLdpTask.storageOrigin()
      requestOrigin = await wacLdpTask.origin()
      bearerToken = wacLdpTask.bearerToken()
      response = await this.handleOperation(wacLdpTask, this.skipWac, this.aud)
      debug('resourcesChanged', response.resourceData)
      if (response.resourcesChanged) {
        response.resourcesChanged.forEach((url: URL) => {
          debug('emitting change event', url)
          this.emit('change', { url })
        })
      }
    } catch (error) {
      debug('errored', error)
      if (error.resultType) {
        debug('error has a responseStatus', error.resultType)
        response = error as WacLdpResponse
      } else {
        debug('error has no resultType', error.message, error)
        response = new ErrorResult(ResultType.InternalServerError) as unknown as WacLdpResponse
      }
    }
    try {
      debug('response is', response)
      return sendHttpResponse(response, {
        updatesVia: addBearerToken(this.updatesViaUrl, bearerToken),
        storageOrigin,
        idpHost: this.idpHost,
        originToAllow: requestOrigin || '*'
      }, httpRes)
    } catch (error) {
      debug('errored while responding', error)
    }
  }
  getTrustedAppModes (webId: URL, origin: string) {
    return getAppModes(webId, origin, this.storeManager)
  }
  setTrustedAppModes (webId: URL, origin: string, modes: Array<URL>) {
    return setAppModes(webId, origin, modes, this.storeManager.storage)
  }
  async hasAccess (webId: URL, origin: string, url: URL, mode: URL): Promise<boolean> {
    let requiredPermissions: PermissionSet
    if (url === ACL.Read) {
      requiredPermissions = new PermissionSet({ read: true })
    } else if (url === ACL.Append) {
      requiredPermissions = new PermissionSet({ append: true })
    } else if (url === ACL.Write) {
      requiredPermissions = new PermissionSet({ write: true })
    } else if (url === ACL.Control) {
      requiredPermissions = new PermissionSet({ control: true })
    } else {
      debug('mode not recognized!')
      return false
    }
    debug('hasAccess calls checkAccess', {
      url,
      webId,
      origin,
      requiredPermissions,
      storeManager: 'this.storeManager'
    })
    try {
      const appendOnly = await checkAccess({
        url,
        webId,
        origin,
        requiredPermissions,
        storeManager: this.storeManager
      })
      debug({ appendOnly })
      return !appendOnly
    } catch (e) {
      debug('access check error was thrown, so returning no to hasAccess question')
      return false
    }
  }
}

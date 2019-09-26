
import { OriginCheckTask, appIsTrustedForMode } from './appIsTrustedForMode'
import { ModesCheckTask, determineAllowedAgentsForModes, AccessModes, AGENT_CLASS_ANYBODY, AGENT_CLASS_ANYBODY_LOGGED_IN } from './determineAllowedAgentsForModes'
import { ACL } from '../rdf/rdf-constants'
import Debug from 'debug'
import { TaskType } from '../api/http/HttpParser'
import { ErrorResult, ResultType } from '../api/http/HttpResponder'
import { StoreManager } from '../rdf/StoreManager'
import { ACL_SUFFIX, AclManager } from './AclManager'
import PermissionSet from 'solid-server-ts'

const debug = Debug('checkAccess')

async function modeAllowed (mode: URL, allowedAgentsForModes: AccessModes, webId: URL | undefined, origin: string | undefined, storeManager: StoreManager): Promise<boolean> {
  // first check agent:
  const agents = (allowedAgentsForModes as any)[mode.toString()]
  const webIdAsString: string | undefined = (webId ? webId.toString() : undefined)
  debug(mode.toString(), agents, webId ? webId.toString() : undefined)
  if ((agents.indexOf(AGENT_CLASS_ANYBODY.toString()) === -1) &&
      (agents.indexOf(AGENT_CLASS_ANYBODY_LOGGED_IN.toString()) === -1) &&
      (!webIdAsString || agents.indexOf(webIdAsString) === -1)) {
    debug('agent check returning false')
    return false
  }
  debug('agent check passed!')
  if (!origin) {
    debug('no origin header, allowed')
    return true
  }
  if (!webId) {
    // See https://github.com/inrupt/wac-ldp/issues/169
    debug('no webId, origin header irrelevant')
    return true
  }
  // then check origin:
  debug('checking origin!')
  return appIsTrustedForMode({
    origin,
    mode,
    resourceOwners: allowedAgentsForModes['http://www.w3.org/ns/auth/acl#Control'].map(str => new URL(str))
  } as OriginCheckTask, storeManager)
}

export interface AccessCheckTask {
  url: URL
  webId: URL | undefined
  origin: string
  requiredPermissions: any /* PermissionSet */
  storeManager: StoreManager
}

function urlHasSuffix (url: URL, suffix: string) {
  return (url.toString().substr(-suffix.length) === suffix)
}

function removeUrlSuffix (url: URL, suffix: string): URL {
  const urlStr = url.toString()
  const remainingLength: number = urlStr.length - suffix.length
  if (remainingLength < 0) {
    throw new Error('no suffix match (URL shorter than suffix)')
  }
  if (urlStr.substring(remainingLength) !== suffix) {
    throw new Error('no suffix match')
  }
  return new URL(urlStr.substring(0, remainingLength))
}

function urlEquals (one: URL, two: URL) {
  return one.toString() === two.toString()
}
export async function checkAccess (task: AccessCheckTask): Promise<boolean> {
  const permissionSetUrlArr = []
  if (task.requiredPermissions.read) {
    permissionSetUrlArr.push(ACL.Read)
  }
  if (task.requiredPermissions.write) {
    permissionSetUrlArr.push(ACL.Write)
  }
  if (task.requiredPermissions.append) {
    permissionSetUrlArr.push(ACL.Append)
  }
  if (task.requiredPermissions.write) {
    permissionSetUrlArr.push(ACL.Write)
  }
  if (task.requiredPermissions.control) {
    permissionSetUrlArr.push(ACL.Control)
  }

  debug('AccessCheckTask', task.url.toString(), task.webId ? task.webId.toString() : undefined, task.origin)
  debug(permissionSetUrlArr.map(url => url.toString()), task.requiredPermissions)
  let baseResourceUrl: URL
  let resourceIsAclDocument
  if (urlHasSuffix(task.url, ACL_SUFFIX)) {
    // editing an ACL file requires acl:Control on the base resource
    baseResourceUrl = removeUrlSuffix(task.url, ACL_SUFFIX)
    resourceIsAclDocument = true
  } else {
    baseResourceUrl = task.url
    resourceIsAclDocument = false
  }
  const aclManager = new AclManager(task.storeManager)
  const { aclGraph, targetUrl, contextUrl } = await aclManager.readAcl(baseResourceUrl)
  const resourceIsTarget = urlEquals(baseResourceUrl, targetUrl)
  debug('calling allowedAgentsForModes', 'aclGraph', resourceIsTarget, targetUrl.toString(), contextUrl.toString())

  const allowedAgentsForModes: AccessModes = await determineAllowedAgentsForModes({
    aclGraph,
    resourceIsTarget,
    targetUrl,
    contextUrl
  } as ModesCheckTask)
  debug('allowedAgentsForModes')
  let requiredPermissions
  if (resourceIsAclDocument) {
    requiredPermissions = [ ACL.Control ]
  } else {
    requiredPermissions = permissionSetUrlArr
  }
  let appendOnly = false

  // throw if agent or origin does not have access
  await Promise.all(requiredPermissions.map(async (mode: URL) => {
    debug('required mode', mode.toString())
    if (await modeAllowed(mode, allowedAgentsForModes, task.webId, task.origin, task.storeManager)) {
      debug(mode, 'is allowed!')
      return
    }
    debug(`mode ${mode.toString()} is not allowed, but checking for appendOnly now`)
    // SPECIAL CASE: append-only
    if (mode === ACL.Write && await modeAllowed(ACL.Append, allowedAgentsForModes, task.webId, task.origin, task.storeManager)) {
      appendOnly = true
      debug('write was requested and is not allowed but append is; setting appendOnly to true')
      return
    }
    debug(`Access denied! ${mode.toString()} access is required for this task, webid is "${task.webId ? task.webId.toString() : undefined}"`)
    throw new ErrorResult(ResultType.AccessDenied)
  }))
  // webId may be reused to check individual ACLs on individual member resources for Glob
  // appendOnly may be used to restrict PATCH operations
  return appendOnly
}

import Debug from 'debug'
import { urlToPath } from '../storage/BlobTree'
import { StoreManager, getEmptyGraph, getGraphLocal } from '../rdf/StoreManager'
import { makeResourceData, bufferToStream } from '../rdf/ResourceDataUtils'
import { IAuthorizer, ICredentials, IResourceIdentifier, PermissionSet } from 'solid-server-ts'

// Example ACL file, this one is on https://michielbdejong.inrupt.net/.acl:

// # Root ACL resource for the user account
// @prefix acl: <http://www.w3.org/ns/auth/acl#>.

// <#owner>
//     a acl:Authorization;

//     acl:agent <https://michielbdejong.inrupt.net/profile/card#me> ;

//     # Optional owner email, to be used for account recovery:
//     acl:agent <mailto:michiel@unhosted.org>;

//     # Set the access to the root storage folder itself
//     acl:accessTo </>;

//     # All resources will inherit this authorization, by default
//     acl:defaultForNew </>;

//     # The owner has all of the access modes allowed
//     acl:mode
//         acl:Read, acl:Write, acl:Control.

// # Data is private by default; no other agents get access unless specifically
// # authorized in other .acls
const debug = Debug('AclFinder')

export const ACL_SUFFIX = '.acl'

  //  cases:
  // * request path foo/bar/
  // * resource path foo/bar/
  //   * acl path foo/bar/.acl
  //   * acl path foo/.acl (filter on acl:default)
  // * request path foo/bar/baz
  // * resource path foo/bar/baz
  //   * acl path foo/bar/baz.acl
  //   * acl path foo/bar/.acl (filter on acl:default)
  // * request path foo/bar/.acl
  // * resource path foo/bar/
  //   * acl path foo/bar/.acl (look for acl:Control)
  //   * acl path foo/.acl (filter on acl:default, look for acl:Control)
  // * request path foo/bar/baz.acl
  // * resource path foo/bar/baz
  //   * acl path foo/bar/baz.acl (look for acl:Control)
  //   * acl path foo/bar/.acl (filter on acl:default, look for acl:Control)

  // this method should act on the resource path (not the request path) and
  // filter on acl:default and just give the ACL triples that
  // apply for the resource path, so that the acl path becomes irrelevant
  // from there on.
  // you could argue that readAcl should fetch ACL docs through graph fetcher and not directly
  // from storage
export class AclManager implements IAuthorizer {
  storeManager: StoreManager
  constructor (storeManager: StoreManager) {
    this.storeManager = storeManager
  }
  async readAcl (resourceUrl: URL): Promise<{ aclGraph: any, targetUrl: URL, contextUrl: URL }> {
    debug('readAcl', resourceUrl.toString())
    const resourcePath = urlToPath(resourceUrl)
    let currentGuessPath = resourcePath
    let currentIsContainer = resourcePath.isContainer
    let aclDocPath = (resourcePath.isContainer ? currentGuessPath.toChild(ACL_SUFFIX, false) : currentGuessPath.appendSuffix(ACL_SUFFIX))
    debug('aclDocPath from resourcePath', resourcePath, aclDocPath)
    let isAdjacent = true
    let currentGuessBlob = this.storeManager.storage.getBlobAtPath(aclDocPath)
    let currentGuessBlobExists = await currentGuessBlob.exists()
    debug('aclDocPath', aclDocPath.toString(), currentGuessBlobExists)
    while (!currentGuessBlobExists) {
      if (currentGuessPath.isRoot()) {
        // root ACL, nobody has access:
        return { aclGraph: getEmptyGraph(), targetUrl: currentGuessPath.toUrl(), contextUrl: aclDocPath.toUrl() }
      }
      currentGuessPath = currentGuessPath.toParent()
      isAdjacent = false
      currentIsContainer = true
      aclDocPath = (currentIsContainer ? currentGuessPath.toChild(ACL_SUFFIX, false) : currentGuessPath.appendSuffix(ACL_SUFFIX))
      currentGuessBlob = this.storeManager.storage.getBlobAtPath(aclDocPath)
      currentGuessBlobExists = await currentGuessBlob.exists()
      debug('aclDocPath', aclDocPath.toString(), currentGuessBlobExists)
    }
    return {
      aclGraph: await getGraphLocal(currentGuessBlob),
      targetUrl: currentGuessPath.toUrl(),
      contextUrl: aclDocPath.toUrl()
    }
  }
  setRootAcl (storageRoot: URL, owner: URL): Promise<void> {
    let rootString = storageRoot.toString()
    if (rootString.substr(-1) !== '/') {
      rootString += '/'
    }
    const rootAclUrl = new URL(rootString + ACL_SUFFIX)

    const obj = makeResourceData('text/turtle', [
      `@prefix acl: <http://www.w3.org/ns/auth/acl#>.`,
      `<#owner>`,
      `  a acl:Authorization;`,
      `  acl:agent <${owner.toString()}>;`,
      `  acl:accessTo </>;`,
      `  acl:default </>;`,
      `  acl:mode`,
      `    acl:Read, acl:Write, acl:Control.`
    ].join('\n'))
    const buffer = Buffer.from(JSON.stringify(obj))
    return this.storeManager.setResourceData(rootAclUrl, bufferToStream(buffer))
  }
  setPublicAcl (containerUrl: URL, owner: URL, modeName: string): Promise<void> {
    let containerUrlStr = containerUrl.toString()
    if (containerUrlStr.substr(-1) !== '/') {
      containerUrlStr += '/'
    }
    const containerAclUrl = new URL(containerUrlStr + ACL_SUFFIX)

    const obj = makeResourceData('text/turtle', [
      `@prefix acl: <http://www.w3.org/ns/auth/acl#>.`,
      `@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.`,
      `<#owner>`,
      `  a acl:Authorization;`,
      `  acl:agent <${owner.toString()}>;`,
      `  acl:accessTo <./>;`,
      `  acl:default <./>;`,
      `  acl:mode`,
      `    acl:Read, acl:Write, acl:Control.`,
      `<#public>`,
      `  a acl:Authorization;`,
      `  acl:agent foaf:Agent;`,
      `  acl:accessTo <./>;`,
      `  acl:default <./>;`,
      `  acl:mode`,
      `    acl:${modeName}.`
    ].join('\n'))
    const buffer = Buffer.from(JSON.stringify(obj))
    return this.storeManager.setResourceData(containerAclUrl, bufferToStream(buffer))
  }

  async ensurePermissions (agent: ICredentials,
    target: IResourceIdentifier,
    requiredPermissions: PermissionSet
  ): Promise<boolean> {
    // TODO: implement!!
    return false
  }
}

import * as http from 'http'
import { URL } from 'url'
import uuid from 'uuid/v4'
import Debug from 'debug'
import { determineWebIdAndOrigin } from '../authentication/determineWebIdAndOrigin'
import { RdfType, determineRdfType } from '../../rdf/ResourceDataUtils'
import { IResourceIdentifier, IRepresentationPreferences } from 'solid-server-ts'

const debug = Debug('HttpParser')

export enum TaskType {
  containerRead,
  containerMemberAdd,
  containerDelete,
  globRead,
  blobRead,
  blobWrite,
  blobUpdate,
  blobDelete,
  getOptions,
  unknown
}

function determineOriginFromHeaders (headers: http.IncomingHttpHeaders): string | undefined {
  debug('determining origin', headers)
  if (Array.isArray(headers.origin)) {
    return headers.origin[0]
  } else {
    return headers.origin
  }
}

export class WacLdpTask implements IRepresentationPreferences {
  method: string
  target: IResourceIdentifier
  cache: {
    bearerToken?: { value: string | undefined },
    isContainer?: { value: boolean },
    contentType?: { value: string | undefined },
    ifMatch?: { value: string | undefined },
    ifNoneMatchStar?: { value: boolean },
    ifNoneMatchList?: { value: Array<string> | undefined },
    wacLdpTaskType?: { value: TaskType },
    sparqlQuery?: { value: string | undefined },
    rdfType?: { value: RdfType },
    omitBody?: { value: boolean },
    fullUrl?: { value: URL },
    storageHost?: { value: string },
    preferMinimalContainer?: { value: boolean },
    childNameToCreate?: { value: string },
    requestBody?: { value: Promise<string> },
    webIdAndOrigin?: { value: Promise<{ webId: URL | undefined, origin: string | undefined }> }
  }
  defaultHost: string
  ifMatchRequired: boolean
  usesHttps: boolean

  httpReq: http.IncomingMessage
  constructor (defaultHost: string, httpReq: http.IncomingMessage, usesHttps: boolean) {
    this.method = httpReq.method || 'UNDEFINED'
    this.target = {
      domain: '',
      path: '',
      isAcl: false
    } as IResourceIdentifier
    this.defaultHost = defaultHost
    this.httpReq = httpReq
    this.cache = {}
    this.usesHttps = usesHttps
    this.ifMatchRequired = (httpReq.method === 'PUT') // only PUT requires If-Match, POST does not
  }
  isContainer () {
    if (!this.cache.isContainer) {
      this.cache.isContainer = {
        value: (!!this.httpReq.url && (
          this.httpReq.url.substr(-1) === '/' || this.httpReq.url.substr(-2) === '/*'))
      }
    }
    return this.cache.isContainer.value
  }

  bearerToken (): string | undefined {
    function determineBearerToken (headers: http.IncomingHttpHeaders): string | undefined {
      try {
        debug(headers, 'authorization')
        return headers['authorization'] && headers['authorization'].substring('Bearer '.length)
      } catch (error) {
        debug('no bearer token found') // TODO: allow other ways of providing a PoP token
      }
      return undefined
    }

    if (!this.cache.bearerToken) {
      this.cache.bearerToken = {
        value: determineBearerToken(this.httpReq.headers)
      }
    }
    return this.cache.bearerToken.value
  }

  origin (): Promise<string | undefined> {
    if (!this.cache.webIdAndOrigin) {
      this.cache.webIdAndOrigin = {
        value: determineWebIdAndOrigin(this.bearerToken(), determineOriginFromHeaders(this.httpReq.headers))
      }
    }
    return this.cache.webIdAndOrigin.value.then(obj => obj.origin)
  }

  childNameToCreate (): string {
    function determineChildNameToCreate (headers: http.IncomingHttpHeaders): string {
      debug('determining child name to create', headers)
      if (headers) {
        if (Array.isArray(headers.slug)) {
          return headers.slug[0]
        } else if (headers.slug) {
          return headers.slug
        }
      }
      return uuid()
    }

    if (!this.cache.childNameToCreate) {
      this.cache.childNameToCreate = {
        value: determineChildNameToCreate(this.httpReq.headers)
      }
    }
    return this.cache.childNameToCreate.value
  }
  contentType (): string | undefined {
    function determineContentType (headers: http.IncomingHttpHeaders): string | undefined {
      debug('content-type', headers)
      return headers['content-type']
    }

    if (!this.cache.contentType) {
      this.cache.contentType = {
        value: determineContentType(this.httpReq.headers)
      }
    }
    return this.cache.contentType.value
  }

  ifMatch (): string | undefined {
    function determineIfMatch (headers: http.IncomingHttpHeaders): string | undefined {
      try {
        debug(headers)
        return headers['if-match'] && headers['if-match'].split('"')[1]
      } catch (error) {
        // return undefined
      }
    }

    if (!this.cache.ifMatch) {
      this.cache.ifMatch = {
        value: determineIfMatch(this.httpReq.headers)
      }
    }
    return this.cache.ifMatch.value
  }

  ifNoneMatchStar (): boolean {
    function determineIfNoneMatchStar (headers: http.IncomingHttpHeaders): boolean {
      try {
        return headers['if-none-match'] === '*'
      } catch (error) {
        return false
      }
    }

    if (!this.cache.ifNoneMatchStar) {
      this.cache.ifNoneMatchStar = {
        value: determineIfNoneMatchStar(this.httpReq.headers)
      }
    }
    return this.cache.ifNoneMatchStar.value
  }

  ifNoneMatchList (): Array<string> | undefined {
    function determineIfNoneMatchList (headers: http.IncomingHttpHeaders): Array<string> | undefined {
      try {
        if (headers['if-none-match'] && headers['if-none-match'] !== '*') {
          return headers['if-none-match'].split(',').map(x => x.split('"')[1])
        }
      } catch (error) {
        // return undefined
      }
    }

    if (!this.cache.ifNoneMatchList) {
      this.cache.ifNoneMatchList = {
        value: determineIfNoneMatchList(this.httpReq.headers)
      }
    }
    return this.cache.ifNoneMatchList.value
  }

  wacLdpTaskType (): TaskType {
    function determineTaskType (method: string | undefined, urlStr: string | undefined): TaskType {
      if (!method || !urlStr) {
        debug('no method or no url! task type unknown', method, urlStr)
        return TaskType.unknown
      }
      // if the URL end with a / then the path indicates a container
      // if the URL end with /* then the path indicates a glob
      // in all other cases, the path indicates a blob

      let lastUrlChar = urlStr.substr(-1)
      if (['/', '*'].indexOf(lastUrlChar) === -1) {
        lastUrlChar = '(other)'
      }

      const methodMap: { [lastUrlChar: string]: { [method: string]: TaskType | undefined }} = {
        '/': {
          OPTIONS: TaskType.getOptions,
          HEAD: TaskType.containerRead,
          GET: TaskType.containerRead,
          POST: TaskType.containerMemberAdd,
          PUT: TaskType.containerMemberAdd,
          DELETE: TaskType.containerDelete
        },
        '*': {
          OPTIONS: TaskType.getOptions,
          HEAD: TaskType.globRead,
          GET: TaskType.globRead
        },
        '(other)': {
          OPTIONS: TaskType.getOptions,
          HEAD: TaskType.blobRead,
          GET: TaskType.blobRead,
          PUT: TaskType.blobWrite,
          PATCH: TaskType.blobUpdate,
          DELETE: TaskType.blobDelete
        }
      }
      debug('determining task type', lastUrlChar, method, methodMap[lastUrlChar][method])
      const taskType = methodMap[lastUrlChar][method]
      return (taskType === undefined ? TaskType.unknown : taskType)
    }

    if (!this.cache.wacLdpTaskType) {
      this.cache.wacLdpTaskType = {
        value: determineTaskType(this.httpReq.method, this.httpReq.url)
      }
    }
    return this.cache.wacLdpTaskType.value
  }

  sparqlQuery (): string | undefined {
    function determineSparqlQuery (urlPath: string | undefined): string | undefined {
      const url = new URL('http://example.com' + urlPath)
      debug('determining sparql query', urlPath, url.searchParams, url.searchParams.get('query'))
      return url.searchParams.get('query') || undefined
    }

    if (!this.cache.sparqlQuery) {
      this.cache.sparqlQuery = {
        value: determineSparqlQuery(this.httpReq.url)
      }
    }
    return this.cache.sparqlQuery.value
  }

  isReadOperation (): boolean {
    return (!!this.httpReq.method && ['HEAD', 'GET'].indexOf(this.httpReq.method) !== -1)
  }

  rdfType (): RdfType {
    function determineRdfTypeFromHeaders (headers: http.IncomingHttpHeaders): RdfType {
      return determineRdfType(headers ? headers['content-type'] : undefined)
    }

    if (!this.cache.rdfType) {
      this.cache.rdfType = {
        value: determineRdfTypeFromHeaders(this.httpReq.headers)
      }
    }
    return this.cache.rdfType.value
  }

  rdfTypeMatches (target: string): boolean {
    const taskRdfType = this.rdfType()
    return ((taskRdfType === RdfType.NoPref) || (determineRdfType(target) === taskRdfType))
  }

  omitBody (): boolean {
    function determineOmitBody (method: string | undefined): boolean {
      if (!method) {
        return true
      }
      return (['OPTIONS', 'HEAD'].indexOf(method) !== -1)
    }

    if (!this.cache.omitBody) {
      this.cache.omitBody = {
        value: determineOmitBody(this.httpReq.method)
      }
    }
    return this.cache.omitBody.value
  }

  fullUrl (): URL {
    function determineFullUrl (hostname: string, httpReq: http.IncomingMessage, usesHttps: boolean): URL {
      if (httpReq.url && httpReq.url.substr(-1) === '*') {
        return new URL(hostname + httpReq.url.substring(0, httpReq.url.length - 1))
      }
      return new URL(hostname + httpReq.url)
    }

    if (!this.cache.fullUrl) {
      this.cache.fullUrl = {
        value: determineFullUrl(this.storageOrigin(), this.httpReq, this.usesHttps)
      }
    }
    return this.cache.fullUrl.value
  }

  storageOrigin (): string {
    function determineStorageOrigin (headers: http.IncomingHttpHeaders, usesHttps: boolean): string | undefined {
      debug('determining storage origin', headers)
      if (headers && headers.host) {
        if (Array.isArray(headers.host)) {
          return `http${(usesHttps ? 's' : '')}://` + headers.host[0]
        } else {
          return `http${(usesHttps ? 's' : '')}://` + headers.host
        }
      }
    }

    if (!this.cache.storageHost) {
      this.cache.storageHost = {
        value: determineStorageOrigin(this.httpReq.headers, this.usesHttps) || this.defaultHost
      }
    }
    return this.cache.storageHost.value
  }

  preferMinimalContainer (): boolean {
    function determinePreferMinimalContainer (headers: http.IncomingHttpHeaders): boolean {
      // FIXME: this implementation is just a placeholder, should find a proper prefer-header parsing lib for this:
      if (headers['prefer'] && headers['prefer'] === 'return=representation; include="http://www.w3.org/ns/ldp#PreferMinimalContainer"') {
        return true
      }
      if (headers['prefer'] && headers['prefer'] === 'return=representation; omit="http://www.w3.org/ns/ldp#PreferContainment"') {
        return true
      }
      return false
    }

    if (!this.cache.preferMinimalContainer) {
      this.cache.preferMinimalContainer = {
        value: determinePreferMinimalContainer(this.httpReq.headers)
      }
    }
    return this.cache.preferMinimalContainer.value
  }

  requestBody (): Promise<string> {
    let requestBodyStr: string
    if (!this.cache.requestBody) {
      this.cache.requestBody = {
        value: new Promise(resolve => {
          requestBodyStr = ''
          this.httpReq.on('data', chunk => {
            requestBodyStr += chunk
          })
          this.httpReq.on('end', () => {
            resolve(requestBodyStr)
          })
        })
      }
    }
    return this.cache.requestBody.value
  }
  // edge case if we can still consider this as lazy request parsing,
  // but had to move it here because most operation handlers rely on it.
  webId (): Promise<URL | undefined> {
    if (!this.cache.webIdAndOrigin) {
      this.cache.webIdAndOrigin = {
        value: determineWebIdAndOrigin(this.bearerToken(), determineOriginFromHeaders(this.httpReq.headers))
      }
    }
    return this.cache.webIdAndOrigin.value.then(obj => obj.webId)
  }

  // this one is maybe a bit weird too, open to suggestions
  // for making this simpler
  convertToBlobWrite (memberName: string) {
    if (!this.isContainer()) {
      throw new Error('only containers can be converted to blob writes')
    }
    if (memberName.indexOf('/') !== -1) {
      throw new Error('memberName cannot contain slashes')
    }
    const newUrlStr: string = this.fullUrl().toString() + memberName
    this.cache.fullUrl = {
      value: new URL(newUrlStr)
    }
    this.cache.wacLdpTaskType = { value: TaskType.blobWrite }
    this.cache.isContainer = { value: false }

    debug('converted', this.cache)
  }
}

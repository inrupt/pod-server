import * as http from 'http'
import Debug from 'debug'
import { ResourceData } from '../../rdf/ResourceDataUtils'
import { LDP } from '../../rdf/rdf-constants'
import ResponseDescription from 'solid-server-ts'
const Link = require('http-link-header')

const debug = Debug('HttpResponder')

export enum ResultType {
  CouldNotParse,
  AccessDenied,
  PreconditionFailed,
  PreconditionRequired,
  NotModified,
  NotFound,
  QuotaExceeded,
  OkayWithBody,
  OkayWithoutBody,
  Created,
  MethodNotAllowed,
  InternalServerError
}

export class ErrorResult extends Error {
  resultType: ResultType
  constructor (resultType: ResultType) {
    super('error result')
    this.resultType = resultType
  }
}
export interface WacLdpResponse /* extends ResponseDescription */ {
  resourcesChanged?: Array<URL>
  resultType: ResultType
  resourceData?: ResourceData
  createdLocation?: URL
  isContainer: boolean
}

type ResponseContent = {
  responseStatus: number,
  responseBody?: string,
  constrainedBy?: string
}
type Responses = { [resultType in keyof typeof ResultType]: ResponseContent }

const responses: Responses = {
  [ResultType.OkayWithBody]: {
    responseStatus: 200,
    responseBody: undefined
  },
  [ResultType.CouldNotParse]: {
    responseStatus: 405,
    responseBody: 'Method not allowed',
    constrainedBy: 'could-not-parse'
  },
  [ResultType.AccessDenied]: {
    responseStatus: 401,
    responseBody: 'Access denied',
    constrainedBy: 'wac'
  },
  [ResultType.PreconditionFailed]: {
    responseStatus: 412,
    responseBody: 'Precondition failed',
    constrainedBy: 'conflict'
  },
  [ResultType.PreconditionFailed]: {
    responseStatus: 428,
    responseBody: 'Precondition required',
    constrainedBy: 'precondition-required'
  },
  [ResultType.NotFound]: {
    responseStatus: 404,
    responseBody: 'Not found',
    constrainedBy: 'not-found'
  },
  [ResultType.NotModified]: {
    responseStatus: 304,
    responseBody: 'Not modified'
  },
  [ResultType.Created]: {
    responseStatus: 201,
    responseBody: 'Created'
  },
  [ResultType.OkayWithoutBody]: {
    responseStatus: 204,
    responseBody: 'No Content'
  },
  [ResultType.MethodNotAllowed]: {
    responseStatus: 405,
    responseBody: 'Method not allowed',
    constrainedBy: 'unknown-method'
  },
  [ResultType.InternalServerError]: {
    responseStatus: 500,
    responseBody: 'Internal server error'
  }
} as unknown as Responses

export async function sendHttpResponse (task: WacLdpResponse, options: { updatesVia: URL, storageOrigin: string | undefined, idpHost: string, originToAllow: string }, httpRes: http.ServerResponse) {
  debug('sendHttpResponse!', task)

  debug(responses[task.resultType])
  const responseStatus = responses[task.resultType].responseStatus
  const responseBody = responses[task.resultType].responseBody || (task.resourceData ? task.resourceData.body : '')

  let links = new Link()
  links.set({ rel: 'acl', uri: '.acl' })
  links.set({ rel: 'describedBy', uri: '.meta' })
  links.set({ rel: 'type', uri: LDP.Resource.toString() })
  if (task.isContainer) {
    links.set({ rel: 'type', uri: LDP.BasicContainer.toString() })
  }
  links.set({ rel: 'http://openid.net/specs/connect/1.0/issuer', uri: `https://${options.idpHost}` })
  if (options.storageOrigin) {
    links.set({ rel: 'service', uri: `${options.storageOrigin}/.well-known/solid` })
  }
  if (responses[task.resultType].constrainedBy) {
    links.set({ rel: 'http://www.w3.org/ns/ldp#constrainedBy', uri: `http://www.w3.org/ns/ldp#constrainedBy-${responses[task.resultType].constrainedBy}` })
  }

  const responseHeaders = {
    'Link':  links.toString(),
    'X-Powered-By': 'inrupt pod-server (alpha)',
    'Vary': 'Accept, Authorization, Origin',
    'Allow': 'GET, HEAD, POST, PUT, DELETE, PATCH',
    'Accept-Patch': 'application/sparql-update',
    'Accept-Post': 'application/sparql-update',
    'Access-Control-Allow-Origin': options.originToAllow,
    'Access-Control-Allow-Headers': 'Authorization, Accept, Content-Type, Origin, Referer, X-Requested-With, Link, Slug',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, PATCH',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'User, Location, Link, Vary, Last-Modified, ETag, Accept-Patch, Accept-Post, Updates-Via, Allow, WAC-Allow, Content-Length, WWW-Authenticate',
    'Updates-Via': options.updatesVia.toString()
  } as any
  if (task.resourceData) {
    responseHeaders['Content-Type'] = task.resourceData.contentType
  } else {
    responseHeaders['Content-Type'] = 'text/plain'
    // responseHeaders['Transfer-Encoding'] = 'chunked' // see https://github.com/solid/test-suite/issues/24
  }
  if (task.createdLocation) {
    responseHeaders['Location'] = task.createdLocation.toString()
  }
  if (task.resultType === ResultType.AccessDenied) {
    responseHeaders['WWW-Authenticate'] = `Bearer realm="${options.storageOrigin}", scope="openid webid"`
  }
  if (task.resourceData) {
    debug('setting ETag')
    responseHeaders.ETag = `"${task.resourceData.etag}"`
  } else {
    debug('not setting ETag')
  }

  debug('responding', { responseStatus, responseHeaders, responseBody })
  httpRes.writeHead(responseStatus, responseHeaders)
  httpRes.end(responseBody)
}

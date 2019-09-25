import fetch from 'node-fetch'
import Debug from 'debug'
import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import JsonLdParser from 'rdf-parser-jsonld'
import convert from 'buffer-to-stream'
import * as rdflib from 'rdflib'

import { Path, urlToPath } from '../storage/BlobTree'
import { Blob } from '../storage/Blob'
import { ResourceData, streamToObject, determineRdfType, RdfType, makeResourceData, objectToStream, streamToBuffer } from './ResourceDataUtils'
import { Container } from '../storage/Container'
import { ResultType, ErrorResult } from '../api/http/HttpResponder'
import { QuadAndBlobStore } from '../storage/QuadAndBlobStore'
import { IResourceIdentifier, IResourceStore, IRepresentationPreferences, Conditions, IRepresentation, IPatch } from 'solid-server-ts'

const debug = Debug('StoreManager')

export function getEmptyGraph () {
  return rdf.dataset()
}

export interface RdfNode {
  value: string
}

export function stringToRdfNode (str: string): RdfNode {
  return rdflib.sym(str)
}

export function urlToRdfNode (url: URL): RdfNode {
  return stringToRdfNode(url.toString())
}

export function rdfNodeToString (rdfNode: RdfNode): string {
  return rdfNode.value
}

export function rdfNodeToUrl (rdfNode: RdfNode): URL {
  return new URL(rdfNodeToString(rdfNode))
}

export interface Pattern {
  subject?: RdfNode
  predicate?: RdfNode
  object?: RdfNode
  why: RdfNode
}

export interface Quad {
  subject: RdfNode
  predicate: RdfNode
  object: RdfNode
  why: RdfNode
}

function readRdf (rdfType: RdfType | undefined, bodyStream: ReadableStream) {
  let parser
  switch (rdfType) {
    case RdfType.JsonLd:
      debug('RdfType JSON-LD')
      parser = new JsonLdParser({
        factory: rdf
      })
      break
    case RdfType.Turtle:
    default:
      debug('RdfType N3')
      parser = new N3Parser({
        factory: rdf
      })
      break
  }
  debug('importing bodystream')
  return parser.import(bodyStream)
}

export async function quadStreamFromBlob (blob: Blob): Promise<any> {
  const stream = await blob.getData()
  debug('stream', typeof stream)
  let resourceData
  if (stream) {
    resourceData = await streamToObject(stream) as ResourceData
  } else {
    return getEmptyGraph()
  }
  debug('got ACL ResourceData', resourceData)

  const bodyStream = convert(Buffer.from(resourceData.body))

  const quadStream = readRdf(resourceData.rdfType, bodyStream)
  return quadStream
}

export async function getGraphLocal (blob: Blob): Promise<any> {
  const quadStream = await quadStreamFromBlob(blob)
  return rdf.dataset().import(quadStream)
}

export class StoreManager implements IResourceStore {
  serverRootDomain: string
  storage: QuadAndBlobStore
  stores: { [url: string]: any }

  constructor (serverRootDomain: string, storage: QuadAndBlobStore) {
    if (serverRootDomain.indexOf('/') !== -1) {
      throw new Error('serverRootDomain should be just the FQDN, no https:// in front')
    }
    this.serverRootDomain = serverRootDomain
    this.storage = storage
    this.stores = {}
  }
  getLocalBlob (url: URL): Blob {
    return this.storage.getBlob(url)
  }
  getLocalContainer (url: URL): Container {
    return this.storage.getContainer(url)
  }
  async statementsMatching (pattern: Pattern) {
    debug('statementsMatching', pattern)
    await this.load(rdfNodeToUrl(pattern.why))
    debug(this.stores[rdfNodeToString(pattern.why)])
    const ret = this.stores[rdfNodeToString(pattern.why)].statementsMatching(
      pattern.subject,
      pattern.predicate,
      pattern.object,
      pattern.why)
    debug(ret)
    return ret
  }
  async getResourceData (url: URL): Promise<ResourceData | undefined> {
    debug('getResourceData - local?', url.host, this.serverRootDomain)
    if (url.host.endsWith(this.serverRootDomain)) {
      debug('getResourceData local!', url.toString())
      const blob: Blob = this.getLocalBlob(url)
      const data = await blob.getData() // getData should resolve with undefined if the blob does not exist
      if (data) {
        return streamToObject(data)
      }
    } else {
      debug('calling node-fetch', url.toString())
      const response: any = await fetch(url.toString())
      const contentType = response.headers.get('content-type')
      const etag = response.headers.get('etag')
      const rdfType = determineRdfType(contentType)
      const body = (await streamToBuffer(response as unknown as ReadableStream)).toString()
      return { contentType, body, etag, rdfType }
    }
  }
  setResourceData (url: URL, stream: ReadableStream) {
    const blob: Blob = this.getLocalBlob(url)
    return blob.setData(stream)
  }
  async load (url: URL) {
    if (this.stores[url.toString()]) {
      // to do: check if cache needs to be refreshed once in a while
      return
    }

    //   const resourceData = await streamToObject(await blob.getData()) as ResourceData
    const resourceData = await this.getResourceData(url)
    this.stores[url.toString()] = rdflib.graph()
    if (resourceData) {
      const parse = rdflib.parse as (body: string, store: any, url: string, contentType: string) => void
      parse(resourceData.body, this.stores[url.toString()], url.toString(), resourceData.contentType)
    }
  }

  async patch (url: URL, sparqlQuery: string, appendOnly: boolean) {
    await this.load(url)
    debug('before patch', this.stores[url.toString()].toNT())

    //  const patchObject = sparqlUpdateParser(task.requestBody || '', rdflib.graph(), task.fullUrl)
    const sparqlUpdateParser = rdflib.sparqlUpdateParser as unknown as (patch: string, store: any, url: string) => any
    const patchObject = sparqlUpdateParser(sparqlQuery, rdflib.graph(), url.toString())
    debug('patchObject', patchObject)
    if (appendOnly && typeof patchObject.delete !== 'undefined') {
      debug('appendOnly and patch contains deletes')
      throw new ErrorResult(ResultType.AccessDenied)
    }
    await new Promise((resolve, reject) => {
      this.stores[url.toString()].applyPatch(patchObject, this.stores[url.toString()].sym(url.toString()), (err: Error) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    debug('after patch', this.stores[url.toString()].toNT())
    return rdflib.serialize(undefined, this.stores[url.toString()], url.toString(), 'text/turtle')
  }

  flushCache (url: URL) {
    delete this.stores[url.toString()]
  }

  getRepresentation (resourceIdentifier: IResourceIdentifier, representationPreferences: IRepresentationPreferences, conditions: Conditions) {
    return this.storage.getRepresentation(resourceIdentifier, representationPreferences, conditions)
  }
  addResource (container: IResourceIdentifier, representation: IRepresentation, conditions: Conditions) {
    return this.storage.addResource(container, representation, conditions)
  }
  setRepresentation (resourceIdentifier: IResourceIdentifier, representation: IRepresentation, conditions: Conditions) {
    return this.storage.setRepresentation(resourceIdentifier, representation, conditions)
  }
  deleteResource (resourceIdentifier: IResourceIdentifier, conditions: Conditions) {
    return this.storage.deleteResource(resourceIdentifier, conditions)
  }
  modifyResource (resourceIdentifier: IResourceIdentifier, patch: IPatch, conditions: Conditions) {
    return this.storage.modifyResource(resourceIdentifier, patch, conditions)
  }

}

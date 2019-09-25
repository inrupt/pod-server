import * as events from 'events'
import Debug from 'debug'
import { Node } from './Node'
import { Container, Member } from './Container'
import { Blob } from './Blob'
import { BlobTree, Path, urlToPath } from './BlobTree'
import { bufferToStream, streamToBuffer, ResourceData, streamToObject, objectToStream, makeResourceData } from '../rdf/ResourceDataUtils'
import { IRepresentation, IResourceIdentifier, IRepresentationPreferences, Conditions, IRepresentationMetadata, IPatch } from 'solid-server-ts'
import applyPatch from '../rdf/applyPatch'
import uuid from 'uuid'

const debug = Debug('AtomicTreeInMem')

class NodeInMem {
  path: Path
  tree: BlobTreeInMem

  constructor (path: Path, tree: BlobTreeInMem) {
    this.path = path
    this.tree = tree
    debug('constructed node', path, Object.keys(tree.kv))
  }
}

class ContainerInMem extends NodeInMem implements Container {
  getDescendents () {
    const containerPathPrefix = this.path.toString()
    debug('getDescendents', containerPathPrefix)
    return Object.keys(this.tree.kv).filter(x => (
      (x.length > containerPathPrefix.length) && // x is longer than container/path/prefix/
      (x.substr(0, containerPathPrefix.length) === containerPathPrefix) // x srtarts with container/path/prefix/
    ))
  }
  getMembers () {
    const listAbsolutePaths = this.getDescendents()
    const prefixLength = this.path.toString().length
    const listRelativePaths = listAbsolutePaths.map(x => x.substring(prefixLength))
    const memberMap: { [memberName: string]: boolean } = {}
    listRelativePaths.map(x => {
      const parts = x.split('/')
      if (parts.length === 1) { // member blob
        memberMap[x] = false
      } else { // sub container
        memberMap[parts[0]] = true
      }
    })
    const members = Object.keys(memberMap).map(name => {
      return {
        name,
        isContainer: memberMap[name]
      } as Member
    })
    debug('getMembers', this.path, Object.keys(this.tree.kv), listAbsolutePaths, listRelativePaths, memberMap, members)
    return Promise.resolve(members)
  }
  delete (): Promise<void> {
    this.getDescendents().map(x => {
      this.tree.emit('change', { path: x })
      delete this.tree.kv[x]
    })
    return Promise.resolve()
  }
  exists (): Promise<boolean> {
    debug('checking exists', this.path.toString(), Object.keys(this.tree.kv))
    return Promise.resolve(!!this.getDescendents().length)
  }
}

class BlobInMem extends NodeInMem implements Blob {
  getData (): Promise<ReadableStream | undefined> {
    debug('reading resource', this.path, this.tree.kv)
    const buffer: Buffer | undefined = this.tree.kv[this.path.toString()]
    if (buffer) {
      return Promise.resolve(bufferToStream(buffer))
    }
    return Promise.resolve(undefined)
  }
  async setData (data: ReadableStream) {
    debug('setData', this.path)
    this.tree.kv[this.path.toString()] = await streamToBuffer(data)
    debug('Object.keys(this.tree.kv) after setData', Object.keys(this.tree.kv), this.path, this.path.toString())
    this.tree.emit('change', { path: this.path })
    return Promise.resolve()
  }
  delete (): Promise<void> {
    delete this.tree.kv[this.path.toString()]
    this.tree.emit('change', { path: this.path })
    return Promise.resolve()
  }
  exists (): Promise<boolean> {
    debug('checking exists', this.path.toString(), Object.keys(this.tree.kv))
    return Promise.resolve((!!this.tree.kv.hasOwnProperty(this.path.toString())))
  }
}

export class BlobTreeInMem extends events.EventEmitter {
  kv: { [pathStr: string]: Buffer | undefined }
  constructor () {
    super()
    this.kv = {}
    debug('constructed in-mem store', this.kv)
  }

  getContainer (path: Path) {
    return new ContainerInMem(path, this)
  }
  getBlob (path: Path) {
    return new BlobInMem(path, this)
  }

  async getRepresentation (resourceIdentifier: IResourceIdentifier, representationPreferences: IRepresentationPreferences, conditions: Conditions) {
    const blob = this.getBlob(urlToPath(new URL(resourceIdentifier.path, resourceIdentifier.domain)))
    const resourceData = await streamToObject(await blob.getData())
    // console.klog('get', resourceData)
    const metadata: IRepresentationMetadata = {
      raw: [],
      contentType: resourceData.contentType,
      profiles: []
    } as IRepresentationMetadata
    return {
      // identifier: resourceIdentifier,
      metadata,
      data: await bufferToStream(Buffer.from(resourceData.body)),
      dataType: 'default'
    } as IRepresentation
  }
  async addResource (container: IResourceIdentifier, representation: IRepresentation, conditions: Conditions) {
    const childPath = container.path + uuid()
    const childUrl = new URL(childPath, container.domain)
    const blob = this.getBlob(urlToPath(childUrl))
    await blob.setData(await objectToStream({
      contentType: representation.metadata.contentType,
      body: await streamToBuffer(representation.data),
      etag: 'hm'
    }))
    return {
      domain: container.domain,
      isAcl: false,
      path: childPath
    } as IResourceIdentifier

  }
  async setRepresentation (resourceIdentifier: IResourceIdentifier, representation: IRepresentation, conditions: Conditions) {
    const blob = this.getBlob(urlToPath(new URL(resourceIdentifier.path, resourceIdentifier.domain)))
    const resourceData = makeResourceData(representation.metadata.contentType || 'application/octet-stream', (await streamToBuffer(representation.data)).toString())
    // console.log('set', resourceData)
    return blob.setData(await objectToStream(resourceData))
  }
  async deleteResource (resourceIdentifier: IResourceIdentifier, conditions: Conditions) {
    if (resourceIdentifier.path.substr(-1) === '/') {
      const container = this.getContainer(urlToPath(new URL(resourceIdentifier.path, resourceIdentifier.domain)))
      return container.delete()
    } else {
      const blob = this.getBlob(urlToPath(new URL(resourceIdentifier.path, resourceIdentifier.domain)))
      return blob.delete()
    }
  }
  async modifyResource (resourceIdentifier: IResourceIdentifier, patch: IPatch, conditions: Conditions) {
    const blob = this.getBlob(urlToPath(new URL(resourceIdentifier.path, resourceIdentifier.domain)))
    const resourceData = await streamToObject(await blob.getData())
    const newResourceData = applyPatch(patch, resourceData)
    return blob.setData(await objectToStream(newResourceData))
  }
}

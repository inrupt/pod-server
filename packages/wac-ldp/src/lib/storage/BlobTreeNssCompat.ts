import * as events from 'events'
import Debug from 'debug'
import { Node } from './Node'
import { Container, Member } from './Container'
import { Blob } from './Blob'
import { BlobTree, Path, urlToPath } from './BlobTree'
import { bufferToStream, streamToBuffer, streamToObject, ResourceData, objectToStream, RdfType, makeResourceData } from '../rdf/ResourceDataUtils'
import { promises as fsPromises, Dirent } from 'fs'
import { join as pathJoin } from 'path'
import * as mime from 'mime-types'
import glob from 'glob'
import { IResourceIdentifier, IRepresentationPreferences, Conditions, IRepresentationMetadata, IRepresentation, IPatch } from 'solid-server-ts'
import uuid from 'uuid'
import applyPatch from '../rdf/applyPatch'

const debug = Debug('AtomicTreeInMem')

// ResourceMapper compat, see
// https://github.com/solid/node-solid-server/blob/master/lib/resource-mapper.js
function filePathToContentType (filePath: string): string {
  return mime.lookup(filePath) || 'application/octet-stream'
}
function contentTypeMatches (filePath: string, contentType: string): boolean {
  return (filePathToContentType(filePath) === contentType)
}
function contentTypeToExtension (contentType: string): string {
  return mime.extension(contentType) || ''
}
function filePathForContentType (filePath: string, contentType: string) {
  if (contentTypeMatches(filePath, contentType)) {
    return filePath
  } else {
    return `${filePath}$.${contentTypeToExtension(contentType)}`
  }
}
function withoutDollar (fileName: string) {
  return fileName.split('$')[0]
}

function treePathToFsPath (treePath: Path, dataDir: string) {
  const hostname = treePath.segments[1].split(':')[0]
  const rest = treePath.segments.slice(2)
  const relativePath = pathJoin.apply(undefined, rest)
  return pathJoin(dataDir, hostname, relativePath)
}

class NodeNssCompat {
  path: Path
  tree: BlobTreeNssCompat
  filePath: string
  constructor (path: Path, tree: BlobTreeNssCompat) {
    this.path = path
    this.tree = tree
    this.filePath = treePathToFsPath(this.path, this.tree.dataDir)
  }
}

class ContainerNssCompat extends NodeNssCompat implements Container {
  async getMembers () {
    if (!await this.exists()) {
      return []
    }
    const dirents = await fsPromises.readdir(this.filePath, { withFileTypes: true })
    return dirents.map((dirent: Dirent) => {
      return {
        name: withoutDollar(dirent.name),
        isContainer: dirent.isDirectory() }
    })
  }
  delete (): Promise<void> {
    return fsPromises.rmdir(this.filePath)
  }
  exists (): Promise<boolean> {
    return fsPromises.access(this.filePath)
      .then(() => true)
      .catch(() => false)
  }
}

class BlobNssCompat extends NodeNssCompat implements Blob {
  async getData (): Promise<ReadableStream | undefined> {
    // FIXME: get this to work with fs.createReadStream
    // which returns a https://nodejs.org/dist/latest-v10.x/docs/api/stream.html#stream_class_stream_readable
    // instead of ReadableStream, and it seems the two are different?

    const existsAs = await this.existsAs()
    if (!existsAs) {
      return undefined // not found
    }
    const buffer: Buffer = await fsPromises.readFile(existsAs)
    const resourceData: ResourceData = {
      body: buffer.toString(),
      contentType: filePathToContentType(existsAs),
      etag: 'fs.getMTimeMS(this.filePath',
      rdfType: RdfType.Unknown
    }
    return objectToStream(resourceData)
  }
  async setData (data: ReadableStream) {
    const containerPath = treePathToFsPath(this.path.toParent(), this.tree.dataDir)
    await fsPromises.mkdir(containerPath, { recursive: true })
    const resourceData: ResourceData = await streamToObject(data)
    const filePath = filePathForContentType(this.filePath, resourceData.contentType)
    return fsPromises.writeFile(filePath, resourceData.body)
  }
  async delete (): Promise<void> {
    const existsAs = await this.existsAs()
    if (existsAs) {
      return fsPromises.unlink(existsAs)
    }
  }
  existsWithoutDollar (): Promise<boolean> {
    return fsPromises.access(this.filePath)
      .then(() => true)
      .catch(() => false)
  }
  async existsAs (): Promise<string | undefined> {
    const existsWithoutDollar = await this.existsWithoutDollar()
    if (existsWithoutDollar) {
      return this.filePath
    }
    return new Promise((resolve, reject) => {
      glob(`${this.filePath}\$.*`, (err: Error | null, matches: Array<string>) => {
        if (err) {
          reject(err)
        }
        if (matches.length === 0) {
          resolve(undefined)
        }
        resolve(matches[0])
      })
    })
  }
  async exists (): Promise<boolean> {
    const existsAs: string | undefined = await this.existsAs()
    return (typeof existsAs === 'string')
  }
}

export class BlobTreeNssCompat extends events.EventEmitter {
  dataDir: string

  constructor (dataDir: string) {
    super()
    this.dataDir = dataDir
  }
  getContainer (path: Path) {
    return new ContainerNssCompat(path, this)
  }
  getBlob (path: Path) {
    return new BlobNssCompat(path, this)
  }

  async getRepresentation (resourceIdentifier: IResourceIdentifier, representationPreferences: IRepresentationPreferences, conditions: Conditions) {
    const blob = this.getBlob(urlToPath(new URL(resourceIdentifier.path, resourceIdentifier.domain)))
    const resourceData = await streamToObject(await blob.getData())
    // console.log('get', resourceData)
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

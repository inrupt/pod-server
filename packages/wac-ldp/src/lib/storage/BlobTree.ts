import * as events from 'events'
import Debug from 'debug'
import { Container } from './Container'
import { Blob } from './Blob'
import { IResourceStore } from 'solid-server-ts'

const debug = Debug('BlobTree')

const STORAGE_FORMAT = 'v1'

// The BlobTree is a tree structure. Its internal Nodes are called Containers. Its leaves are called Blobs.
// A Blob has methods setData and getData, which take and return a ReadableStream, so that you can store opaque
// data in them.
// A Container doesn't have much functionality except that you can query a list of its Members (its children in the tree).
//
// A path is defined by a list of path segments, which are strings.
// To allow for convenient slash-separated concatenation of path segments, they are not allowed to contain the '/' character.
// The Path of a Node is the list of names of nodes you have to visit to get to it.
// A Path always starts with 'root', and ends with the Node's own name; for instance: ['root', 'foo', 'bar']
// Sibling Nodes are not allowed to have the same name.

function copyStringArray (arr: Array<string>): Array<string> {
  return JSON.parse(JSON.stringify(arr))
}

export function urlToPath (url: URL) {
  let urlPath = url.pathname
  let isContainer = false

  if (urlPath.substr(-1) === '/') {
    isContainer = true
    urlPath = urlPath.substring(0, urlPath.length - 1)
  }
  debug('determined containerhood', url.pathname, isContainer, urlPath)
  const segments = urlPath.split('/')
  segments[0] = url.host
  segments.unshift(STORAGE_FORMAT)
  return new Path(segments, isContainer)
}

export class Path {
  segments: Array<string>
  isContainer: boolean
  constructor (segments: Array<string>, isContainer: boolean) {
    if (!segments.length || segments[0] !== STORAGE_FORMAT) {
      throw new Error('Path should start with the current hard-coded storage format')
    }
    segments.map(segment => {
      if (segment.indexOf('/') !== -1) {
        throw new Error('No slashes allowed in path segments!')
      }
    })
    this.segments = segments
    this.isContainer = isContainer
  }
  toString (): string {
    return this.segments.join('/') + (this.isContainer ? '/' : '')
  }
  toName (): string {
    // last segment is the name
    return this.segments[this.segments.length - 1]
  }
  toUrl (): URL {
    const host: string = this.segments[1]
    let pathnameWithoutLeadingSlash = this.segments.slice(2).join('/') + (this.isContainer ? '/' : '')
    if (pathnameWithoutLeadingSlash === '/') { // site root
      pathnameWithoutLeadingSlash = ''
    }
    debug('Path#toUrl', this.segments, host, pathnameWithoutLeadingSlash)
    return new URL(`https://${host}/${pathnameWithoutLeadingSlash}`)
  }
  toChild (segment: string, childIsContainer: boolean): Path {
    const childSegments = copyStringArray(this.segments)
    childSegments.push(segment)
    return new Path(childSegments, childIsContainer)
  }
  isRoot (): boolean {
    return (this.segments.length <= 1)
  }
  toParent (): Path {
    if (this.isRoot()) {
      throw new Error('root has no parent!')
    }
    const parentSegments = copyStringArray(this.segments)
    parentSegments.pop()
    return new Path(parentSegments, true)
  }
  hasSuffix (suffix: string): boolean {
    const lastSegment = this.segments[this.segments.length - 1]
    return (lastSegment.substr(-suffix.length) === suffix)
  }
  removeSuffix (suffix: string): Path {
    const withoutSuffixSegments: Array<string> = copyStringArray(this.segments)
    const remainingLength: number = withoutSuffixSegments[withoutSuffixSegments.length - 1].length - suffix.length
    debug(withoutSuffixSegments, remainingLength, suffix)
    if (remainingLength < 0) {
      throw new Error('no suffix match (last segment name shorter than suffix)')
    }
    if (withoutSuffixSegments[withoutSuffixSegments.length - 1].substring(remainingLength) !== suffix) {
      throw new Error('no suffix match')
    }
    const withoutSuffix: string = withoutSuffixSegments[withoutSuffixSegments.length - 1].substring(0, remainingLength)
    withoutSuffixSegments[withoutSuffixSegments.length - 1] = withoutSuffix
    return new Path(withoutSuffixSegments, this.isContainer)
  }
  appendSuffix (suffix: string): Path {
    const withSuffixSegments: Array<string> = copyStringArray(this.segments)
    withSuffixSegments[withSuffixSegments.length - 1] += suffix
    return new Path(withSuffixSegments, this.isContainer)
  }
  equals (other: Path): boolean {
    return (this.toString() === other.toString())
  }
}

// throws:
// sub-blob attempt
// getData/setData when doesn't exist
// containers always exist, unless there is a blob at their filename
// creating a path ignores the trailing slash
export interface BlobTree extends events.EventEmitter, IResourceStore {
  getContainer (path: Path): Container
  getBlob (path: Path): Blob
}

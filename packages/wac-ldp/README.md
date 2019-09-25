# wac-ldp

[![Build Status](https://travis-ci.org/inrupt/wac-ldp.svg?branch=master)](https://travis-ci.org/inrupt/wac-ldp) [![Coverage Status](https://coveralls.io/repos/github/inrupt/wac-ldp/badge.svg?branch=master)](https://coveralls.io/github/inrupt/wac-ldp?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/inrupt/wac-ldp.svg)](https://greenkeeper.io/)

A central component for Solid servers, handles Web Access Control and Linked Data Platform concerns.

## Code Structure

![wac-ldp component diagram](https://user-images.githubusercontent.com/408412/57371602-6f1fd880-7193-11e9-8ae2-653f949b731d.png))


### Entry point
The entry point is src/server.ts, which instantiates a http server, a BlobTree storage, and the core app. This is not drawn in the diagram above.

### Storage
The BlobTree storage exposes a carefully tuned interface to the persistence layer, which is similar to the well-known "key-value store" concept, where opaque Blobs can be stored and retrieved, using arbitrary strings as keys. But the BlobTree interface differs from a key-value store interface in that it not only allows writing and reading blobs of data, but also querying 'Containers', which is similar to doing `ls` on a folder on a unix file system: it gives you a list of the directly contained blobs and containers.
This means that if we store all LDP resources inside BlobTree blobs, using the resource path from the http level as the blob's path at the BlobTree level, then implementing LDP GET requests on containers becomes very easy out of the box.

The interface looks as follows (`BlobTree` in the diagram):
```ts
interface BlobTree extends events.EventEmitter {
  getContainer (path: Path): Container
  getBlob (path: Path): Blob
}
interface Node {
  exists (): Promise<boolean>,
  delete (): Promise<void>
}
interface Blob extends Node {
  getData (): Promise<ReadableStream | undefined>
  setData (data: ReadableStream): Promise<void>
}
interface Container extends Node {
  getMembers (): Promise<Array<Member>>
}
interface Member {
  name: string
  isContainer: boolean
}
interface Path {
  constructor (segments: Array<string>)
  toParent (): Path
  toChild (segment: string): Path
  isRoot (): boolean
  toString (): string
  toContainerPathPrefix (): string
  hasSuffix (suffix: string): boolean
  removeSuffix (suffix: string): Path
  appendSuffix (suffix: string): Path
}
```

### Execute Task
The core application code is in src/lib/core/executeTask.ts and given a `WacLdpTask` (see below), it deals with:
* calling the functions from src/lib/authorization/ to determine whether the request is authorized to begin with
* calling the functions from the 'operations on content' component (currently only 'RDF').
* fetching the main resource from storage
* in the case of Glob, checking authorization to read each of the contained resources, and fetching those
* in the case of POST to a container, picking a name for the new resource and fetching a handle to that
* check the ETag of the resource in case an If-Match or If-None-Match header was present on the request
* given the necessary handle(s) to BlobTree node(s), execute the desired operation from src/lib/core/basicOperations.ts (in the case of PATCH, adding a parameter whether it should be executed append-only)
* in case of success, producing the `WacLdpResult` (see below) result for src/lib/api/http/HttpResponder
* in case of an exception, throwing the appropriate `ErrorResult`, to be cast to `WacLdpResult`

### Auth
The auth code is in src/lib/authorization/ and deals with:
* determining the webId from the bearer token, and checking the signature, expiry, and audience on the there
* fetching the apprioriate ACL document from storage and loading that into an in-memory RDF graph
* based on the webId, find out which access modes should be allowed
* based on the origin, find out whether at least one of the resource owner has that origin as a trusted app
* decide if the required access mode is authorized (with a special case for append-only approval of a PATCH)

The Auth Interface looks as follows:
```ts
async function determineWebId (bearerToken: string, audience: string): Promise<string | undefined>
async function readAcl (resourcePath: Path, resourceIsContainer: boolean, storage: BlobTree)
async function determineAllowedAgentsForModes (task: ModesCheckTask): Promise<AccessModes>
interface ModesCheckTask {
  aclGraph: any,
  isAdjacent: boolean,
  resourcePath: string
}
interface AccessModes {
  read: Array<string>
  write: Array<string>
  append: Array<string>
  control: Array<string>
}
async function appIsTrustedForMode (task: OriginCheckTask): Promise<boolean>
interface OriginCheckTask {
  origin: string,
  mode: string,
  resourceOwners: Array<string>
}
```

### HTTP
In src/lib/api/http/ are two important classes, one for parsing an incoming http request, and one for constructing an outgoing http response. Although each step they do, like setting a numeric http response status code, or extracting a bearer token string from an authorization header, is computationally simple, a lot of the correctness of this module (looking at https://github.com/w3c/ldp-testsuite and the WAC test suite that is under development) depends on the details in these two files.
```ts
interface WacLdpTask {
  isContainer: boolean
  omitBody: boolean
  parsedContentType: ParsedContentType | undefined
  origin: string | undefined
  contentType: string | undefined
  ifMatch: string | undefined
  ifNoneMatchStar: boolean
  ifNoneMatchList: Array<string> | undefined
  bearerToken: string | undefined
  wacLdpTaskType: TaskType
  path: Path
  requestBody: string | undefined
}
enum TaskType {
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
enum ParsedContentType {
  RdfJsonLd,
  RdfTurtle
}
interface WacLdpResponse {
  resultType: ResultType
  resourceData: ResourceData | undefined
  createdLocation: string | undefined
  isContainer: boolean
}
```

### RDF
The following operations are available:
* readFromBlob (looks at the content-type and the body and reads these into an in-memory RDF graph object)
* readFromContainer (looks at the container member list and reads that into an in-memory RDF graph object)
* writeToBlob (serializes an RDF graph object to the requested representation)
* applyPatch
* applyFilter

Currently supported representations for RDF are Turtle and JSON-LD. The only currently allowed patch type for RDF are `SPARQL-update (any)` and `SPARQL-update (appendOnly)`. The currently allowed filter types for RDF are `SPARQL-SELECT`, `ldp-paging`, and `prefer-minimal-container`.
In the future, we might add similar modules for e.g. HTML/RDFa or partial updates to binary blobs, and when that happens we will turn this component into an abstract 'content operations' component, of which RDF, HTML/RDFa and Binary are instantiations.

Published under an MIT license by inrupt, Inc.

Contributors:
* Michiel de Jong
* Ruben Verborgh
* Kjetil Kjernsmo
* Jackson Morgan
* Pat McBennett
* Justin Bingham
* Sebastien Dubois
* elf Pavlik

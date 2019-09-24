import * as http from 'http'
import { WacLdpTask, TaskType } from '../../../../src/lib/api/http/HttpParser'
import { Path } from '../../../../src/lib/storage/BlobTree'
import { bufferToStream, RdfType } from '../../../../src/lib/rdf/ResourceDataUtils'
import { toChunkStream } from '../../helpers/toChunkStream'

test('should parse a http request with Bearer token', async () => {
  let streamed = false
  let endCallback: () => void
  let request: any = toChunkStream('')
  request.headers = {
    'authorization': 'Bearer the-bearer-token'
  } as http.IncomingHttpHeaders
  request.url = '/foo/bar' as string
  request.method = 'DELETE'
  request = request as http.IncomingMessage

  const parsed = new WacLdpTask('http://localhost:8080', request, false)
  expect(parsed.rdfType()).toEqual(RdfType.NoPref)
  expect(parsed.bearerToken()).toEqual('the-bearer-token')
  expect(parsed.contentType()).toEqual(undefined)
  expect(parsed.ifMatch()).toEqual(undefined)
  expect(parsed.ifNoneMatchList()).toEqual(undefined)
  expect(parsed.ifNoneMatchStar()).toEqual(false)
  expect(parsed.isContainer()).toEqual(false)
  expect(parsed.omitBody()).toEqual(false)
  expect(await parsed.origin()).toEqual(undefined)
  expect(parsed.fullUrl()).toEqual(new URL('http://localhost:8080/foo/bar'))
  expect(parsed.preferMinimalContainer()).toEqual(false)
  expect(parsed.sparqlQuery()).toEqual(undefined)
  expect(await parsed.requestBody()).toEqual('')
  expect(parsed.wacLdpTaskType()).toEqual(TaskType.blobDelete)
})

test('should parse a http request with If-None-Match: * header', async () => {
  let streamed = false
  let endCallback: () => void
  let request: any = toChunkStream('')
  request.headers = {
    'if-none-match': '*'
  } as http.IncomingHttpHeaders
  request.url = '/foo/bar' as string
  request.method = 'DELETE'
  request = request as http.IncomingMessage

  const parsed = new WacLdpTask('http://localhost:8080', request, false)
  expect(parsed.rdfType()).toEqual(RdfType.NoPref)
  expect(parsed.bearerToken()).toEqual(undefined)
  expect(parsed.contentType()).toEqual(undefined)
  expect(parsed.ifMatch()).toEqual(undefined)
  expect(parsed.ifNoneMatchList()).toEqual(undefined)
  expect(parsed.ifNoneMatchStar()).toEqual(true)
  expect(parsed.isContainer()).toEqual(false)
  expect(parsed.omitBody()).toEqual(false)
  expect(await parsed.origin()).toEqual(undefined)
  expect(parsed.fullUrl()).toEqual(new URL('http://localhost:8080/foo/bar'))
  expect(parsed.preferMinimalContainer()).toEqual(false)
  expect(parsed.sparqlQuery()).toEqual(undefined)
  expect(await parsed.requestBody()).toEqual('')
  expect(parsed.wacLdpTaskType()).toEqual(TaskType.blobDelete)
})

test('should parse a http request with If-None-Match: [list] header', async () => {
  let streamed = false
  let endCallback: () => void
  let request: any = toChunkStream('')
  request.headers = {
    'if-none-match': '"etag-1", "etag-2"'
  } as http.IncomingHttpHeaders
  request.url = '/foo/bar' as string
  request.method = 'DELETE'
  request = request as http.IncomingMessage

  const parsed = new WacLdpTask('http://localhost:8080', request, false)
  expect(parsed.rdfType()).toEqual(RdfType.NoPref)
  expect(parsed.bearerToken()).toEqual(undefined)
  expect(parsed.contentType()).toEqual(undefined)
  expect(parsed.ifMatch()).toEqual(undefined)
  expect(parsed.ifNoneMatchList()).toEqual(['etag-1', 'etag-2'])
  expect(parsed.ifNoneMatchStar()).toEqual(false)
  expect(parsed.isContainer()).toEqual(false)
  expect(parsed.omitBody()).toEqual(false)
  expect(await parsed.origin()).toEqual(undefined)
  expect(parsed.fullUrl()).toEqual(new URL('http://localhost:8080/foo/bar'))
  expect(parsed.preferMinimalContainer()).toEqual(false)
  expect(parsed.sparqlQuery()).toEqual(undefined)
  expect(await parsed.requestBody()).toEqual('')
  expect(parsed.wacLdpTaskType()).toEqual(TaskType.blobDelete)
})

test('should parse a http request with If-Match header', async () => {
  let streamed = false
  let endCallback: () => void
  let request: any = toChunkStream('')
  request.headers = {
    'if-match': '"if-match-etag"'
  } as http.IncomingHttpHeaders
  request.url = '/foo/bar' as string
  request.method = 'DELETE'
  request = request as http.IncomingMessage

  const parsed = new WacLdpTask('http://localhost:8080', request, false)
  expect(parsed.rdfType()).toEqual(RdfType.NoPref)
  expect(parsed.bearerToken()).toEqual(undefined)
  expect(parsed.contentType()).toEqual(undefined)
  expect(parsed.ifMatch()).toEqual('if-match-etag')
  expect(parsed.ifNoneMatchList()).toEqual(undefined)
  expect(parsed.ifNoneMatchStar()).toEqual(false)
  expect(parsed.isContainer()).toEqual(false)
  expect(parsed.omitBody()).toEqual(false)
  expect(await parsed.origin()).toEqual(undefined)
  expect(parsed.fullUrl()).toEqual(new URL('http://localhost:8080/foo/bar'))
  expect(parsed.preferMinimalContainer()).toEqual(false)
  expect(parsed.sparqlQuery()).toEqual(undefined)
  expect(await parsed.requestBody()).toEqual('')
  expect(parsed.wacLdpTaskType()).toEqual(TaskType.blobDelete)
})

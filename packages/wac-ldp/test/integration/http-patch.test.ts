import * as fs from 'fs'
import * as http from 'http'
import { makeHandler } from '../unit/helpers/makeHandler'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'
import { objectToStream, makeResourceData, streamToObject } from '../../src/lib/rdf/ResourceDataUtils'
import { urlToPath } from '../../src/lib/storage/BlobTree'
import { expectedResponseHeaders } from '../fixtures/expectedResponseHeaders'

const storage = new BlobTreeInMem()
beforeEach(async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc-readwrite.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/public/.acl'))).setData(publicContainerAclDocData)

  const ldpRs1 = fs.readFileSync('test/fixtures/ldpRs1.ttl')
  const ldpRs1Data = await objectToStream(makeResourceData('text/turtle', ldpRs1.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/public/ldp-rs1.ttl'))).setData(ldpRs1Data)
})

// makeHandler (blobTree: BlobTree, aud: string, updatesViaUrl: URL, skipWac: boolean, idpHost: string, usesHttps: boolean) {

const handler = makeHandler(storage, 'http://localhost:8080', new URL('ws://localhost:8080/'), true, 'localhost:8443', false)

test('handles an append-only PATCH request with Write permissions', async () => {
  const expectedTurtle = fs.readFileSync('test/fixtures/ldpRs1-2-merge-alt.ttl').toString()
  const patchText = fs.readFileSync('test/fixtures/ldpRs2-as-patch.ttl').toString()

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream(patchText)
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = '/public/ldp-rs1.ttl' as string
  httpReq.method = 'PATCH'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      204,
      expectedResponseHeaders({
        originToAllow: '*',
        idp: 'https://localhost:8443',
        contentType: 'text/plain',
        // etag: 'TmBqjXO24ygE+uQdtQuiOA=',
        isContainer: false,
        updatesVia: 'ws://localhost:8080/'
      })
    ]
  ])

  expect(httpRes.end.mock.calls).toEqual([
    [ 'No Content' ]
  ])
  const result = await storage.getBlob(urlToPath(new URL('http://localhost:8080/public/ldp-rs1.ttl'))).getData()
  expect(await streamToObject(result)).toEqual(makeResourceData('text/turtle', expectedTurtle))
})

test.skip('handles an append-only PATCH request with Append permissions', async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc-readappend.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/public/.acl'))).setData(publicContainerAclDocData)

  const expectedTurtle = fs.readFileSync('test/fixtures/ldpRs1-2-merge-alt.ttl').toString()
  const patchText = fs.readFileSync('test/fixtures/ldpRs2-as-patch.ttl').toString()

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream(patchText)
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = '/public/ldp-rs1.ttl' as string
  httpReq.method = 'PATCH'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      204,
      expectedResponseHeaders({
        originToAllow: 'https://pheyvaer.github.io',
        idp: 'https://localhost:8443',
        contentType: 'text/turtle',
        etag: 'TmBqjXO24ygE+uQdtQuiOA==',
        isContainer: true,
        updatesVia: 'wss://localhost:8080/'
      })
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    [ 'No Content' ]
  ])
  const result = await storage.getBlob(urlToPath(new URL('http://localhost:8080/public/ldp-rs1.ttl'))).getData()
  expect(await streamToObject(result)).toEqual(makeResourceData('text/turtle', expectedTurtle))
})

test.skip('handles a destructive PATCH request (allowed)', async () => {
  const expectedTurtle = fs.readFileSync('test/fixtures/ldpRs1-enemy-deleted-alt.ttl').toString()
  const patchText = fs.readFileSync('test/fixtures/deletion-patch.ttl').toString()

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream(patchText)
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = '/public/ldp-rs1.ttl' as string
  httpReq.method = 'PATCH'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      204,
      expectedResponseHeaders({
        originToAllow: 'https://pheyvaer.github.io',
        idp: 'https://localhost:8443',
        contentType: 'text/turtle',
        etag: 'TmBqjXO24ygE+uQdtQuiOA==',
        isContainer: true,
        updatesVia: 'wss://localhost:8080/'
      })
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    [ 'No Content' ]
  ])
  const result = await storage.getBlob(urlToPath(new URL('http://localhost:8080/public/ldp-rs1.ttl'))).getData()
  expect(await streamToObject(result)).toEqual(makeResourceData('text/turtle', expectedTurtle))
})

test.skip('handles a destructive PATCH request (not allowed but append is allowed)', async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc-readappend.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/public/.acl'))).setData(publicContainerAclDocData)

  const expectedTurtle = fs.readFileSync('test/fixtures/ldpRs1.ttl').toString()
  const patchText = fs.readFileSync('test/fixtures/deletion-patch.ttl').toString()

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream(patchText)
  httpReq.headers = {} as http.IncomingHttpHeaders
  httpReq.url = '/public/ldp-rs1.ttl' as string
  httpReq.method = 'PATCH'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      401,
      expectedResponseHeaders({
        originToAllow: 'https://pheyvaer.github.io',
        idp: 'https://localhost:8443',
        contentType: 'text/turtle',
        etag: 'TmBqjXO24ygE+uQdtQuiOA==',
        isContainer: true,
        updatesVia: 'wss://localhost:8080/'
      })
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    [ 'Access denied' ]
  ])
  const result = await storage.getBlob(urlToPath(new URL('http://localhost:8080/public/ldp-rs1.ttl'))).getData()
  expect(await streamToObject(result)).toEqual(makeResourceData('text/turtle', expectedTurtle))
})

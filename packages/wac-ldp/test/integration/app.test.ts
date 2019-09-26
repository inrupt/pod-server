import * as fs from 'fs'
import * as http from 'http'
import { makeHandler } from '../unit/helpers/makeHandler'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'
import { objectToStream, makeResourceData } from '../../src/lib/rdf/ResourceDataUtils'
import { urlToPath } from '../../src/lib/storage/BlobTree'
import { expectedResponseHeaders } from '../fixtures/expectedResponseHeaders'

const storage = new BlobTreeInMem()
beforeEach(async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc-read-rel-path-parent-container-with-owner.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/foo/.acl'))).setData(publicContainerAclDocData)

  // src/__mocks__/node-fetch.ts will use test/fixtures/web/michielbdejong.com/443/profile/card
  // Which says origin https://pheyvaer.github.io is trusted by owner https://michielbdejong.com/profile/card#me
})

const handler = makeHandler(storage, 'http://localhost:8080', new URL('ws://localhost:8080'), false, 'localhost:8443', false)

test('handles a GET request for a public resource', async () => {
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {
    origin: 'https://pheyvaer.github.io'
  } as http.IncomingHttpHeaders
  httpReq.url = '/foo/bar' as string
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      404,
      expectedResponseHeaders({
        originToAllow: 'https://pheyvaer.github.io',
        contentType: 'text/plain',
        updatesVia: 'ws://localhost:8080/',
        idp: 'https://localhost:8443',
        constrainedBy: 'http://www.w3.org/ns/ldp#constrainedBy-not-found'
      })
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    ['Not found']
  ])
})

test('handles a GET request for a private resource', async () => {
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {
    origin: 'https://pheyvaer.github.io'
  } as http.IncomingHttpHeaders
  httpReq.url = '/private/bar' as string
  httpReq.method = 'GET'
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
        contentType: 'text/plain',
        updatesVia: 'ws://localhost:8080/',
        idp: 'https://localhost:8443',
        wwwAuthenticate: 'http://localhost:8080',
        constrainedBy: 'http://www.w3.org/ns/ldp#constrainedBy-wac'
      })
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    ['Access denied']
  ])
})

test('sets bearerToken in Updates-Via', async () => {
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {
    origin: 'https://pheyvaer.github.io',
    authorization: 'Bearer some-bearer-token'
  } as http.IncomingHttpHeaders
  httpReq.url = '/foo/bar' as string
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      404,
      expectedResponseHeaders({
        originToAllow: 'https://pheyvaer.github.io',
        contentType: 'text/plain',
        updatesVia: 'ws://localhost:8080/?bearer_token=some-bearer-token',
        idp: 'https://localhost:8443',
        constrainedBy: 'http://www.w3.org/ns/ldp#constrainedBy-not-found'
      })
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    ['Not found']
  ])
})

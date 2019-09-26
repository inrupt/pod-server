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

  const ldpRs1 = fs.readFileSync('test/fixtures/ldpRs1.ttl')
  const ldpRs1Data = await objectToStream(makeResourceData('text/turtle', ldpRs1.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/foo/ldp-rs1.ttl'))).setData(ldpRs1Data)
})

const handler = makeHandler(storage, 'http://localhost:8080', new URL('ws://localhost:8080'), false, 'localhost:8443', false)

test('handles a SPARQL query in the GET query parameter', async () => {
  const sparqlQuery = fs.readFileSync('test/fixtures/get-query.sparql').toString()

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {
    origin: 'https://pheyvaer.github.io'
  } as http.IncomingHttpHeaders
  httpReq.url = `/foo/ldp-rs1.ttl?query=${encodeURIComponent(sparqlQuery)}`
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.end.mock.calls).toEqual([
    [
      JSON.stringify({
        head: {
          vars: [ 'name' ]
        },
        results: {
          ordered: false,
          distinct: false,
          bindings: [
            {
              name: { 'type': 'literal', 'value': 'Green Goblin' }
            }
          ]
        }
      })
    ]
  ])
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      200,
      expectedResponseHeaders({
        originToAllow: 'https://pheyvaer.github.io',
        idp: 'https://localhost:8443',
        contentType: 'application/sparql+json',
        etag: 'fTeBCZUGRxPpeUUf4DpHFg==',
        isContainer: false,
        updatesVia: 'ws://localhost:8080/'
      })
    ]
  ])
})

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

  const ldpRs2 = fs.readFileSync('test/fixtures/ldpRs2.ttl')
  const ldpRs2Data = await objectToStream(makeResourceData('text/turtle', ldpRs2.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/foo/ldp-rs2.ttl'))).setData(ldpRs2Data)
})

const handler = makeHandler(storage, 'http://localhost:8080', new URL('ws://localhost:8080'), false, 'localhost:8443', false)

test('handles a GET /* request (glob read)', async () => {
  const expectedTurtle = fs.readFileSync('test/fixtures/ldpRs1-2-merge.ttl').toString()
  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('')
  httpReq.headers = {
    origin: 'https://pheyvaer.github.io'
  } as http.IncomingHttpHeaders
  httpReq.url = '/foo/*' as string
  httpReq.method = 'GET'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  let triplesText: string = ''
  if (Array.isArray(httpRes.end.mock.calls[0]) && httpRes.end.mock.calls[0].length) {
    const args: Array<string> = httpRes.end.mock.calls[0]
    triplesText = args[0]
  }
  expect(triplesText.split('\n').sort()).toEqual(expectedTurtle.split('\n').sort())

  // FIXME: when running this test separately, the following triples also appear:
  // (from 'test/fixtures/aclDoc-read-rel-path-parent-container-with-owner.ttl' I guess!)
  // <#public> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .
  // <#public> <http://www.w3.org/ns/auth/acl#agentClass> <http://xmlns.com/foaf/0.1/Agent> .
  // <#public> <http://www.w3.org/ns/auth/acl#default> <../foo/> .
  // <#public> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .
  // <#owner> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/auth/acl#Authorization> .
  // <#owner> <http://www.w3.org/ns/auth/acl#default> <../foo/> .
  // <#owner> <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Control> .
  // <#owner> <http://www.w3.org/ns/auth/acl#agent> <https://michielbdejong.com/profile/card#me> .

  // the order will be different, and the ETag will be nTlfytRKUogadLYNnvpYjQ==
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      200,
      expectedResponseHeaders({
        originToAllow: 'https://pheyvaer.github.io',
        idp: 'https://localhost:8443',
        contentType: 'text/turtle',
        etag: 'TmBqjXO24ygE+uQdtQuiOA==',
        isContainer: true,
        updatesVia: 'ws://localhost:8080/'
      })
    ]
  ])
})

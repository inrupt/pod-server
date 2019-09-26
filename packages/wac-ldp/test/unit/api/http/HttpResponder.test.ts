import * as http from 'http'
import { sendHttpResponse, WacLdpResponse, ResultType } from '../../../../src/lib/api/http/HttpResponder'
import { makeResourceData } from '../../../../src/lib/rdf/ResourceDataUtils'
import { expectedResponseHeaders } from '../../../fixtures/expectedResponseHeaders'

test('should produce a http response', async () => {
  let responseTask: WacLdpResponse = {
    resultType: ResultType.OkayWithBody,
    resourceData: makeResourceData('content/type', 'bla bla bla'),
    createdLocation: undefined,
    isContainer: false
  }
  const res = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await sendHttpResponse(responseTask, { updatesVia: new URL('wss://localhost:8080/'), storageOrigin: 'http://localhost:8080', idpHost: 'localhost:8080', originToAllow: '*' }, res as unknown as http.ServerResponse)
  expect(res.writeHead.mock.calls).toEqual([
    [
      200,
      expectedResponseHeaders({
        etag: 'rxrYx2/aLkjqmu0pN+ly6g==',
        idp: 'https://localhost:8080',
        updatesVia: 'wss://localhost:8080/'
      })
    ]
  ])
  expect(res.end.mock.calls).toEqual([
    [
      'bla bla bla'
    ]
  ])
})

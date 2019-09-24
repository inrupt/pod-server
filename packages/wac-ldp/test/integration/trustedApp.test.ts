import * as fs from 'fs'
import * as http from 'http'
import { makeHandler } from '../unit/helpers/makeHandler'
import { BlobTreeInMem } from '../../src/lib/storage/BlobTreeInMem'
import { toChunkStream } from '../unit/helpers/toChunkStream'
import { objectToStream, makeResourceData, streamToObject } from '../../src/lib/rdf/ResourceDataUtils'
import { urlToPath, BlobTree } from '../../src/lib/storage/BlobTree'
import { getBearerToken } from '../fixtures/bearerToken'
import MockDate from 'mockdate'
import { expectedResponseHeaders } from '../fixtures/expectedResponseHeaders'

let storage: BlobTree
let handler: any
beforeEach(() => {
  storage = new BlobTreeInMem()
  handler = makeHandler(storage, 'https://jackson.solid.community', new URL('wss://jackson.solid.community/'), false, 'localhost:8443', true)
  MockDate.set(1434319925275)
})
afterEach(() => {
  MockDate.reset()
})

test('handles a PUT request by a trusted app', async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc-readwrite-owner.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(urlToPath(new URL('https://jackson.solid.community/foo/.acl'))).setData(publicContainerAclDocData)

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('asdf')
  const { bearerToken } = getBearerToken(true)
  httpReq.headers = {
    'content-type': 'text/plain',
    'if-none-match': '*',
    'authorization': 'Bearer ' + bearerToken
  } as http.IncomingHttpHeaders
  httpReq.url = '/foo/bar' as string
  httpReq.method = 'PUT'
  httpReq = httpReq as http.IncomingMessage
  const httpRes = {
    writeHead: jest.fn(() => { }), // tslint:disable-line: no-empty
    end: jest.fn(() => { }) // tslint:disable-line: no-empty
  }
  await handler(httpReq, httpRes as unknown as http.ServerResponse)
  expect(httpRes.writeHead.mock.calls).toEqual([
    [
      201,
      expectedResponseHeaders({
        originToAllow: 'https://pheyvaer.github.io',
        idp: 'https://localhost:8443',
        contentType: 'text/plain',
        isContainer: false,
        serviceOrigin: 'https://jackson.solid.community',
        location: 'https://jackson.solid.community/foo/bar',
        updatesVia: 'wss://jackson.solid.community/?bearer_token=eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJodHRwczovL3BoZXl2YWVyLmdpdGh1Yi5pbyIsImF1ZCI6Imh0dHBzOi8vamFja3Nvbi5zb2xpZC5jb21tdW5pdHkiLCJleHAiOjE1NjA3NzM4OTcsImlhdCI6MTU2MDc3MDI5NywiaWRfdG9rZW4iOiJleUpoYkdjaU9pSlNVekkxTmlJc0luUjVjQ0k2SWtwWFZDSXNJbXRwWkNJNkluaGxUMnBsY3psMU0wRmpWVFJNUW5wallXNUZUVGR3V2t4M1UyeDRZVTQzVlRZeVducFBRa1JSZFhjaWZRLmV5SnpkV0lpT2lKb2RIUndjem92TDJwaFkydHpiMjR1YzI5c2FXUXVZMjl0YlhWdWFYUjVMM0J5YjJacGJHVXZZMkZ5WkNOdFpTSXNJbTV2Ym1ObElqb2lXSHB4YVVkVGFqRldTM1p0WWxCblNtbFdOMEZRYUcxYU5VaHlaVk5wWDJOUGJFMUNNbTVwTjJ0MldTSXNJbk5wWkNJNkltRmxPVGszTkRNMUxUSXlZMlF0TkRKbU5DMWhaRFkzTFRaaVl6WTBaRFV5TXpSa1lTSXNJbUYwWDJoaGMyZ2lPaUprUjBKWFF6VnVkRk5RY21aaGR6TXdTV1YwWVc5Uklpd2ljMTlvWVhOb0lqb2llRFJYUlV3eVkzZzFhMGxOZDB0RWRXVnFkRE56ZHlJc0ltTnVaaUk2ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbVVpT2lKQlVVRkNJaXdpWlhoMElqcDBjblZsTENKclpYbGZiM0J6SWpwYkluWmxjbWxtZVNKZExDSnJkSGtpT2lKU1UwRWlMQ0p1SWpvaWVEaERObWRMY0Uxd01saDVOWFJGVmtRNU4yUk9YMGd3VG5KWFZUWldORzlLWmpOellrVnBWRUp3YVc5b1oxVnhTbDkzY1dKNVR6UTRlbVpEZVhOTE5ITTVaVm8zTW1SMWJUWkxNWEJpYkVSRlkxaE1kMTgzUjIxQ2IyZFRWbUp0YUdVNFlsQnBNa1oxU2pOclIwSnZkV05ITkRWcldrdzFNVEJYV0VkcGNsQkpibUl4VUhWSVF6TlJXakpxVkhaQmIwUTVaRWx1T1d0RU16ZzBVR2d4ZDJselJuSk1UVzB4UW1kMmJUTlNaek01VGxCTlNtMVdSR1pmY1drd2IwYzFSRFJEY0dSaVV6QlBkVkUxWm01NVVXdGpSSFpPYlc1R1VVZ3dNRll5TkRSTWNXUnZWakZ0UW00eFZYWnhOaTFJUkVvemIyRmFUMWg1TTBabVFuUm5SWFZ3VkhCSGEzQnRUbVpKY1dWbGJrOUtVekJzWHpnMVJFNTFUSGRTUm1ndFVsbDRRbDlsUWswNU1VbDZkRnAwY1dwTFR6WnJUVzFVZFZadVJucEVNbTFPZEVSelJIVjZNVTVMU0hsSE1rbHpkVzF3UlVGUkluMHNJbUYxWkNJNkltaDBkSEJ6T2k4dmNHaGxlWFpoWlhJdVoybDBhSFZpTG1sdklpd2laWGh3SWpveE5UWXdOemN6T0RreUxDSnBZWFFpT2pFMU5qQTNOekF5T1RJc0ltbHpjeUk2SW1oMGRIQnpPaTh2Ykc5allXeG9iM04wT2pnME5ETWlmUS5ZWFM0MlhlbWFzajZEUk5lNEd5LVp3MDBoLXpFU29YRnE1YVNUR3MwckpiMExTMkdhd2RPa19iSEd0ZVZrMHNLdUtfZFhobHlnUl9DeDNqOHE2QmVSWDFTTHdPSkpyLTc4dkZZMFV1R2ZvRjZMSXJjM1dSaXpCMmtoZEt2WVBhNThXSDk2Um00YlBaNVVZTzUzYnFMYnE0ejRWWFU0b19tLVFvUzdUUEtmQ0tRVWd4ZG9HUkJUWXlnZUxzYmx3dFQzeXRwYXhjYjFBVjFYc19zWFhuelpqMnNCcURoaUs3T0ZjdmNPbi0waUxfTUVNS01VVFhfMHNnSTBsc0ZIbU5wdmtwU3hCT2NOZVVfWDlhWVF4YXp3VXpjdWNJM3lxQ1FYam9Oa0ktYXdsMzJ4VkRfd25IN2FYd19RSTVUOU1JckhGOG9XWXBhRVp6LXE3SG1kRVFVa0EiLCJ0b2tlbl90eXBlIjoicG9wIn0.iLAwGcEi-LmibDum3rMxGpVGz9lXHqeLR9uXImCM097Mm29EeIcZX8Pgb0W3T2jQSKlL0HuiSGO1bkl5sEQqLq4FswXrSARnOjnEQt_uQZRj3Hzm7BWH_MpHKeTzvMXQayeJyqyV6w_gvpAeSYC5Lz4ybESajc8bWtBZ_2O4SQG5L3wFUv_GkYFUL8gTPOWI8F9bpSTz_Q99EftjD0DvJQeEMJTqX5XHECFZvx5PfV36syA82xlLEF_yrLuQqozBnlrAKPDGuPsgxKwjwlipXgO1ToZ_rdL0rwSNcoyRoRHv9_POhdYsAqWhTiGVxHq0xiHqqeJMtdQcl-ZtGx1XRQ'
      })
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    [ 'Created' ]
  ])
  const result = await storage.getBlob(urlToPath(new URL('https://jackson.solid.community/foo/bar'))).getData()
  expect(await streamToObject(result)).toEqual(makeResourceData('text/plain', 'asdf'))
})

test.skip('rejects a PUT request by an untrusted app', async () => {
  const aclDoc = fs.readFileSync('test/fixtures/aclDoc-readwrite.ttl')
  const publicContainerAclDocData = await objectToStream(makeResourceData('text/turtle', aclDoc.toString()))
  await storage.getBlob(urlToPath(new URL('http://localhost:8080/foo/.acl'))).setData(publicContainerAclDocData)

  let streamed = false
  let endCallback: () => void
  let httpReq: any = toChunkStream('asdf')
  httpReq.headers = {
    'Content-Type': 'text/plain'
  } as http.IncomingHttpHeaders
  httpReq.url = '/foo/bar' as string
  httpReq.method = 'PUT'
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
        contentType: 'text/plain',
        etag: 'fTeBCZUGRxPpeUUf4DpHFg==',
        isContainer: false,
        updatesVia: 'wss://jackson.solid.community/?bearer_token=eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJodHRwczovL3BoZXl2YWVyLmdpdGh1Yi5pbyIsImF1ZCI6Imh0dHBzOi8vamFja3Nvbi5zb2xpZC5jb21tdW5pdHkiLCJleHAiOjE1NjA3NzM4OTcsImlhdCI6MTU2MDc3MDI5NywiaWRfdG9rZW4iOiJleUpoYkdjaU9pSlNVekkxTmlJc0luUjVjQ0k2SWtwWFZDSXNJbXRwWkNJNkluaGxUMnBsY3psMU0wRmpWVFJNUW5wallXNUZUVGR3V2t4M1UyeDRZVTQzVlRZeVducFBRa1JSZFhjaWZRLmV5SnpkV0lpT2lKb2RIUndjem92TDJwaFkydHpiMjR1YzI5c2FXUXVZMjl0YlhWdWFYUjVMM0J5YjJacGJHVXZZMkZ5WkNOdFpTSXNJbTV2Ym1ObElqb2lXSHB4YVVkVGFqRldTM1p0WWxCblNtbFdOMEZRYUcxYU5VaHlaVk5wWDJOUGJFMUNNbTVwTjJ0MldTSXNJbk5wWkNJNkltRmxPVGszTkRNMUxUSXlZMlF0TkRKbU5DMWhaRFkzTFRaaVl6WTBaRFV5TXpSa1lTSXNJbUYwWDJoaGMyZ2lPaUprUjBKWFF6VnVkRk5RY21aaGR6TXdTV1YwWVc5Uklpd2ljMTlvWVhOb0lqb2llRFJYUlV3eVkzZzFhMGxOZDB0RWRXVnFkRE56ZHlJc0ltTnVaaUk2ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbVVpT2lKQlVVRkNJaXdpWlhoMElqcDBjblZsTENKclpYbGZiM0J6SWpwYkluWmxjbWxtZVNKZExDSnJkSGtpT2lKU1UwRWlMQ0p1SWpvaWVEaERObWRMY0Uxd01saDVOWFJGVmtRNU4yUk9YMGd3VG5KWFZUWldORzlLWmpOellrVnBWRUp3YVc5b1oxVnhTbDkzY1dKNVR6UTRlbVpEZVhOTE5ITTVaVm8zTW1SMWJUWkxNWEJpYkVSRlkxaE1kMTgzUjIxQ2IyZFRWbUp0YUdVNFlsQnBNa1oxU2pOclIwSnZkV05ITkRWcldrdzFNVEJYV0VkcGNsQkpibUl4VUhWSVF6TlJXakpxVkhaQmIwUTVaRWx1T1d0RU16ZzBVR2d4ZDJselJuSk1UVzB4UW1kMmJUTlNaek01VGxCTlNtMVdSR1pmY1drd2IwYzFSRFJEY0dSaVV6QlBkVkUxWm01NVVXdGpSSFpPYlc1R1VVZ3dNRll5TkRSTWNXUnZWakZ0UW00eFZYWnhOaTFJUkVvemIyRmFUMWg1TTBabVFuUm5SWFZ3VkhCSGEzQnRUbVpKY1dWbGJrOUtVekJzWHpnMVJFNTFUSGRTUm1ndFVsbDRRbDlsUWswNU1VbDZkRnAwY1dwTFR6WnJUVzFVZFZadVJucEVNbTFPZEVSelJIVjZNVTVMU0hsSE1rbHpkVzF3UlVGUkluMHNJbUYxWkNJNkltaDBkSEJ6T2k4dmNHaGxlWFpoWlhJdVoybDBhSFZpTG1sdklpd2laWGh3SWpveE5UWXdOemN6T0RreUxDSnBZWFFpT2pFMU5qQTNOekF5T1RJc0ltbHpjeUk2SW1oMGRIQnpPaTh2Ykc5allXeG9iM04wT2pnME5ETWlmUS5ZWFM0MlhlbWFzajZEUk5lNEd5LVp3MDBoLXpFU29YRnE1YVNUR3MwckpiMExTMkdhd2RPa19iSEd0ZVZrMHNLdUtfZFhobHlnUl9DeDNqOHE2QmVSWDFTTHdPSkpyLTc4dkZZMFV1R2ZvRjZMSXJjM1dSaXpCMmtoZEt2WVBhNThXSDk2Um00YlBaNVVZTzUzYnFMYnE0ejRWWFU0b19tLVFvUzdUUEtmQ0tRVWd4ZG9HUkJUWXlnZUxzYmx3dFQzeXRwYXhjYjFBVjFYc19zWFhuelpqMnNCcURoaUs3T0ZjdmNPbi0waUxfTUVNS01VVFhfMHNnSTBsc0ZIbU5wdmtwU3hCT2NOZVVfWDlhWVF4YXp3VXpjdWNJM3lxQ1FYam9Oa0ktYXdsMzJ4VkRfd25IN2FYd19RSTVUOU1JckhGOG9XWXBhRVp6LXE3SG1kRVFVa0EiLCJ0b2tlbl90eXBlIjoicG9wIn0.iLAwGcEi-LmibDum3rMxGpVGz9lXHqeLR9uXImCM097Mm29EeIcZX8Pgb0W3T2jQSKlL0HuiSGO1bkl5sEQqLq4FswXrSARnOjnEQt_uQZRj3Hzm7BWH_MpHKeTzvMXQayeJyqyV6w_gvpAeSYC5Lz4ybESajc8bWtBZ_2O4SQG5L3wFUv_GkYFUL8gTPOWI8F9bpSTz_Q99EftjD0DvJQeEMJTqX5XHECFZvx5PfV36syA82xlLEF_yrLuQqozBnlrAKPDGuPsgxKwjwlipXgO1ToZ_rdL0rwSNcoyRoRHv9_POhdYsAqWhTiGVxHq0xiHqqeJMtdQcl-ZtGx1XRQ'
      })
    ]
  ])
  expect(httpRes.end.mock.calls).toEqual([
    [ 'Access Denied' ]
  ])
  const result = await storage.getBlob(urlToPath(new URL('http://localhost:8080/foo/bar'))).getData()
  expect(await streamToObject(result)).toEqual(makeResourceData('text/plain', 'asdf'))
})

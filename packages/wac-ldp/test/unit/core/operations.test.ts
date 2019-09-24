import * as http from 'http'
import { Blob } from '../../../src/lib/storage/Blob'
import { TaskType, WacLdpTask } from '../../../src/lib/api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../../../src/lib/api/http/HttpResponder'
import { toChunkStream } from '../helpers/toChunkStream'
import { makeResourceData, RdfType } from '../../../src/lib/rdf/ResourceDataUtils'
import { Container } from '../../../src/lib/storage/Container'
import { ReadContainerHandler } from '../../../src/lib/operationHandlers/ReadContainerHandler'
import { StoreManager } from '../../../src/lib/rdf/StoreManager'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'
import { DeleteContainerHandler } from '../../../src/lib/operationHandlers/DeleteContainerHandler'
import { ReadBlobHandler } from '../../../src/lib/operationHandlers/ReadBlobHandler'
import { DeleteBlobHandler } from '../../../src/lib/operationHandlers/DeleteBlobHandler'
import { IResourceIdentifier } from 'solid-server-ts'

test('delete blob', async () => {
  const node: Blob = {
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    }),
    exists: () => true,
    delete: jest.fn(() => {
      //
    })
  } as unknown as Blob
  const storage = {
    getBlob: () => node
  } as unknown
  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'DELETE',
    headers: {}
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await (new DeleteBlobHandler('', {} as IResourceIdentifier, {}, storeManager, task)).handle(task, storeManager, 'https://example.com', false, false)
  expect((node as any).delete.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resourcesChanged: [ new URL('https://example.com/foo') ],
    resultType: ResultType.OkayWithoutBody
  })
})

test.skip('write blob', async () => {
  // const node: Blob = {
  //   setData: jest.fn(() => {
  //     //
  //   }),
  //   exists: () => true
  // } as unknown as Blob
  // const operation = basicOperations(TaskType.blobWrite)
  // const task = new WacLdpTask('', {} as http.IncomingMessage)
  // const result: WacLdpResponse = await operation(task, node, false)
  // expect((node as any).setData.mock.calls).toEqual([
  //   []
  // ])
  // expect(result).toEqual({
  //   resultType: ResultType.OkayWithoutBody
  // })
})

test.skip('update blob', async () => {
  // const node: Blob = {
  //   setData: jest.fn(() => {
  //     //
  //   }),
  //   exists: () => true
  // } as unknown as Blob
  // const operation = basicOperations(TaskType.blobUpdate)
  // const task = new WacLdpTask('', {} as http.IncomingMessage)
  // const result: WacLdpResponse = await operation(task, node, false)
  // expect((node as any).setData.mock.calls).toEqual([
  //   []
  // ])
  // expect(result).toEqual({
  //   resultType: ResultType.OkayWithoutBody
  // })
})

test('delete container', async () => {
  const node: Container = {
    delete: jest.fn(() => {
      //
    }),
    exists: () => true
  } as unknown as Container
  const storage = {
    getContainer: () => node
  } as unknown
  const task = new WacLdpTask('https://example.com', {
    url: '/foo/',
    method: 'GET',
    headers: {}
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await (new DeleteContainerHandler('', {} as IResourceIdentifier, {}, storeManager, task)).handle(task, storeManager, 'https://example.com', false, false)
  expect((node as any).delete.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resourcesChanged: [ new URL('https://example.com/foo/') ],
    resultType: ResultType.OkayWithoutBody
  })
})

test('read blob (omit body)', async () => {
  const node: Blob = {
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    }),
    exists: () => true
  } as unknown as Blob
  const storage = {
    getBlob: () => node
  } as unknown
  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'HEAD'
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await (new ReadBlobHandler('', {} as IResourceIdentifier, {}, storeManager)).handle(task, storeManager, 'https://example.com', false, false)
  // FIXME: Why does it call getData twice?
  expect((node as any).getData.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resourceData: {
      body: 'bla',
      contentType: 'text/plain',
      etag: 'Eo7PVCo1rFJwqH3HQJGEBA==',
      rdfType: RdfType.Unknown
    },
    resultType: ResultType.OkayWithoutBody
  })
})

test('read blob (with body)', async () => {
  const node: Blob = {
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    }),
    exists: () => true
  } as unknown as Blob
  const storage = {
    getBlob: () => node
  } as unknown
  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'GET'
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await (new ReadBlobHandler('', {} as IResourceIdentifier, {}, storeManager)).handle(task, storeManager, 'https://example.com', false, false)
  // FIXME: Why does it call getData twice?
  expect((node as any).getData.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resourceData: {
      body: 'bla',
      contentType: 'text/plain',
      etag: 'Eo7PVCo1rFJwqH3HQJGEBA==',
      rdfType: RdfType.Unknown
    },
    resultType: ResultType.OkayWithBody
  })
})

test('read blob (if-none-match 304)', async () => {
  // see https://github.com/inrupt/wac-ldp/issues/114
  const node: Blob = {
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    }),
    exists: () => true
  } as unknown as Blob
  const storage = {
    getBlob: () => node
  } as unknown
  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'GET',
    headers: {
      'if-none-match': '"Eo7PVCo1rFJwqH3HQJGEBA=="'
    }
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  expect.assertions(2)
  await (new ReadBlobHandler('', {} as IResourceIdentifier, {}, storeManager)).handle(task, storeManager, 'https://example.com', false, false).catch(e => {
    expect(e.resultType).toEqual(ResultType.NotModified)
  })

  // FIXME: Why does it call getData twice?
  expect((node as any).getData.mock.calls).toEqual([
    []
  ])
})

test('write blob (if-none-match 412)', async () => {
  // see https://github.com/inrupt/wac-ldp/issues/114
  const node: Blob = {
    getData: jest.fn(() => {
      return toChunkStream(JSON.stringify(makeResourceData('text/plain', 'bla')))
    }),
    exists: () => true
  } as unknown as Blob
  const storage = {
    getBlob: () => node
  } as unknown
  const task = new WacLdpTask('https://example.com', {
    url: '/foo',
    method: 'PUT',
    headers: {
      'if-none-match': '"Eo7PVCo1rFJwqH3HQJGEBA=="'
    }
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  expect.assertions(2)
  await (new ReadBlobHandler('', {} as IResourceIdentifier, {}, storeManager)).handle(task, storeManager, 'https://example.com', false, false).catch(e => {
    expect(e.resultType).toEqual(ResultType.PreconditionFailed)
  })

  // FIXME: Why does it call getData twice?
  expect((node as any).getData.mock.calls).toEqual([
    []
  ])
})

test('read container (omit body)', async () => {
  const node: Container = {
    getMembers: jest.fn(() => {
      return []
    }),
    exists: () => true
  } as unknown as Container
  const storage = {
    getContainer: () => node
  } as unknown
  const task = new WacLdpTask('https://example.com', {
    url: '/foo/',
    method: 'HEAD',
    headers: {}
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await (new ReadContainerHandler('', {} as IResourceIdentifier, {}, storeManager, task)).handle(task, storeManager, 'https://example.com', false, false)
  expect((node as any).getMembers.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithoutBody,
    isContainer: true,
    resourceData: {
      body: [
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#BasicContainer> .`,
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Container> .`,
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#RDFSource> .`,
        ''
      ].join('\n'),
      contentType: 'text/turtle',
      etag: 'b7tBKbyK9TFeTR66sFzUKw==',
      rdfType: RdfType.Turtle
    }
  })
})

test('read container (with body)', async () => {
  const node: Container = {
    getMembers: jest.fn(() => {
      return []
    }),
    exists: () => true
  } as unknown as Container
  const storage = {
    getContainer: () => node
  } as unknown
  const task = new WacLdpTask('https://example.com', {
    url: '/foo/',
    method: 'GET',
    headers: {}
  } as http.IncomingMessage, true)
  const storeManager = new StoreManager('example.com', storage as QuadAndBlobStore)
  const result: WacLdpResponse = await (new ReadContainerHandler('', {} as IResourceIdentifier, {}, storeManager, task)).handle(task, storeManager, 'https://example.com', false, false)
  expect((node as any).getMembers.mock.calls).toEqual([
    []
  ])
  expect(result).toEqual({
    resultType: ResultType.OkayWithBody,
    isContainer: true,
    resourceData: {
      body: [
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#BasicContainer> .`,
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Container> .`,
        `<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#RDFSource> .`,
        ''
      ].join('\n'),
      contentType: 'text/turtle',
      etag: 'b7tBKbyK9TFeTR66sFzUKw==',
      rdfType: RdfType.Turtle
    }
  })
})

test('read glob (with body)', async () => {
  // ...
})

import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import fs from 'fs'
import { appIsTrustedForMode, OriginCheckTask, getAppModes } from '../../../src/lib/authorization/appIsTrustedForMode'
import { setAppModes } from '../../../src/lib/rdf/setAppModes'
import { StoreManager } from '../../../src/lib/rdf/StoreManager'
import { ACL } from '../../../src/lib/rdf/rdf-constants'
import { objectToStream, makeResourceData, streamToObject } from '../../../src/lib/rdf/ResourceDataUtils'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'

const OWNER_PROFILE_FIXTURE = 'test/fixtures/owner-profile.ttl'

function readFixture (filename: string): Promise<any> {
  const bodyStream = fs.createReadStream(filename)
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  return rdf.dataset().import(quadStream)

}
test('finds acl:trustedApps nodes and their modes for a given owners list', async () => {
  const task = {
    origin: 'https://pheyvaer.github.io',
    mode: ACL.Read,
    resourceOwners: [ new URL('https://michielbdejong.com/profile/card#me')]
  } as OriginCheckTask

  const storeManager = new StoreManager('example.com', {} as any)
  const result = await appIsTrustedForMode(task, storeManager)
  expect(result).toEqual(true)
})

test('getTrustedAppModes', async () => {
  const storeManager = new StoreManager('example.com', {} as any)
  const modes = await getAppModes(new URL('https://michielbdejong.com/profile/card#me'), 'https://pheyvaer.github.io', storeManager)

  expect(JSON.stringify(modes)).toEqual(JSON.stringify([
    new URL('http://www.w3.org/ns/auth/acl#Append'),
    new URL('http://www.w3.org/ns/auth/acl#Read'),
    new URL('http://www.w3.org/ns/auth/acl#Write')
  ]))
})

test('setTrustedAppModes existing', async () => {
  let stored
  const storage: unknown = {
    getBlob: jest.fn(() => {
      return {
        getData () {
          return new Promise((resolve, reject) => {
            fs.readFile(OWNER_PROFILE_FIXTURE, (err, data) => {
              if (err) {
                reject('fixture error')
              }
              resolve(objectToStream(makeResourceData('text/turtle', data.toString())))
            })
          })
        },
        setData: async (stream: ReadableStream) => {
          stored = await streamToObject(stream)
        }
      }
    })
  }
  const modes = [
    new URL('http://www.w3.org/ns/auth/acl#Append'),
    new URL('http://www.w3.org/ns/auth/acl#Control')
  ]
  await setAppModes(new URL('https://michielbdejong.com/profile/card#me'), 'https://pheyvaer.github.io', modes, storage as QuadAndBlobStore)

  expect(stored).toEqual({
    body: [
      '@prefix : <#>.',
      '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
      '@prefix c: <card#>.',
      '',
      'c:me',
      '    acl:trustedApp',
      '            [',
      '                acl:mode acl:Append, acl:Control;',
      '                acl:origin <https://pheyvaer.github.io>',
      '            ].'
    ].join('\n') + '\n',
    contentType: 'text/turtle',
    etag: 'uqaW7He/rsiuCtTTVMxI2w==',
    rdfType: 1
  })
})

test('setTrustedAppModes new', async () => {
  let stored
  const storage: unknown = {
    getBlob: jest.fn(() => {
      return {
        getData () {
          return new Promise((resolve, reject) => {
            fs.readFile(OWNER_PROFILE_FIXTURE, (err, data) => {
              if (err) {
                reject('fixture error')
              }
              resolve(objectToStream(makeResourceData('text/turtle', data.toString())))
            })
          })
        },
        setData: async (stream: ReadableStream) => {
          stored = await streamToObject(stream)
        }
      }
    })
  }
  const modes = [
    new URL('http://www.w3.org/ns/auth/acl#Append'),
    new URL('http://www.w3.org/ns/auth/acl#Control')
  ]
  await setAppModes(new URL('https://michielbdejong.com/profile/card#me'), 'https://other.com', modes, storage as QuadAndBlobStore)
  expect(stored).toEqual({
    body: [
      '@prefix : <#>.',
      '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
      '@prefix c: <card#>.',
      '',
      'c:me',
      '    acl:trustedApp',
      '        [ acl:mode acl:Append, acl:Control; acl:origin <https://other.com> ],',
      '            [',
      '                acl:mode acl:Append, acl:Read, acl:Write;',
      '                acl:origin <https://pheyvaer.github.io>',
      '            ].'
    ].join('\n') + '\n',
    contentType: 'text/turtle',
    etag: 'ZnizD9weXrPTANC1tjW/ow==',
    rdfType: 1
  })
})

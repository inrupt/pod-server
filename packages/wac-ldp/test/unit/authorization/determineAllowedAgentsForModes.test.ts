import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import fs from 'fs'
import { determineAllowedAgentsForModes, ModesCheckTask } from '../../../src/lib/authorization/determineAllowedAgentsForModes'
import { StoreManager } from '../../../src/lib/rdf/StoreManager'
import { BlobTreeInMem } from '../../../src/lib/storage/BlobTreeInMem'
import { ACL } from '../../../src/lib/rdf/rdf-constants'
import { QuadAndBlobStore } from '../../../src/lib/storage/QuadAndBlobStore'

test('finds acl:accessTo modes', async () => {
  const bodyStream = fs.createReadStream('test/fixtures/aclDoc-from-NSS-1.ttl')
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  const dataset = await rdf.dataset().import(quadStream)
  const task: ModesCheckTask = {
    aclGraph: dataset,
    resourceIsTarget: true,
    contextUrl: new URL('https://example.com'),
    targetUrl: new URL('https://example.com'),
    storeManager: new StoreManager('example.com', new QuadAndBlobStore(new BlobTreeInMem()))
  }
  const result = await determineAllowedAgentsForModes(task)
  expect(result).toEqual({
    [ACL.Read.toString()]: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org'],
    [ACL.Write.toString()]: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org'],
    [ACL.Append.toString()]: [],
    [ACL.Control.toString()]: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org']
  })
})

test('finds acl:default modes', async () => {
  const bodyStream = fs.createReadStream('test/fixtures/aclDoc-from-NSS-1.ttl')
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  const dataset = await rdf.dataset().import(quadStream)
  const task: ModesCheckTask = {
    aclGraph: dataset,
    contextUrl: new URL('/.acl', 'https://example.com/'),
    targetUrl: new URL('/', 'https://example.com/'),
    resourceIsTarget: true,
    storeManager: new StoreManager('example.com', new QuadAndBlobStore(new BlobTreeInMem()))
  }
  const result = await determineAllowedAgentsForModes(task)
  expect(result).toEqual({
    [ACL.Read.toString()]: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org'],
    [ACL.Write.toString()]: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org'],
    [ACL.Append.toString()]: [],
    [ACL.Control.toString()]: ['https://michielbdejong.inrupt.net/profile/card#me', 'mailto:michiel@unhosted.org']
  })
})

// tests to add:
// * agent groups

function testUrlFormat (format: string, target: string, resourceIsTarget: boolean) {
  test(`finds acl:accessTo modes (${format})`, async () => {
    const bodyStream = fs.createReadStream(`test/fixtures/aclDoc-read-${format}.ttl`)
    let parser = new N3Parser({
      factory: rdf
    })
    let quadStream = parser.import(bodyStream)
    const dataset = await rdf.dataset().import(quadStream)
    const task: ModesCheckTask = {
      aclGraph: dataset,
      resourceIsTarget,
      targetUrl: new URL(target),
      contextUrl: new URL(target + '.acl'),
      storeManager: new StoreManager('example.com', new QuadAndBlobStore(new BlobTreeInMem()))
    }
    const result = await determineAllowedAgentsForModes(task)
    expect(result).toEqual({
      [ACL.Read.toString()]: ['http://xmlns.com/foaf/0.1/Agent'],
      [ACL.Write.toString()]: [],
      [ACL.Append.toString()]: [],
      [ACL.Control.toString()]: []
    })
  })
}
testUrlFormat('abs-path-missing-trailing-slash', 'https://example.org/foo/', true)
testUrlFormat('abs-path', 'https://example.org/foo/', true)
testUrlFormat('and-container-read', 'https://example.org/foo/', true)
testUrlFormat('and-container-read', 'https://example.org/foo/', false)
testUrlFormat('full-url-missing-trailing-slash', 'https://example.org/foo/', true)
testUrlFormat('full-url', 'https://example.org/foo/', true)

testUrlFormat('rel-path-container-missing-trailing-slash', 'https://example.org/foo/', true)
testUrlFormat('rel-path-container', 'https://example.org/foo/', true)
testUrlFormat('rel-path-non-container-no-dot', 'https://example.org/foo/bar', true)
testUrlFormat('rel-path-non-container', 'https://example.org/foo/bar', true)
testUrlFormat('rel-path-parent-container-missing-trailing-slash', 'https://example.org/foo/', false)
testUrlFormat('rel-path-parent-container', 'https://example.org/foo/', false)

test(`acl:default does not imply acl:accessTo`, async () => {
  const bodyStream = fs.createReadStream(`test/fixtures/aclDoc-read-rel-path-parent-container.ttl`)
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  const dataset = await rdf.dataset().import(quadStream)
  const task: ModesCheckTask = {
    aclGraph: dataset,
    resourceIsTarget: true,
    targetUrl: new URL('https://example.org/foo/'),
    contextUrl: new URL('https://example.org/foo/.acl'),
    storeManager: new StoreManager('example.com', new QuadAndBlobStore(new BlobTreeInMem()))
  }
  const result = await determineAllowedAgentsForModes(task)
  expect(result).toEqual({
    [ACL.Read.toString()]: [],
    [ACL.Write.toString()]: [],
    [ACL.Append.toString()]: [],
    [ACL.Control.toString()]: []
  })
})

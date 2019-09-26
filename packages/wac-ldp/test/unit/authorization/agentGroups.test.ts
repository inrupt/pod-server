import rdf from 'rdf-ext'
import N3Parser from 'rdf-parser-n3'
import fs from 'fs'
import { determineAllowedAgentsForModes, ModesCheckTask } from '../../../src/lib/authorization/determineAllowedAgentsForModes'
import { StoreManager } from '../../../src/lib/rdf/StoreManager'

function readFixture (filename: string): Promise<any> {
  const bodyStream = fs.createReadStream(filename)
  let parser = new N3Parser({
    factory: rdf
  })
  let quadStream = parser.import(bodyStream)
  return rdf.dataset().import(quadStream)

}
test('finds acl:accessTo modes for local agent group', async () => {
  const dataset = await readFixture('test/fixtures/aclDoc-agent-group.ttl')
  // const workGroupsGraph = await readFixture('test/fixtures/work-groups.ttl')
  const task: ModesCheckTask = {
    aclGraph: dataset,
    resourceIsTarget: true,
    contextUrl: new URL('https://example.com'),
    targetUrl: new URL('https://example.com'),
    storeManager: new StoreManager('example.org', {} as any)
  }
  const result = await determineAllowedAgentsForModes(task)
  expect(result).toEqual({
    'http://www.w3.org/ns/auth/acl#Read': [],
    'http://www.w3.org/ns/auth/acl#Write': [],
    'http://www.w3.org/ns/auth/acl#Append': [
      'https://bob.example.com/profile/card#me',
      'https://candice.example.com/profile/card#me',
      'https://deb.example.com/profile/card#me'
    ],
    'http://www.w3.org/ns/auth/acl#Control': []
  })
})

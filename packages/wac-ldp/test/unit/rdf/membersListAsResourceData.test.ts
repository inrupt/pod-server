
import { ResourceData, makeResourceData, RdfType } from '../../../src/lib/rdf/ResourceDataUtils'
import { membersListAsResourceData } from '../../../src/lib/storage/membersListAsResourceData'
import { Member } from '../../../src/lib/storage/Container'

const membersList: Array<Member> = [
  { name: '1', isContainer: false },
  { name: '2', isContainer: true }
]

test('asTurtle', async () => {
  const resourceData: ResourceData = await membersListAsResourceData(new URL('https://example.com/foo/'), membersList, RdfType.Turtle)
  expect(resourceData).toEqual({
    contentType: 'text/turtle',
    body: [
      '<> <http://www.w3.org/ns/ldp#contains> <https://example.com/foo/1> .',
      '<> <http://www.w3.org/ns/ldp#contains> <https://example.com/foo/2> .',
      '<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#BasicContainer> .',
      '<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#Container> .',
      '<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/ldp#RDFSource> .'
    ].join('\n') + '\n',
    etag: 'urDZ67shsseSvB1Q9hRytA==',
    rdfType: RdfType.Turtle
  })
})

test('As JSON-LD', async () => {
  const resourceData: ResourceData = await membersListAsResourceData(new URL('https://example.com/foo/'), membersList, RdfType.JsonLd)
  expect(resourceData).toEqual({
    contentType: 'application/ld+json',
    body: JSON.stringify([
      {
        '@id': '',
        'http://www.w3.org/ns/ldp#contains': {
          '@id': 'https://example.com/foo/1'
        }
      },
      {
        '@id': '',
        'http://www.w3.org/ns/ldp#contains': {
          '@id': 'https://example.com/foo/2'
        }
      },
      {
        '@id': '',
        '@type': 'http://www.w3.org/ns/ldp#BasicContainer'
      },
      {
        '@id': '',
        '@type': 'http://www.w3.org/ns/ldp#Container'
      },
      {
        '@id': '',
        '@type': 'http://www.w3.org/ns/ldp#RDFSource'
      }
    ]),
    etag: 'jkHpd7hL6F2eZ5O6u0mhdA==',
    rdfType: RdfType.JsonLd
  })
})

import { makeResourceData, RdfType } from '../../../src/lib/rdf/ResourceDataUtils'
import { resourceDataToRdf } from '../../../src/lib/rdf/mergeRdfSources'
import { rdfToResourceData } from '../../../src/lib/rdf/rdfToResourceData'

const JsonLdStr = JSON.stringify({
  '@id' : '',
  '@type' : [
    'http://www.w3.org/ns/ldp#RDFSource',
    'http://example.com/ns#Bug'
  ],
  'severity' : 'High',
  'description' : 'Issues that need to be fixed.',
  'title' : 'Another bug to test.',
  '@context' : {
    'description' : {
      '@id' : 'http://purl.org/dc/terms/description'
    },
    'title' : {
      '@id' : 'http://purl.org/dc/terms/title'
    },
    'severity' : {
      '@id' : 'http://example.com/ns#severity'
    }
  }
})

test.skip('json-ld to turtle', async () => {
  const resourceData = makeResourceData('application/ld+json; charset=ISO-8859-1', JsonLdStr)
  const rdf = await resourceDataToRdf(resourceData)
  const turtle = await rdfToResourceData(rdf, RdfType.Turtle)
  expect(turtle).toEqual('')
})

test.skip('json-ld to json-ld', async () => {
  const resourceData = makeResourceData('application/ld+json; charset=ISO-8859-1', JsonLdStr)

  const rdf = await resourceDataToRdf(resourceData)
  const turtle = await rdfToResourceData(rdf, RdfType.JsonLd)
  expect(turtle).toEqual('')
})

import rdf from 'rdf-ext'
import Debug from 'debug'
import convert from 'buffer-to-stream'
import N3Parser from 'rdf-parser-n3'
import JsonLdParser from 'rdf-parser-jsonld'

import { ResourceData, RdfType } from './ResourceDataUtils'
import { rdfToResourceData } from './rdfToResourceData'

const debug = Debug('mergeRdfSources')

async function readAndMerge (rdfSources: { [indexer: string]: ResourceData }): Promise<any> {
  let dataset = rdf.dataset()
  debug('created dataset')
  dataset.forEach((quad: any) => { debug(quad.toString()) })
  for (let i in rdfSources) {
    let parser
    if (rdfSources[i].rdfType === RdfType.JsonLd) {
      parser = new JsonLdParser({ factory: rdf })
    } else if (rdfSources[i].rdfType === RdfType.Turtle) {
      parser = new N3Parser({ factory: rdf })
    }
    if (!parser) {
      debug('no parser found for', rdfSources[i].rdfType)
      continue
    }
    const bodyStream = convert(Buffer.from(rdfSources[i].body))
    const quadStream = parser.import(bodyStream)
    await dataset.import(quadStream)
    debug('after import', rdfSources[i].body)
    dataset.forEach((quad: any) => { debug(quad.toString()) })
    debug('done listing quads', dataset)
  }
  return dataset
}

export async function mergeRdfSources (rdfSources: { [indexer: string]: ResourceData }, rdfType: RdfType) {
  const datasetStream = (await readAndMerge(rdfSources)).toStream()
  return rdfToResourceData(datasetStream, rdfType)
}

export function resourceDataToRdf (resourceData: ResourceData): Promise<any> {
  return readAndMerge({ resourceData })
}

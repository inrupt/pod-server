import { WacLdpTask, TaskType } from '../api/http/HttpParser'
import { WacLdpResponse, ResultType } from '../api/http/HttpResponder'

import Debug from 'debug'

import { makeResourceData } from '../rdf/ResourceDataUtils'
import { StoreManager } from '../rdf/StoreManager'
import { resourceDataToRdf } from '../rdf/mergeRdfSources'
import { rdfToResourceData } from '../rdf/rdfToResourceData'
import { newEngine } from '@comunica/actor-init-sparql-rdfjs'
import { Store } from 'n3'

import { getResourceDataAndCheckETag } from './getResourceDataAndCheckETag'
import { IResourceIdentifier, IOperation, IRepresentationPreferences, IResourceStore, ResponseDescription, PermissionSet } from 'solid-server-ts'

const debug = Debug('read-blob-handler')

function removeLeadingQuestionMark (str: string) {
  return str.substring(1)
}

async function applyQuery (dataset: any, sparqlQuery: string): Promise<string> {
  const store = new Store()
  dataset.forEach((quad: any) => {
    debug('quad', quad.toString())
    store.addQuad(quad)
  })
  const myEngine = newEngine()
  const result: any = await myEngine.query(sparqlQuery,
    { sources: [ { type: 'rdfjsSource', value: store } ] })
  // const sparqlResult = await myEngine.resultToString(result, 'application/json')
  // debug(sparqlResult)
  const bindings = await new Promise((resolve) => {
    const bindings: any = []
    result.bindingsStream.on('end', () => {
      resolve(bindings)
    })
    result.bindingsStream.on('data', (data: any) => {
      const binding: any = {}
      const obj = JSON.parse(JSON.stringify(data))
      debug(obj)
      for (const key in obj) {
        binding[removeLeadingQuestionMark(key)] = {
          type: obj[key].termType.toLowerCase(),
          value: obj[key].value
        }
      }
      bindings.push(binding)
    })
  })
  return JSON.stringify({
    head: {
      vars: result.variables.map(removeLeadingQuestionMark)
    },
    results: {
      ordered: false,
      distinct: false,
      bindings
    }
  })
}

export class ReadBlobHandler implements IOperation {
  preferences: IRepresentationPreferences
  target: IResourceIdentifier
  resourceStore: IResourceStore
  operationOptions: any
  async execute (): Promise<ResponseDescription> {
    return this.handle(this.preferences as WacLdpTask, this.resourceStore as StoreManager,
        this.operationOptions.aud, this.operationOptions.skipWac, this.operationOptions.appendOnly)
  }
  constructor (method: string, target: IResourceIdentifier, representationPreferences: IRepresentationPreferences, resourceStore: StoreManager, operationOptions?: any) {
    this.preferences = representationPreferences
    this.target = target
    this.resourceStore = resourceStore
    this.operationOptions = operationOptions
  }
  canHandle = () => ((this.preferences as WacLdpTask).wacLdpTaskType() === TaskType.blobRead)
  requiredPermissions = new PermissionSet({ read: true })
  handle = async function (task: WacLdpTask, storeManager: StoreManager, aud: string, skipWac: boolean, appendOnly: boolean): Promise<WacLdpResponse> {
    const resourceData = await getResourceDataAndCheckETag(task, storeManager)
    debug('operation readBlob!', task.rdfType())
    let result = {
    } as any
    const exists = !!resourceData
    if (!exists) {
      debug('resource does not exist')
      result.resultType = ResultType.NotFound
      return result
    }
    result.resourceData = resourceData
    // only convert if requested rdf type is not the one that was stored
    debug('checking for RDF type match')
    if (!task.rdfTypeMatches(result.resourceData.contentType)) {
      debug('rdf type needs conversion!', { stored: result.resourceData.contentType, required: task.rdfType() })
      const rdf = await resourceDataToRdf(result.resourceData)
      result.resourceData = await rdfToResourceData(rdf, task.rdfType())
    }
    debug('RDF type matching taken care of')

    const sparqlQuery: string | undefined = task.sparqlQuery()
    if (sparqlQuery) {
      debug('reading blob as rdf', result.resourceData)
      const rdf = await resourceDataToRdf(result.resourceData)
      rdf.forEach((quad: any) => { debug('quad', quad.toString()) })
      debug('done here printing quads')
      debug('applying query', task.sparqlQuery())
      const body: string = await applyQuery(rdf, sparqlQuery)
      debug('converting to requested representation', rdf)
      result.resourceData = makeResourceData('application/sparql+json', body)
    }
    debug('result.resourceData set to ', result.resourceData)
    if (task.omitBody()) {
      result.resultType = ResultType.OkayWithoutBody
    } else {
      result.resultType = ResultType.OkayWithBody
    }
    return result as WacLdpResponse
  }
}

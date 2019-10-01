import Debug from 'debug'
import { PodServerConfiguration, StorageAdapter } from "../types/configuration.types";
import { applyPodServerConfigurationDefaults } from '../configurations/applyConfigurationDefaults';

const debug = Debug('pod-server')

const defaultConfiguration: PodServerConfiguration = {
  
}

export default class PodServer {
  // storageAdapter: StorageAdapter
  baseUrl: URL
  constructor(config: PodServerConfiguration, relativeFilePath: string = './') {
    debug(`Running pod server with the configuration: ${JSON.stringify(config, null, 2)}`)
    const manditoryOptionsConfiguration = applyPodServerConfigurationDefaults(config, relativeFilePath)
    console.log(manditoryOptionsConfiguration)
    this.baseUrl = new URL(`${manditoryOptionsConfiguration.network.protocol}://${manditoryOptionsConfiguration.network.hostname}:${manditoryOptionsConfiguration.network.port}`)
  }

  listen() {
    console.log('listening')
  }
}
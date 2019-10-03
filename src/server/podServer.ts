import Debug from 'debug'
import Koa from 'koa'

import { PodServerConfiguration, StorageAdapter, PodServerManditoryOptionsConfiguration } from "../types/configuration.types";
import { applyPodServerConfigurationDefaults } from '../configurations/applyConfigurationDefaults';
import initializeRoutes from './router';

const debug = Debug('pod-server')

const defaultConfiguration: PodServerConfiguration = {
  
}

export default class PodServer {
  app: Koa
  config: PodServerManditoryOptionsConfiguration
  constructor(configInput: PodServerConfiguration, relativeFilePath: string = './') {
    debug(`Running pod server with the configuration: ${JSON.stringify(configInput, null, 2)}`)
    this.config = applyPodServerConfigurationDefaults(configInput, relativeFilePath)
    this.app = new Koa()
    this.app.proxy = true
    // TODO: change key strategy
    this.app.keys = [ 'CHANGE_THIS' ]
    initializeRoutes(this.app, this.config)
  }

  listen() {
    this.app.listen(this.config.network.port, () => console.log(`Pod Server is listening on port ${this.config.network.port}`))
  }
}
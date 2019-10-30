import Debug from 'debug'
import express, { Router } from 'express'
import { PodServerConfiguration, StorageAdapter, PodServerInternalConfiguration } from "../types/configuration.types";
import applyPodServerConfigurationDefaults from './podServerConfigurations/applyPodServerConfigurationDefaults';
import routerFactory from './RouterFactory';

const debug = Debug('pod-server')

export default class PodServer {
  router: Router
  config: PodServerInternalConfiguration
  constructor(configInput: PodServerConfiguration, relativeFilePath: string = './') {
    debug(`Running pod server with the configuration: ${JSON.stringify(configInput, null, 2)}`)
    this.config = applyPodServerConfigurationDefaults(configInput, relativeFilePath)
    this.router = routerFactory(this.config)
  }

  getRouter() {
    return this.router
  }

  listen() {
    const app = express()
    app.use(this.router)
    app.listen(this.config.network.port, () => console.log(`Pod Server is listening on port ${this.config.network.port}`))
  }
}
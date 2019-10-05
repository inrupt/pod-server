import Debug from 'debug'
import express, { Router } from 'express'
import { IPSIDPInternalConfiguration, IPSIDPConfiguration  } from '../../types/configuration.types'
import applyIPSIDPConfigurationDefaults from './ipsIDPConfigurations/applyIPSIDPConfigurationDefaults';
import ipsIDPRouterFactory from './ipsIDProuterFactory';

const debug = Debug('ips-idp')

export default class IPSIDP {
  router: Router
  config: IPSIDPInternalConfiguration
  constructor(configInput: IPSIDPConfiguration, relativeFilePath: string = './') {
    debug(`Running ips idp with the configuration: ${JSON.stringify(configInput, null, 2)}`)
    this.config = applyIPSIDPConfigurationDefaults(configInput, relativeFilePath)
    this.router = ipsIDPRouterFactory(this.config)
  }

  getRouter() {
    return this.router
  }

  listen() {
    const app = express()
    app.use(this.router)
    if (!this.config.network) {
      throw new Error('IPS Identity Provider can not be started as a standalone application without a network configuration.')
    }
    const port = this.config.network.port
    app.listen(port, () => console.log(`IPS IDP is listening on port ${port}`))
  }
}
import {
  PodServerConfiguration,
  PodServerManditoryOptionsConfiguration,
  IdentityProviderConfiguration,
  IdentityProviderManditoryOptionsConfiguration,
  NetworkConfiguration,
  NetworkManditoryOptionsConfiguration
} from "../types/configuration.types";
import validateSchema from "../util/validateSchema";
import defaultConfiguration from "./defaultConfiguration";
import { applyStorageAdapterDefaults } from "./storageAdapters/applyStorageAdapterDefaults";
import applyHTMLRendererDefaults from "./htmlRenderers/applyHTMLRendererDefaults";

/*
 * Schemas
 */



export const newtworkConfigurationSchema = {
  title: 'Network Configuration',
  type: 'object',
  properties: {
    hostname: {
      type: 'string',
      format: 'hostname',
      default: defaultConfiguration.network.hostname
    },
    port: {
      type: 'integer',
      default: defaultConfiguration.network.port
    },
    protocol: {
      type: 'string',
      enum: [ 'http', 'https' ],
      default: defaultConfiguration.network.protocol
    },
    ssl: {
      type: 'object',
      properties: {
        cert: { type: 'string' },
        key: { type: 'string' }
      },
      default: defaultConfiguration.network.ssl
    }
  }
}

/*
 * Retrieve based on configs
 */

function applyNetworkConfigurationDefaults(networkConfig?: NetworkConfiguration): NetworkManditoryOptionsConfiguration {
  if (!networkConfig) {
    return applyNetworkConfigurationDefaults(defaultConfiguration.network)
  }
  validateSchema(newtworkConfigurationSchema, networkConfig)
  return {
    ...networkConfig,
    url: new URL(`${networkConfig.protocol}://${networkConfig.hostname}:${networkConfig.port}`)
  } as NetworkManditoryOptionsConfiguration
}

/*
 * Apply Configuration Defaults
 */

export function applyPodServerConfigurationDefaults(config: PodServerConfiguration, fileLocation: string): PodServerManditoryOptionsConfiguration {
  // Apply server network to identity provider if unavailable
  if (config.identityProvider && !config.identityProvider.network) {
    config.identityProvider.network = config.network
  }
  return {
    storage: applyStorageAdapterDefaults(config.storage),
    network: applyNetworkConfigurationDefaults(config.network),
    htmlRenderer: applyHTMLRendererDefaults(config.htmlRenderer),
    identityProvider: applyIdent(config.identityProvider)
  }
}

export function applyIdentityProviderConfigurationDefaults(config?: IdentityProviderConfiguration): IdentityProviderManditoryOptionsConfiguration {
  if (!config) {
    return applyIdentityProviderConfigurationDefaults(defaultConfiguration.identityProvider)
  }
  return {
    enabled: config.enabled == false ? false : true,
    storage: applyStorageAdapterDefaults(config.storage),
    network: applyNetworkConfigurationDefaults(config.network),
    keystore: config.keystore
  }
}
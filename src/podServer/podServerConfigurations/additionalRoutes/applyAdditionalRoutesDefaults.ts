import validateSchema from "../../../util/validateSchema";
import { Router } from 'express'
import defaultConfiguration from '../defaultConfiguration'
import { AdditionalRoutesConfiguration } from "../../../types/configuration.types";


const storageConfigurationMap: { [key: string]: (options?: any) => Router } = {

}

const storageConfigurationSchema = {
  title: 'Identity Provider Configuration',
  type: 'object',
  properties: {
    type: {
      type: 'string',
      default: 'ipsDefaultIDP'
    },
    options: {
      type: 'object',
      default: {}
    }
  }
}

export default function applyAdditionalRoutesDefaults(identityProviderConfig?: AdditionalRoutesConfiguration | Router): Router {
  // if (!identityProviderConfig) {
  //   return applyIdentityProviderDefaults(defaultConfiguration.identityProvider)
  // }
  // const potentialIdentityProvider: IdentityProvider = identityProviderConfig as IdentityProvider
  // if (potentialAdapter.get && potentialAdapter.set && potentialAdapter) {
  //   return potentialAdapter
  // }
  // if (validateSchema(storageConfigurationSchema, storageConfig)) {
  //   storageConfig = storageConfig as StorageConfiguration
  //   if (!storageConfigurationMap[storageConfig.type]) {
  //     throw new Error(`"${storageConfig.type}" is not a valid storage preset. Available presets: ${Object.keys(storageConfigurationMap).join(', ')}`)
  //   }
  //   return storageConfigurationMap[storageConfig.type](storageConfig.options)
  // }
  // throw new Error('Invalid Storage Configuration')
  return Router()
}
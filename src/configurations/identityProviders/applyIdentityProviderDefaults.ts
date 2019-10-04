import { StorageConfiguration, StorageAdapter, IdentityProviderConfiguration, IdentityProvider } from "../../types/configuration.types";
import validateSchema from "../../util/validateSchema";
import defaultConfiguration from '../defaultConfiguration'


const storageConfigurationMap: { [key: string]: (options?: any) => StorageAdapter } = {
  'ipsDefaultIDP':
  'disabledIDP':  
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

export function applyIdentityProviderDefaults(identityProviderConfig?: IdentityProviderConfiguration | IdentityProvider): IdentityProvider {
  if (!identityProviderConfig) {
    return applyIdentityProviderDefaults(defaultConfiguration.identityProvider)
  }
  const potentialIdentityProvider: IdentityProvider = identityProviderConfig as IdentityProvider
  if (potentialAdapter.get && potentialAdapter.set && potentialAdapter) {
    return potentialAdapter
  }
  if (validateSchema(storageConfigurationSchema, storageConfig)) {
    storageConfig = storageConfig as StorageConfiguration
    if (!storageConfigurationMap[storageConfig.type]) {
      throw new Error(`"${storageConfig.type}" is not a valid storage preset. Available presets: ${Object.keys(storageConfigurationMap).join(', ')}`)
    }
    return storageConfigurationMap[storageConfig.type](storageConfig.options)
  }
  throw new Error('Invalid Storage Configuration')
}
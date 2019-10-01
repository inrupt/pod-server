import { StorageConfiguration, StorageAdapter } from "../../types/configuration.types";
import validateSchema from "../../util/validateSchema";

import getFilesystemStorageAdapter from "./filesystem.storageAdapter";
import getInMemoryStorageAdapter from "./inMemory.storageAdapter";
import getRedisStorageAdapter from "./redis.storageAdapter";


const storageConfigurationMap: { [key: string]: (options?: any) => StorageAdapter } = {
  'filesystem': getFilesystemStorageAdapter,
  'redis': getRedisStorageAdapter,
  'inMemory': getInMemoryStorageAdapter
}

const storageConfigurationSchema = {
  title: 'Storage Configuration',
  type: 'object',
  properties: {
    type: {
      type: 'string',
      default: 'inMemory'
    },
    options: {
      type: 'object',
      default: {}
    }
  }
}

export function applyStorageAdapterDefaults(storageConfig?: StorageConfiguration | StorageAdapter): StorageAdapter {
  if (!storageConfig) {
    return getInMemoryStorageAdapter()
  }
  const potentialAdapter: StorageAdapter = storageConfig as StorageAdapter
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
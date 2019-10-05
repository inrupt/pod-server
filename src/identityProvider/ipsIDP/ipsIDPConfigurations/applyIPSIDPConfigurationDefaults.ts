import path from 'path'
import fs from 'mz/fs'
import { IPSIDPConfiguration, IPSIDPInternalConfiguration, JWKS } from "../../../types/configuration.types";
import defaultConfiguration from "../../../podServer/podServerConfigurations/defaultConfiguration";
import applyStorageAdapterDefaults from "../../../podServer/podServerConfigurations/storageAdapters/applyStorageAdapterDefaults";
import { applyNetworkConfigurationDefaults } from '../../../podServer/podServerConfigurations/applyPodServerConfigurationDefaults';

export function applyKeystoreConfigurationDefaults(keystoreConfig: string | JWKS, configFileLocation: string): JWKS {
  if (!keystoreConfig) {
    throw new Error('A keystore is required for the IPS Identity Provider. Generate a keystore by running "pod-server init-keystore"')
  }
  const potentialKeystore: JWKS = keystoreConfig as JWKS
  if (potentialKeystore.keys && Array.isArray(potentialKeystore.keys)) {
    return potentialKeystore
  }
  const keystorePath = path.join(configFileLocation, keystoreConfig as string)
  return JSON.parse((fs.readFileSync(keystorePath)).toString()) as JWKS
}

export default function applyIPSIDPConfigurationDefaults(config: IPSIDPConfiguration, configFileLocation: string): IPSIDPInternalConfiguration {
  return {
    keystore: applyKeystoreConfigurationDefaults(config.keystore, configFileLocation),
    issuer: config.issuer || defaultConfiguration.additionalRoutes.options.issuer,
    mailConfiguration: config.mailConfiguration,
    storage: applyStorageAdapterDefaults(config.storage),
    network: config.network ? applyNetworkConfigurationDefaults(config.network) : undefined
  }
}
import { PodServerConfiguration } from "../types/configuration.types";

const defaultConfiguration: PodServerConfiguration = {
  storage: {
    type: 'filesystem',
    options: {
      rootFolder: './data'
    }
  },
  network: {
    hostname: 'localhost',
    port: 8080,
    protocol: 'http' as 'http' | 'https',
    ssl: undefined
  },
  htmlRenderer: {
    type: 'mashlib'
  },
  identityProvider: {
    type: 'ipsDefaultIDP',
    options: {
      storage: {
        type: 'filesystem',
        options: {
          rootFolder: './db'
        }
      },
      keystore: "./sample-keystore.json",
      issuer: 'http://localhost:8080'
    }
  }
}

export default defaultConfiguration
import { PodServerConfiguration } from "../../types/configuration.types";

const defaultConfiguration = {
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
  additionalRoutes: {
    type: 'ipsIDP',
    options: {
      storage: {
        type: 'filesystem',
        options: {
          rootFolder: './db'
        }
      },
      keystore: "./keystore.json",
      issuer: 'http://localhost:8080'
    }
  }
}

export default defaultConfiguration
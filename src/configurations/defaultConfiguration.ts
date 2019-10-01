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
  identityProvider: {
    enabled: true,
    storage: {
      type: 'filesystem',
      options: {
        rootFolder: './db'
      }
    },
    keystore: "./sample-keystore.json"
  }
}

export default defaultConfiguration
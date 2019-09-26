import { expect } from 'chai'
import 'mocha'
import path from 'path'
import getFilesystemAccount from '../src/defaultConfiguration/storage/filesystem/filesystemAccount'
import { DefaultConfigurationConfigs, DefaultAccountAdapter } from '../src/defaultConfiguration/defaultConfiguration'

describe('Filesystem Account', () => {
  let filesystemAccount: DefaultAccountAdapter
  before(async () => {
    const config: DefaultConfigurationConfigs = {
      issuer: 'https://localhost:8443',
      pathPrefix: '',
      keystore: {},
      webIdFromUsername: async (username: string) => {
        return `https://${username}.localhost:8443/profile/card#me`
      },
      storagePreset: 'filesystem',
      storageData: {
        folder: path.join(__dirname, './data/filesystem')
      }
    }
    const AccountClass = await getFilesystemAccount(config)
    filesystemAccount = new AccountClass()
  })

  it('is compatible with NSS users', async () => {
    const account = await filesystemAccount.authenticate('alice', 'ABC123xyz*')
    expect((await account.claims()).sub).to.equal('https://alice.localhost:8443/profile/card#me')
  })
})

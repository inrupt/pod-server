import Provider, { ProviderConfiguration } from 'oidc-provider'
import cors from 'koa-cors'

export default class SolidIdp extends Provider {

  constructor (issuer: string, config: ProviderConfiguration) {
    super(issuer, {
      ...config,
      features: {
        ...config.features,

        registration: {
          enabled: true
        },
        request: {
          enabled: true
        },
        dPoP: {
          enabled: true
        }
      },
      whitelistedJWA: {
        requestObjectSigningAlgValues: ['none', 'HS256', 'RS256', 'PS256', 'ES256']
      },
      extraParams: ['key'],
      clientBasedCORS: async () => true,
      responseTypes: [
        'id_token token'
      ],
      scopes: [
        'openid',
        'offline_access',
        'profile'
      ]
    })
    this.use(cors())
  }

  // TODO Bring back CORS
  // TODO PoP Token
}

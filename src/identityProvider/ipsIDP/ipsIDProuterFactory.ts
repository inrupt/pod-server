import { IPSIDPInternalConfiguration } from "../../types/configuration.types";
import { Router } from "express";
import SolidIdp from "../solidIdentityProvider";

export default function ipsIDPRouterFactory(config: IPSIDPInternalConfiguration): Router {
  const oidc = new SolidIdp(config.issuer, {
    // TODO: refactor persistant storage
    // adapter: config.storage.sessionAdapter,
    // findAccount: DefaultConfigAccount.findById,
    jwks: config.keystore,
    claims: {
      openid: ['sub'],
      email: ['email', 'email_verified']
    },
    interactions: {
      url: async (ctx) => {
        return `/interaction/${ctx.oidc.uid}`
      }
    },
    formats: {
      AccessToken: 'jwt',
      // Manually setting default because default setting is disabled when running tests
      default: 'opaque'
    },
    features: {
      devInteractions: { enabled: false },
      dangerouslyEnableLocalhost: new URL(config.issuer).protocol !== 'https:'
    }
  })
  oidc.proxy = true

  const router = Router()
  

  return router
}
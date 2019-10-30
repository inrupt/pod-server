import { Router, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { PodServerInternalConfiguration } from '../types/configuration.types';


// TODO: this whole file will be changed once routing configuration is enabled. But for now, we hard code the subdomain routing strategy - Jackson

/**
 * Returns the router that will be served on the subdomain (eg. jackson.solid.community)
 * @param config: server config 
 */
function getSubdomainRouter(config: PodServerInternalConfiguration): Router {
  const router = Router()
  router.get('/', (req, res) => {
    console.log('Subdomain')
    res.send('subdomain')
  })
  return router
}

/**
 * Returns the router that will be served on the root domain (eg. solid.community)
 * @param config: server config 
 */
function getRootRouter(config: PodServerInternalConfiguration): Router {
  const router = Router()
  router.get('/', (req, res) => {
    console.log('root')
    res.send('root')
  })
  return router
}

// ASK RUBEN: Is it okay if factories are functions rather than classes? - Jackson
// TODO: Passing PodServerInternalConfiguration violates the Law of Demeter - Jackson
export default function RouterFactory(config: PodServerInternalConfiguration): Router {
  // TODO: Replace this hard coded subdomain structure
  const router = Router()
  router.use(cors())

  const subdomainRouter = getSubdomainRouter(config)
  const rootRouter = getRootRouter(config)

  router.use(async (req, res, next) => {
    if (req.get('host') !== config.network.url.host) {
      return subdomainRouter(req, res, next)
    }
    return rootRouter(req, res, next)
  })
  return router
}


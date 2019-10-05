import { IPSIDPInternalConfiguration } from "../../types/configuration.types";
import { Router } from "express";

export default function ipsIDPRouterFactory(config: IPSIDPInternalConfiguration): Router {
  const router = Router()
  router.get('/', (req, res) => {
    res.send('All good')
  })
  return router
}
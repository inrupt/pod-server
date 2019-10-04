import { Request, Response } from 'express'
import { HTMLRenderer } from "../../../types/configuration.types";

export default function getMashlibHTMLRenderer(options: {}): HTMLRenderer {
  return (req: Request, res: Response, graph: string) => {
    res.send(graph)
  }
}
import { HTMLRenderer } from "../../types/configuration.types";
import { Context } from "koa";

export default function getMashlibHTMLRenderer(options: {}): HTMLRenderer {
  return (ctx: Context, graph: string) => graph
}
import { HTMLRendererConfiguration, HTMLRenderer } from "../../types/configuration.types";
import defaultConfiguration from "../defaultConfiguration";
import validateSchema from "../../util/validateSchema";
import getMashlibHTMLRenderer from "./mashlib.htmlRenderer";

const htmlRendererConfigurationMap: { [key: string]: (options?: any) => HTMLRenderer } = {
  'mashlib': getMashlibHTMLRenderer
}

const htmlRendererConfigurationSchema = {
  title: 'Storage Configuration',
  type: 'object',
  properties: {
    type: {
      type: 'string',
      default: 'inMemory'
    },
    options: {
      type: 'object',
      default: {}
    }
  }
}

export default function applyHTMLRendererDefaults(htmlRendererConfig?: HTMLRendererConfiguration | HTMLRenderer): HTMLRenderer {
  if (!htmlRendererConfig) {
    return applyHTMLRendererDefaults(defaultConfiguration.htmlRenderer)
  }
  if (typeof htmlRendererConfig === 'function') {
    return htmlRendererConfig as HTMLRenderer
  }
  if (validateSchema(htmlRendererConfigurationSchema, htmlRendererConfig)) {
    htmlRendererConfig = htmlRendererConfig as HTMLRendererConfiguration
    if (!htmlRendererConfigurationMap[htmlRendererConfig.type]) {
      throw new Error(`"${htmlRendererConfig.type}" is not a valid html renderer preset. Available presets: ${Object.keys(htmlRendererConfigurationMap).join(', ')}`)
    }
    return htmlRendererConfigurationMap[htmlRendererConfig.type](htmlRendererConfig.options)
  }
  throw new Error('Invalide HTML Renderer Configuration')
}

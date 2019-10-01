import { Context } from "koa";

/**
 * ##############################################################
 * Configurations
 * ##############################################################
 */
export interface PodServerConfiguration {
  storage?: StorageConfiguration | StorageAdapter
  network?: NetworkConfiguration
  htmlRenderer?: HTMLRendererConfiguration | HTMLRenderer,
  identityProvider?: IdentityProviderConfiguration 
}

export interface PodServerManditoryOptionsConfiguration extends PodServerConfiguration {
  storage: StorageAdapter
  network: NetworkManditoryOptionsConfiguration
  htmlRenderer: HTMLRenderer
  identityProvider: IdentityProviderConfiguration 
}

export interface NetworkConfiguration {
  hostname?: string
  port?: number
  protocol?: 'http' | 'https'
  ssl?: {
    cert: string
    key: string
  }
}

export interface NetworkManditoryOptionsConfiguration extends NetworkConfiguration {
  hostname: string
  port: number
  protocol: 'http' | 'https'
  ssl?: {
    cert: string
    key: string
  }
}

/**
 * Storage Configuration
 */
export interface StorageConfiguration {
  type: string
  options?: {
    [key: string]: any
  }
}

export interface StorageAdapter {
  get(key: string): Promise<string>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * HTML Renderer Configuration
 */
export interface HTMLRendererConfiguration {
  type: string,
  options?: {
    [key: string]: any
  } 
}

export type HTMLRenderer = (ctx: Context, graph: string) => string

/**
 * Identity Provider Configuration
 */
export interface IdentityProviderConfiguration {
  enabled?: boolean
  storage?: StorageConfiguration | StorageAdapter
  keystore: string
}

export interface IdentityProviderManditoryOptionsConfiguration extends IdentityProviderConfiguration {
  enabled: boolean
  storage: StorageAdapter
  keystore: string
}
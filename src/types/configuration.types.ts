import { Router, Request, Response } from 'express'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import { JWKSet } from 'oidc-provider';

/*
 * ##############################################################
 * Pod-Server Configurations
 * ##############################################################
 */
export interface PodServerConfiguration {
  storage?: StorageConfiguration | StorageAdapter
  network?: NetworkConfiguration
  htmlRenderer?: HTMLRendererConfiguration | HTMLRenderer,
  additionalRoutes?: AdditionalRoutesConfiguration | Router
}

export interface PodServerInternalConfiguration extends PodServerConfiguration {
  storage: StorageAdapter
  network: NetworkInternalConfiguration
  htmlRenderer: HTMLRenderer
  additionalRoutes: Router
  relativeConfigFilepath: string
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

export interface NetworkInternalConfiguration extends NetworkConfiguration {
  url: URL
  hostname: string
  port: number
  protocol: 'http' | 'https'
  ssl?: {
    cert: string
    key: string
  }
}

/*
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

/*
 * HTML Renderer Configuration
 */
export interface HTMLRendererConfiguration {
  type: string,
  options?: {
    [key: string]: any
  } 
}

export type HTMLRenderer = (req: Request, res: Response, graph: string) => void

/*
 * Identity Provider Configuration
 */
export interface AdditionalRoutesConfiguration {
  type: string,
  options?: {
    [key: string]: any
  }
}

/*
 * ##############################################################
 * IPS IDP Configurations
 * ##############################################################
 */

export interface IPSIDPConfiguration {
  keystore: string | JWKSet
  issuer?: string
  mailConfiguration?: SMTPTransport.Options,
  storage: StorageConfiguration | StorageAdapter,
  network?: NetworkConfiguration
}

export interface IPSIDPInternalConfiguration extends IPSIDPConfiguration {
  keystore: JWKSet
  issuer: string
  mailConfiguration?: SMTPTransport.Options
  storage: StorageAdapter
  network?: NetworkInternalConfiguration
}

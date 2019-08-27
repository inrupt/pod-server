import { Context, Middleware } from "koa";
import { exists } from "fs";
import Router from "koa-router";
import { WacLdp } from "wac-ldp";
import { networkInterfaces } from "os";
import { maxHeaderSize } from "http";

{
  "storage": {
    "type": "filesystem",
    "rootFolder": "/home/jackson/pod-server/data"
  },
  "network": {
    "host": "api.swype.io",
    "port": 3000,
    "useHttps": true
  },
  "htmlRenderer": "mashlib",
  "allowProvisioningExternalIdentites": false,
  "routing": {
    "routingStrategy": "subdomain",
    "pathPrefix": ""
  },
  "allowExternalDomains": false,
  "identityProvider": {
    "enabled": true,
    "storage": {
      "type": "filesystem",
      "rootFolder": "/home/jackson/pod-server/.db"
    },
    "keystore": "/home/jackson/pod-server/sample-keystore.json",
    "email": {
      "host": "smtp.sendgrid.net",
      "port": "465",
      "secure": true,
      "auth": {
        "user": "inrupt",
        "pass": "V@ss@rStr33t"
      }
    }
  }
}






export interface IDPConfiguration {

}


// Should the value be "any" or "string / buffer" ie should the storage layer know what it's processing
export interface PodStorage {
  get(prefix: string, key: string): Promise<any>
  set(prefix: string, key: string, value: any): Promise<void>
  delete(prefix: string, key: string): Promise<void>
}

// Is there a need for this to be a separate interface?
export interface ResourceApi {
  rootUrl: string
  exists(path: string): Promise<boolean>
  get(path: string): Promise<string>
  set(path: string, value: string | Buffer): Promise<void>
  delete(path: string): Promise<void>
}

// Should this be a koa response object?
interface rawLDPResponse {
  body: string | Buffer,
  headers: {
    [key: string]: string
  }
  status: number
}

/**
 * ctx: the context object for the request
 * rawResponse: The raw response from the LDP before rendering and sending
 */
type contentRenderer = (ctx: Context, rawResponse: rawLDPResponse) => Promise<void>

export interface ProvisioningConfiguration {
  allowExternalProvisioning: boolean
  provisionRoute?: routeQualifier

}

type routerFactory = (handler: (ctx: Context, next: Function) => Promise<void>) => Promise<Router>

/**
 * The Pod configuration is for internal use within the PodServer repo
 * Essentially the PodOptions (listed later) will translate into a Pod Configuration
 */
export interface PodConfiguration {
  storage: PodStorage
  network: {
    port: number
    ssl?: {
      key: string
      cert: string
    }
  },
  // The developer sets up a very simple router that just calls a handler on the right route
  // The handler will manage calling WAC LDP and the content renderer after that
  ldpRouterFactory: routerFactory 
  contentRenderers: { // Could be html, ttl, json, json+ld, any possible content type, and/or default (for the catch all renderer)
    [contentType: string]: contentRenderer
  },
  // The root url of the admin pod upon startup, if this does not exist, it will automatically be provisioned
  adminPodRoot: string
  provisioningConfiguration: {

    canCreate(rootUrl: string, resourceApi: ResourceApi): Promise<void>
    provision(rootUrl: string, resourceApi: ResourceApi): Promise<void>
    delete(rootUrl: string, resourceApi: ResourceApi): Promise<void>
  }
}

/**
 * Pod Options defines the full range of options that can be passed into the server
 * This is how the developer interacts with the server object
 */
export interface PodOptions {
  // How this pod will store data
  storage: {
    // Choose between built in types and custom
    type: 'redis' | 'filesystem' | 'custom'
    // If custom is selected the develoepr can insert code
    customPodStorage?: PodStorage
    // If redis is selected the url of the box
    redisUrl?: string,
    // If filesystem is selected, the root folder for the filesystem
    rootFolder?: string
  },
  // Configuration for how the server will broadcast itself
  network: {
    // The port on which it will listen
    port: number,
    // ssl config if the server should handle its own https (instead of a proxy)
    ssl?: {
      // True if self hosting ssl is enabled
      enabled?: boolean
      // Path to the pem key
      key: string
      // Path to the pem cert
      cert: string
    }
  },
  // Routing strategy for that will resolve to the ldp
  ldpRouting: {
    // Select between different strategies "subdomain" to only route to the ldp on direct subdomains, "path" to distinguish between paths
    type: 'subdomain' | 'path' | 'custom',
    // If custom is selected the developer can insert code
    customRouterFactory?: routerFactory
    // The protocol the ldp should broadcast it is using
    protocol: 'http' | 'https'
    // An optional prefix to insert before the Pod roots in the url path (example "/pods")
    pathPrefix?: string
    // The host of the server
    rootHost?: string
    // If true, the router will pass any requests from origins that do not match its own to the ldp
    allowExternalOrigins?: boolean
  },
  // Define how data is rendered for different content types
  contentRenderers: {
    // The content type (example "html", "ttl"...)
    [contentType: string]: {
      // Select between default renderers or choose custom. Mashlib will return mashlib
      type: 'mashlib' | 'raw' | 'custom'
      // If custom is selected the developer can insert code
      customHtmlRenderer?: contentRenderer
    }
  }
  // Configuration for the location of the Admin pod. This pod will contain information important to the pod provider (like usage statistics) as well as information that users can access (lke quotas and purchase history)
  adminPod: {
    // The type of the admin pod. Local if it should be hosted on this pod or external if it should be elsewhere
    type: 'local' | 'external',
    // The webID of the admin Pod
    webID: string,
    // The root url of the admin pod
    podRoot: string,
    // For external pods. A client secret to log in with the client credentials flow
    clientSecret: string
  }
  // Configuration for limiting automatically managing Pods (These are less fully thought out)
  podManagement: {
    // Thype of management
    type: 'none' | 'hard-quota' | 'paid-tiers' | 'custom'
    quota: number
    paymentMethod: PaymentMethod
    email: EmailConfig
    tiers: ({
      minSize: number
      maxHeaderSize: number
      cost: number
    })[]
  }
  // Configuration to allow users with external identity providers to provision pods
  externalProvisioning?: {
    // Is external provisioning allowed
    enabled?: boolean
    // Routing strategy that will resolve to the external provisioning
    externalProvisioningRouting: {
      // Default or custom routing
      type: 'default' | 'custom'
      // If custom the developer can insert code here
      customRouterFactory?: routerFactory
      // An optional prefix to insert before each route
      pathPrefix: string
    }
    uiRenderers: {
      getProvision: Middleware
      postProvision: Middleware
    }
  }
  // 
  externalDomains?: {
    enabled?: boolean
    externalDomainRouting: {
      type: 'default' | 'custom'
      customRouterFactory?: routerFactory
      pathPrefix: string
    }
    uiRenderers: {
      getDomain: Middleware
      postDomain: Middleware
    }
    requireProofOfExternalDomain?: boolean
  }

}
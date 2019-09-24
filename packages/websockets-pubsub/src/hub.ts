import * as http from 'http'
import Debug from 'debug'
import { WacLdp, determineWebIdAndOrigin, ACL, BEARER_PARAM_NAME } from 'wac-ldp'

const debug = Debug('hub')

const BEARER_PREFIX = 'Bearer '
const SUBSCRIBE_COMMAND_PREFIX = 'sub '

interface Client {
  webSocket: any
  webIdPromise: Promise<URL>
  origin: string
  subscriptions: Array<URL>
}

function getOrigin (headers: http.IncomingHttpHeaders): string | undefined {
  if (Array.isArray(headers.origin)) {
    return headers.origin[0]
  }
  return headers.origin
}
function hasPrefix (longString: string, shortString: string) {
  const length = shortString.length
  if (longString.length < length) {
    return false
  }
  return (longString.substring(0, length) === shortString)
}

export class Hub {
  clients: Array<Client>
  wacLdp: WacLdp
  audience: string
  constructor (wacLdp: WacLdp, audience: string) {
    this.clients = []
    this.wacLdp = wacLdp
    this.audience = audience
  }
  async handleConnection (ws: any, upgradeRequest: http.IncomingMessage): Promise<void> {
    const newClient = {
      webSocket: ws,
      webIdPromise: this.getWebId(upgradeRequest),
      origin: getOrigin(upgradeRequest.headers),
      subscriptions: []
    } as Client
    ws.on('message', function incoming (message: string): void {
      debug('received: %s', message)
      if (message.substring(0, SUBSCRIBE_COMMAND_PREFIX.length) === SUBSCRIBE_COMMAND_PREFIX) {
        newClient.subscriptions.push(new URL(message.substring(SUBSCRIBE_COMMAND_PREFIX.length)))
        debug(`Client now subscribed to:`, newClient.subscriptions)
      }
    })
    this.clients.push(newClient)
    debug('client accepted')
  }

  async getWebIdFromAuthorizationHeader (headers: http.IncomingHttpHeaders, origin: string): Promise<URL | undefined> {
    let header
    if (Array.isArray(headers.authorization)) {
      header = headers.authorization[0]
    } else {
      header = headers.authorization
    }
    if (typeof header !== 'string') {
      return Promise.resolve(undefined)
    }
    if (header.length < BEARER_PREFIX.length) {
      return Promise.resolve(undefined)
    }
    const { webId } = await determineWebIdAndOrigin(header.substring(BEARER_PREFIX.length), origin)
    return webId
  }

  async getWebIdFromQueryParameter (url: URL, origin: string): Promise<URL | undefined> {
    const bearerToken = url.searchParams.get(BEARER_PARAM_NAME)

    if (typeof bearerToken !== 'string') {
      return Promise.resolve(undefined)
    }
    debug('determining WebId from query parameter', bearerToken, origin)
    const { webId } = await determineWebIdAndOrigin(bearerToken, origin)
    debug('webid is', webId)
    return webId
  }

  async getWebId (httpReq: http.IncomingMessage): Promise<URL | undefined> {
    let origin: string | undefined
    if (Array.isArray(httpReq.headers.origin)) {
      origin = httpReq.headers.origin[0]
    } else {
      origin = httpReq.headers.origin
    }

    debug('getting WebId from upgrade request')
    const fromAuthorizationHeader = await this.getWebIdFromAuthorizationHeader(httpReq.headers, origin || '')
    if (fromAuthorizationHeader) {
      debug('from authorization header')
      return fromAuthorizationHeader
    }
    if (httpReq.url) {
      debug('looking at url', httpReq.url, this.audience, new URL(httpReq.url, this.audience))
      return this.getWebIdFromQueryParameter(new URL(httpReq.url, this.audience), origin || '')
    }
  }

  publishChange (url: URL) {
    debug('publishChange', url)
    this.clients.map(async (client) => {
      debug('publishChange client', url, client.subscriptions)
      client.subscriptions.map(async (subscription) => {
        debug('hasPrefix', url.toString(), subscription.toString(), hasPrefix(url.toString(), subscription.toString()))
        const webId = await client.webIdPromise
        debug(webId.toString(), url.toString(), hasPrefix(url.toString(), subscription.toString()))
        if (!hasPrefix(url.toString(), subscription.toString())) {
          return
        }
        debug('calling this.wacLdp.hasAccess', url.toString())
        const hasAccess = await this.wacLdp.hasAccess(webId, client.origin, url, ACL.Read)
        debug('hasAccess', hasAccess)
        if (!hasAccess) {
          return
        }
        client.webSocket.send(`pub ${url.toString()}`)
      })
    })
  }
}

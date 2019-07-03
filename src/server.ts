import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs'
import Debug from 'debug'
import { BlobTree, WacLdp } from 'wac-ldp'
import * as WebSocket from 'ws'
import { Hub } from 'websockets-pubsub'
import Koa from 'koa'
import Router from 'koa-router'
import { archiveConfiguration } from 'solid-archive-idp'

const debug = Debug('server')

const DATA_BROWSER_HTML = fs.readFileSync('./static/index.html')
const LOGIN_HTML = fs.readFileSync('./static/popup.html')

interface HttpsConfig {
  key: Buffer
  cert: Buffer
}

interface OptionsObject {
  port: number
  aud: string
  httpsConfig?: HttpsConfig
  owner?: URL
  storage: BlobTree
}

export class Server {
  storage: BlobTree
  server: http.Server | undefined
  hub: Hub | undefined
  port: number
  wsServer: any
  app: Koa | undefined
  idpRouter: any
  aud: string
  wacLdp: WacLdp
  httpsConfig: HttpsConfig | undefined
  owner: URL | undefined
  constructor (options: OptionsObject) {
    this.port = options.port
    this.aud = options.aud
    this.httpsConfig = options.httpsConfig
    this.owner = options.owner
    this.storage = options.storage
    const skipWac = (options.owner === undefined)
    // FIXME: https://github.com/inrupt/wac-ldp/issues/87
    this.wacLdp = new WacLdp(this.storage, this.aud, new URL(`ws://localhost:${this.port}/`), true /* skipWac */)
  }
  provision () {
    if (this.owner) {
      return this.wacLdp.setRootAcl(this.owner)
    }
  }
  async listen () {
    debug('setting IDP issuer to', this.aud)
    this.idpRouter = await archiveConfiguration({
      issuer: this.aud,
      pathPrefix: '',
      screenNameExists: (screenName: string) => Promise.resolve(this.aud + '/profile/card#me'),
      onNewUser: (screenName: string, externalWebId?: string) => Promise.resolve(this.aud + '/profile/card#me'),
      keystore: {
        'keys': [
          {
            'alg': 'RS256',
            'kty': 'RSA',
            'kid': 'xeOjes9u3AcU4LBzcanEM7pZLwSlxaN7U62ZzOBDQuw',
            'e': 'AQAB',
            'n': 'oB2LgkiZZ5iLAz1d4ua7sVxdbzY2nIRkDtf4UE08mWsD6UYRzLR98_gMAfnKB8i9yPCQkxfA5w_SZq6Y7odG1qSwLHM2mb_O2GSvY9kaG00UpeeEJCR19c7Jkcmq3GXh4yujnm2TFQ6YAzYNgrXkHlusaFUApJaQN6zr4AvmR_vX_5i__Ku7nuU-GbaV75LSr8o0QANdYFF0ooz5DJvydPplF8mO9_oD7ceSNLWP1AXlFs5JH6MEhH02dELb4-zeLcVzhoqON60cABTpbYSf1lLbYZsVUQ3cYE9CxXaByY2YNuQgc0k29mSmUvwEs0hNA5xUcE3-y_qKpYKniErb9Q',
            'd': 'FmiMIcuvTIRY0DdCcIMCOaxHl0zrD7SnnDw1kGd-16nWfktEKnYIOqC4bX5b_ALoLLseQLfOU4gvVheRZ7CfBWM_FLl7JsFlXXuZ4Et-D9wVy7I_GB_SMniiVTj4JKhNmNF-sKl9MDE-rRRfh6-VIXqLAn8C_AXmYSReTpjbva8T-fq6vHgB9GmRqW4yRpFta3CA2uJpfnQBzIXNuBHFnk7C7e3omgplXHicuuT3GQnKZlhsREXN1BK7_WcK6OZERqnx-fOl42Sq2pNSSLaLu42vhmvvEXBbHUFkEOU4x0QmpdjhpynQS5yS30xJf9NI9DROTSncVbswjLiI_XPOgQ',
            'p': '7mtMx8m9zSzhWezMirL0neazpIw2lBYJStmCkyoT0rKAw0TJ1rx-sLh_Skn6BbTSNoJWZsiMC9AzUaER3LDBQda_LTYAiEtr3q3TeWjs2O7Q_QCGP2CGCpWrYddWKumv6ye2ZdgORlXAuOqO2GavqZJgpo9b9mTfqRq2pPKADfk',
            'q': 'q-wVzVmX5dZI8O5JLEMaBRbZtQIx0EyyN9Zy8itWgcfvYdU1WY8-KSZg67ZvkOBSScLx8y3V0wcc5kXD6W5PFKqVfwhfKABHimB8QAKPZCb-RBWDbvciNTi1CPJVNkLBtiiI9MWO6VSytOtokskOvHcA4mwMrIfxD_0XGU4YLN0',
            'dp': 'B9Uck5-sDZaA3Lxrx86zPJC8rBYzINBMg9n7cSw7tHtKwZ975gMRQmr9O4qMnS1gjovfnMbP2v9_ABqDhLWF08zjQO_6OoAHziv1u5JX3ZSS5wziXCimnqhmFfPGD-jXb6lBU70yUts0Vp7WDIPrF24IoNAq3EBaHKsU_vw8erk',
            'dq': 'ICtZ3QXhtWEGXwbHbF_V85PWAte5SHfBdU9MTOItGrW1pkHF7M8v23VR92k4sQw4eZLfwRgXhZg0ISZ2xSwd4gkVViLT42FCAbOSLEwOVrgxJb48zLuzi-_jeBwYM8IECzjEf8CjwCdYFSBjfevfNQazhKqhKHt7cPlzpAmH3oU',
            'qi': 'E3W6OfqeAzVCvylUpavcaBQhBRMEvnargBUSD8LT0smIldDm0SuTZ2fzueTfynd-9tvb9Ny_Tr9uSS-yWDHulnPfQL7LOdI1TWAXEy4278FJZwGCElSvjJafK_KS36sTw614YOV0UitWCd21aMWkKlJboh3kzEZEehFNAz2Iq-M',
            'key_ops': ['verify']
          }
        ]
      }
    })

    this.app = new Koa()
    this.app.proxy = true
    debug(this.idpRouter)
    this.app.use(this.idpRouter.routes())
    this.app.use(this.idpRouter.allowedMethods())

    // HACK: in order for the login page to show up, a separate file must be run at /.well-known/solid/login which I find very dirty -- jackson
    const loginRouter = new Router()
    loginRouter.get('/.well-known/solid/login', (ctx, next) => {
      ctx.res.writeHead(200, {})
      ctx.res.end(LOGIN_HTML)
      ctx.respond = false
    })
    this.app.use(loginRouter.routes())
    this.app.use(loginRouter.allowedMethods())
    // END HACK

    this.app.use(async (ctx, next) => {
      debug('yes!')
      debug(ctx.req.headers, ctx.req.headers['accept'] && ctx.req.headers['accept'].indexOf('text/html'))
      if ((ctx.req.headers['accept']) && (ctx.req.headers['accept'].indexOf('text/html') !== -1)) {
        ctx.res.writeHead(200, {})
        ctx.res.end(DATA_BROWSER_HTML)
        ctx.respond = false
      } else {
        debug('LDP handler', ctx.req.method, ctx.req.url)
        await this.wacLdp.handler(ctx.req, ctx.res)
        ctx.respond = false
      }
    })
    if (this.httpsConfig) {
      this.server = https.createServer(this.httpsConfig, this.app.callback())
    } else {
      this.server = http.createServer(this.app.callback())
    }
    this.server.listen(this.port)
    this.wsServer = new WebSocket.Server({
      server: this.server
    })
    this.hub = new Hub(this.wacLdp, this.aud)
    this.wsServer.on('connection', this.hub.handleConnection.bind(this.hub))
    this.wacLdp.on('change', (event: { url: URL }) => {
      if (this.hub) {
        this.hub.publishChange(event.url)
      }
    })
    debug('listening on port', this.port, (this.httpsConfig ? 'https' : 'http'))
  }
  close () {
    if (this.server) {
      this.server.close()
    }
    if (this.wsServer) {
      this.wsServer.close()
    }
    debug('closing port', this.port)
  }
}

import fs from 'fs'
import { Response, default as realFetch } from 'node-fetch'
import { URL } from 'url'
import Debug from 'debug'

const debug = Debug('fetch-mock')

const WEB_FIXTURES = './test/fixtures/web'

// We want to mock `fetch` but not `Response`,
// so passing that through as-is from the real node-fetch module:
export interface Response extends Response {}

export default function fetch (urlStr: string, options: any): Promise<Response> {
  debug('fetch', urlStr)
  const url = new URL(urlStr)
  const response = fs
  return new Promise((resolve, reject) => {
    debug('reading web fixture', `${WEB_FIXTURES}/${url.hostname}/${url.port || 443}${url.pathname}`)
    fs.readFile(`${WEB_FIXTURES}/${url.hostname}/${url.port || 443}${url.pathname}`, (err, data) => {
      if (err) {
        debug('error reading web fixture, falling back to real fetch', url)
        resolve(realFetch(urlStr, options))
      } else {
        debug('success reading web fixture', url)
        let streamed = false
        let endHandler: any = null
        resolve({
          json () {
            return JSON.parse(data.toString())
          },
          headers: {
            get (name: string) {
              if (name === 'content-type') {
                return 'text/turtle'
              }
            }
          },
          on (eventType: string, eventHandler: (buf: Buffer) => {}) {
            if (eventType === 'end') {
              endHandler = eventHandler
            }
            if (eventType === 'data') {
              eventHandler(data)
              streamed = true
            }
            if (streamed && endHandler) {
              endHandler()
            }
          }
        } as unknown as Response)
      }
    })
  })
}

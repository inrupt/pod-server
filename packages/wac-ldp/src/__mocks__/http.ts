import * as http from 'http'
export function createServer (handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
  const server = http.createServer(handler)
  return Object.assign(server, {
    listen: jest.fn(() => {
      //
    }),
    stop: jest.fn(() => {
      //
    })
  }) as http.Server
}

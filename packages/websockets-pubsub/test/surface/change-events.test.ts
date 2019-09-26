import { startServer, stopServer } from './helper'
import fetch from 'node-fetch'
import WebSocket from 'ws'
import fs from 'fs'
import MockDate from 'mockdate'

let wsClient: WebSocket
let received: Promise<string>

const bearerToken = fs.readFileSync('test/fixtures/bearerToken')

beforeEach(async () => {
  MockDate.set(1434319925275)
  startServer(8081)
  const options = await fetch('http://localhost:8081/asdf/test.txt', {
    method: 'HEAD',
    headers: {
      authorization: 'Bearer ' + bearerToken
    }
  })
  const updatesVia = options.headers.get('updates-via')
  if (!updatesVia) {
    throw new Error('No Updates-Via header found on HEAD')
  }
  wsClient = new WebSocket(updatesVia, undefined, { origin: 'https://pheyvaer.github.io' })
  received = new Promise((resolve) => {
    wsClient.on('message', function incoming (data) {
      resolve(data.toString())
    })
  })
  await new Promise((resolve) => {
    wsClient.on('open', function open () {
      wsClient.send('sub http://localhost:8081/asdf/')
      resolve(undefined)
    })
  })
})
afterEach(() => {
  MockDate.reset()
  wsClient.close()
  stopServer()
})

test('publishes a change event', async () => {
  await fetch('http://localhost:8081/asdf/test.txt', {
    method: 'PUT',
    body:  'hello',
    headers: {
      authorization: 'Bearer ' + bearerToken,
      'if-none-match': '*'
    }
  })
  const notif = await received
  expect(notif).toEqual('pub http://localhost:8081/asdf/test.txt')
})

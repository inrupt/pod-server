import { startServer, stopServer } from './helper'
import fetch from 'node-fetch'
import WebSocket from 'ws'

let wsClient: WebSocket
let received: Promise<string>

beforeEach(async () => {
  startServer(8080)
  wsClient = new WebSocket('ws://localhost:8080')
  received = new Promise((resolve) => {
    wsClient.on('message', function incoming (data) {
      resolve(data.toString())
    })
  })
  await new Promise((resolve) => {
    wsClient.on('open', function open () {
      wsClient.send('sub root/asdf/')
      resolve(undefined)
    })
  })
})
afterEach(() => {
  wsClient.close()
  stopServer()
})

test('publishes a change event', async () => {
  await fetch('http://localhost:8080/asdf/test.txt', {
    method: 'PUT',
    body:  'hello'
  })
  const notif = await received
  expect(notif).toEqual('pub root/asdf/test.txt')
})

import { getBearerToken } from '../../fixtures/bearerToken'
import { determineWebIdAndOrigin } from '../../../src/lib/api/authentication/determineWebIdAndOrigin'

import MockDate from 'mockdate'
beforeEach(() => {
  MockDate.set(1434319925275)
})
afterEach(() => {
  MockDate.reset()
})

test('correctly reads webId from bearer token', async () => {
  const { bearerToken, expectedWebId, aud } = getBearerToken(true)
  const { webId } = await determineWebIdAndOrigin(bearerToken, undefined)
  expect(webId).toEqual(expectedWebId)
})

test('returns undefined if bearer token is truncated', async () => {
  const { bearerToken, expectedWebId, aud } = getBearerToken(true)
  const { webId } = await determineWebIdAndOrigin(bearerToken.substring(0, 100), undefined)
  expect(webId).toEqual(undefined)
})

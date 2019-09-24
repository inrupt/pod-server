jest.mock('../../src/lib/core/WacLdp')
import { makeHandler } from '../unit/helpers/makeHandler'
import { closeServer } from '../../src/server'

test('server', () => {
  closeServer()
})

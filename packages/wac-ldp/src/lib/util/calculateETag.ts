import * as crypto from 'crypto'

export function calculateETag (text: string) {
  return crypto.createHash('md5').update(text).digest('base64')
}

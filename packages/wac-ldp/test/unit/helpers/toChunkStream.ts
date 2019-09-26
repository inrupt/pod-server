import convert from 'buffer-to-stream'

export function toChunkStream (str: string) {
  return convert(Buffer.from(str))
}

import convert from 'buffer-to-stream'

export function bufferToStream (buffer: Buffer): any {
  return convert(buffer)
}

export async function streamToBuffer (stream: any): Promise<Buffer> {
  const bufs: Array<Buffer> = []
  return new Promise(resolve => {
    stream.on('data', function (d: Buffer) {
      bufs.push(d)
    })
    stream.on('end', function () {
      resolve(Buffer.concat(bufs))
    })
  })
}

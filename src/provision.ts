import * as fs from 'fs'
import { WacLdp } from 'wac-ldp'

const PROFILE_TURTLE = fs.readFileSync('./templates/profile.ttl')

export async function provisionProfile (wacLdp: WacLdp, webId: URL, screenName: string) {
  const profileUrl = new URL(webId.pathname, webId.origin)
  const turtleDoc: string = PROFILE_TURTLE.toString()
      .replace('{{name}}}', screenName)
      .replace('{{webId}}', webId.toString())
  await wacLdp.createLocalDocument(profileUrl, 'text/turtle', turtleDoc)
}

export async function provisionStorage (wacLdp: WacLdp, storageRoot: URL, owner: URL) {
  // await wacLdp.createLocalDocument(new URL('.acl', storageRoot), 'text/turtle', rootAcl)
  // await wacLdp.createLocalDocument(new URL('/inbox/.acl', storageRoot), 'text/turtle', inboxAcl)
}

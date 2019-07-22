import * as fs from 'fs'
import Debug from 'debug'
import { WacLdp } from 'wac-ldp'
import Handlebars from 'handlebars'

const debug = Debug('provision')
const PROFILE_TURTLE = fs.readFileSync('./templates/profile.ttl')
const profileTurtleTemplate = Handlebars.compile(PROFILE_TURTLE.toString())

export async function provisionProfile (wacLdp: WacLdp, webId: URL, screenName: string) {
  const profileUrl = new URL(webId.pathname, webId.origin)
  debug('provisioning profile', screenName, webId.toString(), profileUrl.toString())
  const turtleDoc: string = profileTurtleTemplate({
    name: screenName,
    webId: webId.toString()
  })
  await wacLdp.createLocalDocument(profileUrl, 'text/turtle', turtleDoc)
}

export async function provisionStorage (wacLdp: WacLdp, storageRoot: URL, owner: URL) {
  let storageRootStr = storageRoot.toString()
  if (storageRootStr.substr(-1) !== '/') {
    storageRootStr += '/'
  }
  debug('provisioning storage', storageRoot.toString(), owner.toString())
  await wacLdp.setRootAcl(storageRoot, owner)
  await wacLdp.setPublicAcl(new URL(storageRootStr + 'inbox/'), owner, 'Append')
  await wacLdp.setPublicAcl(new URL(storageRootStr + 'public/'), owner, 'Read')
  await wacLdp.setPublicAcl(new URL(storageRootStr + 'profile/'), owner, 'Read')
}

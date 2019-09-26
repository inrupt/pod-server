import Debug from 'debug'
import { ACL, FOAF, RDF, VCARD } from '../rdf/rdf-constants'
import { StoreManager, urlToRdfNode, Quad, rdfNodeToUrl } from '../rdf/StoreManager'
import { urlToDocUrl } from './appIsTrustedForMode'

const debug = Debug('DetermineAllowedAgentsForModes')

// Given an ACL graph, find out which agents should get read, write, append, and/or control.
// If the ACL graph came from an adjacent ACL doc (so /foo.acl for /foo or /bar/.acl for /bar/),
// then the predicate we are looking for is `acl:accessTo`. If no adjacent ACL doc existed, and
// the ACL graph instead came from an ancestor container's ACL doc, then we are looking for
// `acl:default` instead.
// ACL rules are additive, and take the form:
// <#owner>
//   a acl:Authorization;
//   acl:agent <https://michielbdejong.inrupt.net/profile/card#me> ;
//   acl:accessTo </>;
//   acl:mode
//     acl:Read, acl:Write, acl:Control.
// There can also be acl:agentGroup, acl:agentClass foaf:Agent, and acl:agentClass acl:AuthenticatedAgent.
// The result is a list of strings for each of the four access modes, where each string can
// be a webid, or AGENT_CLASS_ANYBODY or AGENT_CLASS_ANYBODY_LOGGED_IN.

export const AGENT_CLASS_ANYBODY = FOAF.Agent
export const AGENT_CLASS_ANYBODY_LOGGED_IN = ACL.AuthenticatedAgent

export interface ModesCheckTask {
  aclGraph: any
  targetUrl: URL
  contextUrl: URL
  resourceIsTarget: boolean
  storeManager: StoreManager
}

export interface AccessModes {
  'http://www.w3.org/ns/auth/acl#Read': Array<string>
  'http://www.w3.org/ns/auth/acl#Write': Array<string>
  'http://www.w3.org/ns/auth/acl#Append': Array<string>
  'http://www.w3.org/ns/auth/acl#Control': Array<string>
}

async function fetchGroupMembers (groupUri: URL, storeManager: StoreManager): Promise<Array<URL>> {
  debug('fetchGroupMembers', groupUri.toString())
  const groupUriNode = urlToRdfNode(groupUri)
  const groupUriDoc = urlToDocUrl(groupUri)
  const groupUriDocNode = urlToRdfNode(groupUriDoc)
  // await storeManager.load(groupUri)
  const memberStatements = await storeManager.statementsMatching({
    subject: groupUriNode,
    predicate: urlToRdfNode(VCARD.hasMember),
    why: groupUriDocNode
  })
  debug(memberStatements)
  return memberStatements.map((quad: Quad) => {
    return rdfNodeToUrl(quad.object)
  })
}

function stripTrailingSlash (str: string) {
  if (str.substr(-1) === '/') {
    return str.substring(0, str.length - 1)
  }
  return str
}
function urlsEquivalent (grantUrl: URL, targetURL: URL): boolean {
  debug('urlsEquivalent', grantUrl.toString(), targetURL.toString())

  return (stripTrailingSlash(grantUrl.toString()) === stripTrailingSlash(targetURL.toString()))
}

export async function determineAllowedAgentsForModes (task: ModesCheckTask): Promise<AccessModes> {
  const accessPredicate: string = (task.resourceIsTarget ? ACL.accessTo.toString() : ACL.default.toString())
  // debug('task', task)
  debug('accessPredicate', accessPredicate)
  const isAuthorization: { [subject: string]: boolean } = {}
  const aboutAgents: { [subject: string]: { [agentId: string]: boolean} | undefined } = {}
  const aboutThisResource: { [subject: string]: boolean } = {}
  const aboutMode: { [mode: string]: { [subject: string]: boolean} | undefined } = {
    [ACL.Read.toString()]: {},
    [ACL.Write.toString()]: {},
    [ACL.Append.toString()]: {},
    [ACL.Control.toString()]: {}
  }

  function addAgents (subject: string, agents: Array<URL>) {
    if (typeof aboutAgents[subject] === 'undefined') {
      aboutAgents[subject] = {}
    }
    agents.map(agent => {
      (aboutAgents[subject] as { [agent: string]: boolean })[agent.toString()] = true
    })
  }

  // pass 1, sort all quads according to what they state about a subject
  await Promise.all(task.aclGraph.map(async (quad: any): Promise<void> => {
    switch (quad.predicate.value) {
      case ACL.mode.toString():
        if (typeof aboutMode[quad.object.value] === 'object') {
          debug('using quad for mode', quad.subject.value, quad.predicate.value, quad.object.value)
          ;(aboutMode[quad.object.value] as { [agent: string]: boolean })[quad.subject.value] = true
        } else {
          debug('invalid mode!', quad.object.value)
        }
        break
      case RDF.type.toString():
        if (quad.object.value === ACL.Authorization.toString()) {
          debug('using quad for type', quad.subject.value, quad.predicate.value, quad.object.value)
          isAuthorization[quad.subject.value] = true
        } else {
          debug('invalid type!', quad.object.value)
        }
        break
      case ACL.agent.toString():
        debug('using quad for agent', quad.subject.value, quad.predicate.value, quad.object.value)
        addAgents(quad.subject.value, [quad.object.value])
        break
      case ACL.agentGroup.toString():
        debug('using quad for agentGroup', quad.subject.value, quad.predicate.value, quad.object.value)
        let groupMembers: Array<URL> = []
        try {
          groupMembers = await fetchGroupMembers(new URL(quad.object.value, task.contextUrl), task.storeManager)
        } catch (err) {
          debug('could not fetch group members', err)
        }
        debug('group members', groupMembers.map((url: URL): string => url.toString()))
        addAgents(quad.subject.value, groupMembers)
        break
      case ACL.agentClass.toString():
        debug('using quad for agentClass', quad.subject.value, quad.predicate.value, quad.object.value)
        if ([AGENT_CLASS_ANYBODY.toString(), AGENT_CLASS_ANYBODY_LOGGED_IN.toString()].indexOf(quad.object.value) !== -1) {
          debug('using quad for agentClass', quad.subject.value, quad.predicate.value, quad.object.value)
          addAgents(quad.subject.value, [quad.object.value])
        } else {
          debug('rejecting quad for agentClass', quad.subject.value, quad.predicate.value, quad.object.value)
        }
        break
      case accessPredicate:
      case accessPredicate + 'ForNew': // See https://github.com/inrupt/wac-ldp/issues/154
        // Three cases: adjacent (doc), adjacent (container), non-adjacent (parent):
        // * resource https://example.com/c1/c2/c3/doc
        //  * target https://example.com/c1/c2/c3/doc, acl doc https://example.com/c1/c2/c3/doc.acl (adjacent, doc)
        //  * target https://example.com/c1/c2/c3/, acl doc https://example.com/c1/c2/c3/.acl (non-adjacent, parent)
        //  * target https://example.com/c1/c2/, acl doc https://example.com/c1/c2/.acl  (non-adjacent, parent)
        //  * target https://example.com/c1/ acl doc https://example.com/c1/.acl (non-adjacent, parent)
        //  * target https://example.com/, acl doc https://example.com/.acl (non-adjacent, parent)
        // * resource https://example.com/c1/c2/c3/c4/ (non-adjacent, parent)
        //  * target https://example.com/c1/c2/c3/c4/, acl doc https://example.com/c1/c2/c3/c4/.acl (adjacent, container)
        //  * target https://example.com/c1/c2/c3/, acl doc https://example.com/c1/c2/c3/.acl (non-adjacent, parent)
        //  * target https://example.com/c1/c2/, acl doc https://example.com/c1/c2/.acl (non-adjacent, parent)
        //  * target https://example.com/c1/ acl doc https://example.com/c1/.acl (non-adjacent, parent)
        //  * target https://example.com/, acl doc https://example.com/.acl (non-adjacent, parent)

        const valueUrl = new URL(quad.object.value, task.contextUrl)
        if (urlsEquivalent(task.targetUrl, valueUrl)) {
          debug('using quad for path', quad.subject.value, quad.predicate.value, quad.object.value)
          aboutThisResource[quad.subject.value] = true
        } else {
          debug('rejecting quad for path', quad.subject.value, quad.predicate.value, quad.object.value)
        }
        break
      default:
        debug('rejecting quad', quad.subject.value, quad.predicate.value, quad.object.value)
    }
  }))

  debug(isAuthorization, aboutAgents, aboutThisResource, aboutMode)
  // pass 2, find the subjects for which all boxes are checked, and add up modes from them
  function determineModeAgentStrings (mode: URL): Array<string> {
    debug('determineModeAgents A', mode.toString())
    let anybody = false
    let anybodyLoggedIn = false
    const agentsMap: { [agent: string]: boolean } = {}
    for (const subject in aboutMode[mode.toString()]) {
      debug('determineModeAgents B', mode.toString(), subject, isAuthorization[subject], aboutThisResource[subject])
      if ((isAuthorization[subject]) && (aboutThisResource[subject])) {
        debug('determineModeAgents C', mode.toString(), subject)
        Object.keys(aboutAgents[subject] as any).map((agentIdStr: string) => {
          if (anybody) {
            debug('determineModeAgents D', mode.toString(), subject)
            return
          }
          debug('determineModeAgents E', mode.toString(), subject)
          if (agentIdStr === AGENT_CLASS_ANYBODY.toString()) {
            debug(mode.toString(), 'considering agentId', agentIdStr, 'case 1')
            anybody = true
          } else if (agentIdStr === AGENT_CLASS_ANYBODY_LOGGED_IN.toString()) {
            debug(mode.toString(), 'considering agentId', agentIdStr, 'case 2')
            anybodyLoggedIn = true
          } else {
            debug(mode.toString(), 'considering agentId', agentIdStr, 'case 3')
            agentsMap[agentIdStr] = true
          }
        })
      }
    }
    if (anybody) {
      debug(mode.toString(), 'anybody')
      return [ AGENT_CLASS_ANYBODY.toString() ]
    }
    if (anybodyLoggedIn) {
      debug(mode.toString(), 'anybody logged in')
      return [ AGENT_CLASS_ANYBODY_LOGGED_IN.toString() ]
    }
    debug(mode.toString(), 'specific webIds', Object.keys(agentsMap))
    return Object.keys(agentsMap)
  }
  return {
    'http://www.w3.org/ns/auth/acl#Read': determineModeAgentStrings(ACL.Read),
    'http://www.w3.org/ns/auth/acl#Write': determineModeAgentStrings(ACL.Write),
    'http://www.w3.org/ns/auth/acl#Append': determineModeAgentStrings(ACL.Append),
    'http://www.w3.org/ns/auth/acl#Control': determineModeAgentStrings(ACL.Control)
  }
}

import { Node } from './Node'

export interface Member {
  name: string
  isContainer: boolean
}

export interface Container extends Node {
  getMembers (): Promise<Array<Member>>
}

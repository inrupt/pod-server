import { Node } from './Node'

export interface Blob extends Node {
  getData (): Promise<ReadableStream | undefined> // getData should resolve with undefined if the blob does not exist
  setData (data: ReadableStream): Promise<void>
}

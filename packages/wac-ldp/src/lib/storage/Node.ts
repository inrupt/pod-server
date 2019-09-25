export interface Node {
  /**
   * It's always possible to instantiate a Node object for a Path,
   * even if there is no Blob and not Container at that path.
   * In that case, Node#exists will return false.
   */
  exists (): Promise<boolean>
  delete (): Promise<void>
}

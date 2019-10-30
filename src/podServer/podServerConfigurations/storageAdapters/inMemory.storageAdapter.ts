import { StorageAdapter } from "../../../types/configuration.types";

const map: { [key: string]: string } = {}

export default function getInMemoryStorageAdapter(options?: {}): StorageAdapter {
  // TODO Complete - Jackson
  return {
    async get(key: string) {
      return map[key]
    },
    async set(key: string, value: string) {
      map[key] = value
    },
    async delete(key: string) {
      delete map[key]
    }
  }
}

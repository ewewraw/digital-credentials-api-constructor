
// Use globalThis to persist storage across module re-evaluations in Next.js dev mode
const globalForParStorage = globalThis as unknown as {
  parStorage: Map<string, string> | undefined
}

if (!globalForParStorage.parStorage) {
  globalForParStorage.parStorage = new Map<string, string>();
}

export const parStorage = globalForParStorage.parStorage;

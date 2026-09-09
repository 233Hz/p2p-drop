import { openDB, type IDBPDatabase } from 'idb'
import type { FileMeta } from '@/types/transfer'

const DB_NAME = 'p2p-drop-storage'
const STORE_NAME = 'chunks'

interface ChunkRecord {
  key: string // `${transferId}_${fileIndex}_${chunkIndex}`
  transferId: string
  fileIndex: number
  chunkIndex: number
  data: ArrayBuffer
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
          store.createIndex('transfer_file', ['transferId', 'fileIndex'])
        }
      },
    })
  }
  return dbPromise
}

export interface FileReceiverWriter {
  writeChunk(chunkIndex: number, data: ArrayBuffer): Promise<void>
  finish(): Promise<Blob | void>
  abort(): Promise<void>
}

/**
 * Creates an appropriate writer strategy based on browser capability and file size
 */
export async function createFileReceiver(
  file: FileMeta,
  transferId: string,
  fileIndex: number,
  preferFSA: boolean = false
): Promise<FileReceiverWriter> {
  // Strategy 1: Native File System Access API
  if (preferFSA && typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: file.name,
      })
      const writable = await handle.createWritable()
      return {
        async writeChunk(_index: number, data: ArrayBuffer) {
          await writable.write(data)
        },
        async finish() {
          await writable.close()
        },
        async abort() {
          try {
            await writable.abort()
          } catch {
            // ignore
          }
        },
      }
    } catch (err: any) {
      // User cancelled picker or error; fallback to memory/IDB
      console.warn('File System Access cancelled or unsupported, fallback to memory/IDB', err)
    }
  }

  // Strategy 2: IndexedDB for large files (> 200MB) without FSA
  if (file.size > 200 * 1024 * 1024) {
    const db = await getDB()
    return {
      async writeChunk(chunkIndex: number, data: ArrayBuffer) {
        const key = `${transferId}_${fileIndex}_${chunkIndex}`
        await db.put(STORE_NAME, {
          key,
          transferId,
          fileIndex,
          chunkIndex,
          data,
        })
      },
      async finish() {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const index = tx.store.index('transfer_file')
        const records: ChunkRecord[] = await index.getAll([transferId, fileIndex])
        records.sort((a, b) => a.chunkIndex - b.chunkIndex)

        const blobParts = records.map((r) => r.data)
        const blob = new Blob(blobParts, { type: file.type || 'application/octet-stream' })
        try {
          triggerDownload(blob, file.name)
        } catch (err) {
          console.warn('Auto download failed:', err)
        }

        // Cleanup
        try {
          const delTx = db.transaction(STORE_NAME, 'readwrite')
          const keys = records.map((r) => r.key)
          for (const k of keys) {
            await delTx.store.delete(k)
          }
          await delTx.done
        } catch {}

        return blob
      },
      async abort() {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const index = tx.store.index('transfer_file')
        const records = await index.getAllKeys([transferId, fileIndex])
        for (const k of records) {
          await tx.store.delete(k)
        }
        await tx.done
      },
    }
  }

  // Strategy 3: Memory Blob Accumulator (< 200MB)
  const memoryChunks: ArrayBuffer[] = []
  return {
    async writeChunk(chunkIndex: number, data: ArrayBuffer) {
      memoryChunks[chunkIndex] = data
    },
    async finish() {
      const validChunks = memoryChunks.filter(Boolean)
      const blob = new Blob(validChunks, { type: file.type || 'application/octet-stream' })
      try {
        triggerDownload(blob, file.name)
      } catch (err) {
        console.warn('Auto download failed:', err)
      }
      return blob
    },
    async abort() {
      memoryChunks.length = 0
    },
  }
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    try {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {}
  }, 30000)
}

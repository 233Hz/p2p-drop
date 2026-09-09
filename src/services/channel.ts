import type { FileMeta, ControlPacket, TextItem, SignalMessage } from '@/types/transfer'
import { createFileReceiver, type FileReceiverWriter } from './storage'

export const CHUNK_SIZE = 32 * 1024 // 32 KB per chunk
export const BUFFERED_AMOUNT_HIGH_THRESHOLD = 1024 * 1024 // 1 MB
export const BUFFERED_AMOUNT_LOW_THRESHOLD = 256 * 1024 // 256 KB

export interface ChannelEvents {
  onProgress: (bytesDelta: number, currentFileIndex: number, currentChunkIndex: number) => void
  onFileStart: (fileIndex: number, file: FileMeta) => void
  onFileComplete: (fileIndex: number, file: FileMeta, blob?: Blob) => void
  onAllCompleted: () => void
  onError: (error: any) => void
  onCancel: () => void
  onTextReceived: (item: TextItem) => void
}

export class TransferChannel {
  private controlDc: RTCDataChannel
  private dataDc: RTCDataChannel
  private isCancelled: boolean = false
  private currentWriter: FileReceiverWriter | null = null
  private writerPromise: Promise<FileReceiverWriter> | null = null
  private writeQueue: Promise<void> = Promise.resolve()
  private events: Partial<ChannelEvents> = {}

  constructor(controlDc: RTCDataChannel, dataDc: RTCDataChannel, events: Partial<ChannelEvents> = {}) {
    this.controlDc = controlDc
    this.dataDc = dataDc
    this.events = events

    this.setupChannels()
  }

  private setupChannels() {
    this.controlDc.onmessage = (event) => {
      try {
        const packet: ControlPacket = JSON.parse(event.data)
        this.handleControlPacket(packet)
      } catch (err) {
        console.error('Error parsing control message', err)
      }
    }

    this.dataDc.binaryType = 'arraybuffer'
    this.dataDc.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD

    this.dataDc.onmessage = (event) => {
      if (typeof event.data === 'string') return
      const arrayBuffer = event.data as ArrayBuffer
      if (arrayBuffer.byteLength < 8) return

      const view = new DataView(arrayBuffer)
      const fileIndex = view.getUint32(0)
      const chunkIndex = view.getUint32(4)
      const payload = arrayBuffer.slice(8)

      this.writeQueue = this.writeQueue
        .then(async () => {
          if (this.isCancelled) return
          if (!this.currentWriter && this.writerPromise) {
            this.currentWriter = await this.writerPromise
          }
          if (this.currentWriter) {
            await this.currentWriter.writeChunk(chunkIndex, payload)
            this.events.onProgress?.(payload.byteLength, fileIndex, chunkIndex)
          }
        })
        .catch((err) => {
          console.error('Error writing chunk in dataDc:', err)
        })
    }
  }

  private handleControlPacket(packet: ControlPacket) {
    switch (packet.type) {
      case 'file-start': {
        const { fileIndex, file, transferId } = packet.payload
        this.events.onFileStart?.(fileIndex, file)
        this.writerPromise = createFileReceiver(file, transferId, fileIndex)
        this.writeQueue = this.writeQueue
          .then(async () => {
            if (this.isCancelled) return
            this.currentWriter = await this.writerPromise
          })
          .catch((err) => {
            console.error('Failed to initialize file writer:', err)
            this.events.onError?.(err)
          })
        break
      }
      case 'file-end': {
        const { fileIndex, file } = packet.payload
        this.writeQueue = this.writeQueue
          .then(async () => {
            if (this.isCancelled) return
            if (!this.currentWriter && this.writerPromise) {
              this.currentWriter = await this.writerPromise
            }
            let blob: Blob | undefined
            if (this.currentWriter) {
              blob = (await this.currentWriter.finish()) || undefined
              this.currentWriter = null
            }
            this.writerPromise = null
            this.events.onFileComplete?.(fileIndex, file, blob)
            // Send ACK back
            this.sendControl({ type: 'file-ack', payload: { fileIndex } })
          })
          .catch((err) => {
            console.error('Error finishing file in data channel:', err)
            this.events.onError?.(err)
          })
        break
      }
      case 'all-completed': {
        this.writeQueue = this.writeQueue
          .then(async () => {
            if (this.isCancelled) return
            this.events.onAllCompleted?.()
          })
          .catch((err) => {
            console.error('Error completing all files:', err)
          })
        break
      }
      case 'cancel': {
        this.isCancelled = true
        this.writeQueue = Promise.resolve()
        if (this.currentWriter) {
          this.currentWriter.abort().catch(() => {})
          this.currentWriter = null
        }
        this.writerPromise = null
        this.events.onCancel?.()
        break
      }
      case 'text': {
        this.events.onTextReceived?.(packet.payload)
        break
      }
    }
  }

  public sendControl(packet: ControlPacket) {
    if (this.controlDc.readyState === 'open') {
      this.controlDc.send(JSON.stringify(packet))
    }
  }

  public async sendFiles(files: File[], fileMetas: FileMeta[], transferId: string) {
    this.isCancelled = false

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      if (this.isCancelled) break

      const file = files[fileIndex]
      const meta = fileMetas[fileIndex]

      this.events.onFileStart?.(fileIndex, meta)

      // 1. Notify receiver about file start
      this.sendControl({
        type: 'file-start',
        payload: { fileIndex, file: meta, transferId },
      })

      // Small tick to ensure receiver initialized storage
      await new Promise((resolve) => setTimeout(resolve, 60))

      // 2. Stream chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
      let offset = 0

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (this.isCancelled) {
          this.sendControl({ type: 'cancel', payload: { reason: 'user_cancelled' } })
          return
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE)
        const chunkBuffer = await slice.arrayBuffer()

        // Pack frame: [4 bytes fileIndex, 4 bytes chunkIndex, payload]
        const frame = new Uint8Array(8 + chunkBuffer.byteLength)
        const view = new DataView(frame.buffer)
        view.setUint32(0, fileIndex)
        view.setUint32(4, chunkIndex)
        frame.set(new Uint8Array(chunkBuffer), 8)

        // Flow control: Backpressure check
        if (this.dataDc.bufferedAmount > BUFFERED_AMOUNT_HIGH_THRESHOLD) {
          await this.waitForBufferDrain()
        }

        if (this.dataDc.readyState !== 'open') {
          throw new Error('DataChannel closed unexpectedly')
        }

        this.dataDc.send(frame.buffer)
        this.events.onProgress?.(chunkBuffer.byteLength, fileIndex, chunkIndex)

        offset += CHUNK_SIZE
      }

      // 3. Notify receiver about file end
      this.sendControl({
        type: 'file-end',
        payload: { fileIndex, file: meta },
      })

      this.events.onFileComplete?.(fileIndex, meta)
      // Allow buffer to settle between files
      await new Promise((resolve) => setTimeout(resolve, 80))
    }

    if (!this.isCancelled) {
      this.sendControl({
        type: 'all-completed',
        payload: {},
      })
      this.events.onAllCompleted?.()
    }
  }

  public sendText(item: TextItem) {
    this.sendControl({
      type: 'text',
      payload: item,
    })
  }

  public cancel() {
    this.isCancelled = true
    this.sendControl({ type: 'cancel', payload: { reason: 'user_cancelled' } })
    if (this.currentWriter) {
      this.currentWriter.abort().catch(() => {})
      this.currentWriter = null
    }
  }

  private waitForBufferDrain(): Promise<void> {
    return new Promise((resolve) => {
      const onLow = () => {
        this.dataDc.removeEventListener('bufferedamountlow', onLow)
        resolve()
      }
      this.dataDc.addEventListener('bufferedamountlow', onLow)
      // Safety timeout in case event is missed
      setTimeout(() => {
        this.dataDc.removeEventListener('bufferedamountlow', onLow)
        resolve()
      }, 500)
    })
  }

  public close() {
    try {
      this.controlDc.close()
    } catch {}
    try {
      this.dataDc.close()
    } catch {}
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export class RelayChannel {
  private selfPeerId: string
  private targetPeerId: string
  private sendSignal: (signal: SignalMessage) => void
  private isCancelled: boolean = false
  private currentWriter: FileReceiverWriter | null = null
  private writerPromise: Promise<FileReceiverWriter> | null = null
  private writeQueue: Promise<void> = Promise.resolve()
  private events: Partial<ChannelEvents> = {}

  constructor(
    selfPeerId: string,
    targetPeerId: string,
    sendSignal: (signal: SignalMessage) => void,
    events: Partial<ChannelEvents> = {}
  ) {
    this.selfPeerId = selfPeerId
    this.targetPeerId = targetPeerId
    this.sendSignal = sendSignal
    this.events = events
  }

  public handleControlPacket(packet: ControlPacket) {
    switch (packet.type) {
      case 'file-start': {
        const { fileIndex, file, transferId } = packet.payload
        this.events.onFileStart?.(fileIndex, file)
        this.writerPromise = createFileReceiver(file, transferId, fileIndex)
        this.writeQueue = this.writeQueue
          .then(async () => {
            if (this.isCancelled) return
            this.currentWriter = await this.writerPromise
          })
          .catch((err) => {
            console.error('Failed to initialize file writer in relay:', err)
            this.events.onError?.(err)
          })
        break
      }
      case 'file-end': {
        const { fileIndex, file } = packet.payload
        this.writeQueue = this.writeQueue
          .then(async () => {
            if (this.isCancelled) return
            if (!this.currentWriter && this.writerPromise) {
              this.currentWriter = await this.writerPromise
            }
            let blob: Blob | undefined
            if (this.currentWriter) {
              blob = (await this.currentWriter.finish()) || undefined
              this.currentWriter = null
            }
            this.writerPromise = null
            this.events.onFileComplete?.(fileIndex, file, blob)
          })
          .catch((err) => {
            console.error('Error finishing file in relay channel:', err)
            this.events.onError?.(err)
          })
        break
      }
      case 'all-completed': {
        this.writeQueue = this.writeQueue
          .then(async () => {
            if (this.isCancelled) return
            this.events.onAllCompleted?.()
          })
          .catch((err) => {
            console.error('Error completing all files in relay:', err)
          })
        break
      }
      case 'cancel': {
        this.isCancelled = true
        this.writeQueue = Promise.resolve()
        if (this.currentWriter) {
          this.currentWriter.abort().catch(() => {})
          this.currentWriter = null
        }
        this.writerPromise = null
        this.events.onCancel?.()
        break
      }
      case 'text': {
        this.events.onTextReceived?.(packet.payload)
        break
      }
    }
  }

  public handleChunk(fileIndex: number, chunkIndex: number, base64Data: string) {
    this.writeQueue = this.writeQueue
      .then(async () => {
        if (this.isCancelled) return
        const payload = base64ToArrayBuffer(base64Data)
        if (!this.currentWriter && this.writerPromise) {
          this.currentWriter = await this.writerPromise
        }
        if (this.currentWriter) {
          await this.currentWriter.writeChunk(chunkIndex, payload)
          this.events.onProgress?.(payload.byteLength, fileIndex, chunkIndex)
        }
      })
      .catch((err) => {
        console.error('Error writing chunk in relay channel:', err)
      })
  }

  public async sendFiles(files: File[], fileMetas: FileMeta[], transferId: string) {
    this.isCancelled = false

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      if (this.isCancelled) break

      const file = files[fileIndex]
      const meta = fileMetas[fileIndex]
      this.events.onFileStart?.(fileIndex, meta)

      // 1. Notify receiver about file start
      this.sendSignal({
        from: this.selfPeerId,
        to: this.targetPeerId,
        type: 'relay-control',
        payload: {
          type: 'file-start',
          payload: { fileIndex, file: meta, transferId },
        },
      })

      // Small tick to ensure receiver is ready
      await new Promise((resolve) => setTimeout(resolve, 80))

      // 2. Stream chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
      let offset = 0

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (this.isCancelled) {
          this.sendSignal({
            from: this.selfPeerId,
            to: this.targetPeerId,
            type: 'relay-control',
            payload: { type: 'cancel', payload: { reason: 'user_cancelled' } },
          })
          return
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE)
        const chunkBuffer = await slice.arrayBuffer()
        const b64Data = arrayBufferToBase64(chunkBuffer)

        this.sendSignal({
          from: this.selfPeerId,
          to: this.targetPeerId,
          type: 'relay-chunk',
          payload: { fileIndex, chunkIndex, data: b64Data },
        })

        this.events.onProgress?.(chunkBuffer.byteLength, fileIndex, chunkIndex)
        offset += CHUNK_SIZE

        // Pacing: wait 15ms every 5 chunks to keep socket healthy
        if (chunkIndex % 5 === 0) {
          await new Promise((r) => setTimeout(r, 15))
        }
      }

      // 3. Notify receiver about file end
      this.sendSignal({
        from: this.selfPeerId,
        to: this.targetPeerId,
        type: 'relay-control',
        payload: {
          type: 'file-end',
          payload: { fileIndex, file: meta },
        },
      })

      this.events.onFileComplete?.(fileIndex, meta)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (!this.isCancelled) {
      this.sendSignal({
        from: this.selfPeerId,
        to: this.targetPeerId,
        type: 'relay-control',
        payload: {
          type: 'all-completed',
          payload: {},
        },
      })
      this.events.onAllCompleted?.()
    }
  }

  public sendText(item: TextItem) {
    this.sendSignal({
      from: this.selfPeerId,
      to: this.targetPeerId,
      type: 'relay-control',
      payload: {
        type: 'text',
        payload: item,
      },
    })
  }

  public cancel() {
    this.isCancelled = true
    this.writeQueue = Promise.resolve()
    this.sendSignal({
      from: this.selfPeerId,
      to: this.targetPeerId,
      type: 'relay-control',
      payload: { type: 'cancel', payload: { reason: 'user_cancelled' } },
    })
    if (this.currentWriter) {
      this.currentWriter.abort().catch(() => {})
      this.currentWriter = null
    }
  }

  public close() {
    this.isCancelled = true
    this.writeQueue = Promise.resolve()
    this.currentWriter = null
    this.writerPromise = null
  }
}


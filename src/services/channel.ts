import type { FileMeta, ControlPacket, TextItem } from '@/types/transfer'
import { createFileReceiver, type FileReceiverWriter } from './storage'

export const CHUNK_SIZE = 32 * 1024 // 32 KB per chunk
export const BUFFERED_AMOUNT_HIGH_THRESHOLD = 1024 * 1024 // 1 MB
export const BUFFERED_AMOUNT_LOW_THRESHOLD = 256 * 1024 // 256 KB

export interface ChannelEvents {
  onProgress: (bytesDelta: number, currentFileIndex: number, currentChunkIndex: number) => void
  onFileStart: (fileIndex: number, file: FileMeta) => void
  onFileComplete: (fileIndex: number, file: FileMeta) => void
  onAllCompleted: () => void
  onError: (error: string) => void
  onCancel: () => void
  onTextReceived: (item: TextItem) => void
}

export class TransferChannel {
  private controlDc: RTCDataChannel
  private dataDc: RTCDataChannel
  private isCancelled: boolean = false
  private currentWriter: FileReceiverWriter | null = null
  private writerPromise: Promise<FileReceiverWriter> | null = null
  private pendingChunks: Array<{ fileIndex: number; chunkIndex: number; payload: ArrayBuffer }> = []
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

    this.dataDc.onmessage = async (event) => {
      if (typeof event.data === 'string') return
      const arrayBuffer = event.data as ArrayBuffer
      if (arrayBuffer.byteLength < 8) return

      const view = new DataView(arrayBuffer)
      const fileIndex = view.getUint32(0)
      const chunkIndex = view.getUint32(4)
      const payload = arrayBuffer.slice(8)

      if (this.currentWriter) {
        await this.currentWriter.writeChunk(chunkIndex, payload)
        this.events.onProgress?.(payload.byteLength, fileIndex, chunkIndex)
      } else if (this.writerPromise) {
        // Buffer chunk while writer finishes async initialization
        this.pendingChunks.push({ fileIndex, chunkIndex, payload })
      }
    }
  }

  private async handleControlPacket(packet: ControlPacket) {
    switch (packet.type) {
      case 'file-start': {
        const { fileIndex, file, transferId } = packet.payload
        this.events.onFileStart?.(fileIndex, file)
        this.writerPromise = createFileReceiver(file, transferId, fileIndex)
        this.currentWriter = await this.writerPromise
        // Flush any chunks received during async writer setup
        while (this.pendingChunks.length > 0) {
          const item = this.pendingChunks.shift()!
          await this.currentWriter.writeChunk(item.chunkIndex, item.payload)
          this.events.onProgress?.(item.payload.byteLength, item.fileIndex, item.chunkIndex)
        }
        break
      }
      case 'file-end': {
        const { fileIndex, file } = packet.payload
        if (this.writerPromise) {
          await this.writerPromise
        }
        if (this.currentWriter) {
          await this.currentWriter.finish()
          this.currentWriter = null
        }
        this.writerPromise = null
        this.pendingChunks = []
        this.events.onFileComplete?.(fileIndex, file)
        // Send ACK back
        this.sendControl({ type: 'file-ack', payload: { fileIndex } })
        break
      }
      case 'cancel': {
        this.isCancelled = true
        this.pendingChunks = []
        if (this.currentWriter) {
          await this.currentWriter.abort()
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

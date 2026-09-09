import type { FileMeta, ControlPacket, TextItem } from '@/types/transfer'
import { createFileReceiver, type FileReceiverWriter } from './storage'

export const CHUNK_SIZE = 32 * 1024 // 32 KB per chunk
export const BUFFERED_AMOUNT_HIGH_THRESHOLD = 1024 * 1024 // 1 MB
export const BUFFERED_AMOUNT_LOW_THRESHOLD = 256 * 1024 // 256 KB
export const EOF_CHUNK_INDEX = 0xffffffff // In-band EOF marker on dataDc

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
  private pendingAcks = new Map<number, () => void>()
  private events: Partial<ChannelEvents> = {}

  // Receiver state tracking for active file
  private currentFileMeta: FileMeta | null = null
  private currentFileIndex: number = -1
  private receivedChunksCount: number = 0
  private receivedBytes: number = 0
  private isFileEndReceived: boolean = false
  private isDataEofReceived: boolean = false
  private isFinishingFile: boolean = false
  private fileEndTimeout: any = null

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

      if (chunkIndex === EOF_CHUNK_INDEX) {
        this.isDataEofReceived = true
        await this.checkAndFinishFile()
        return
      }

      if (this.currentWriter) {
        await this.currentWriter.writeChunk(chunkIndex, payload)
        this.receivedChunksCount++
        this.receivedBytes += payload.byteLength
        this.events.onProgress?.(payload.byteLength, fileIndex, chunkIndex)
        await this.checkAndFinishFile()
      } else {
        // Buffer chunk while writer finishes async initialization or before file-start arrives
        this.pendingChunks.push({ fileIndex, chunkIndex, payload })
      }
    }
  }

  private async handleControlPacket(packet: ControlPacket) {
    switch (packet.type) {
      case 'file-start': {
        const { fileIndex, file, transferId } = packet.payload
        if (this.fileEndTimeout) {
          clearTimeout(this.fileEndTimeout)
          this.fileEndTimeout = null
        }
        this.currentFileMeta = file
        this.currentFileIndex = fileIndex
        this.receivedChunksCount = 0
        this.receivedBytes = 0
        this.isFileEndReceived = false
        this.isDataEofReceived = false
        this.isFinishingFile = false

        this.events.onFileStart?.(fileIndex, file)
        this.writerPromise = createFileReceiver(file, transferId, fileIndex)
        this.currentWriter = await this.writerPromise

        // Flush any chunks received before writer was ready
        while (this.pendingChunks.length > 0) {
          const item = this.pendingChunks.shift()!
          if (item.fileIndex !== fileIndex) continue
          if (item.chunkIndex === EOF_CHUNK_INDEX) {
            this.isDataEofReceived = true
          } else {
            await this.currentWriter.writeChunk(item.chunkIndex, item.payload)
            this.receivedChunksCount++
            this.receivedBytes += item.payload.byteLength
            this.events.onProgress?.(item.payload.byteLength, item.fileIndex, item.chunkIndex)
          }
        }

        await this.checkAndFinishFile()
        break
      }
      case 'file-end': {
        this.isFileEndReceived = true

        // Safety fallback: if remaining chunks don't finish within 30s after file-end, force finish
        if (!this.fileEndTimeout) {
          this.fileEndTimeout = setTimeout(() => {
            if (this.currentWriter && !this.isFinishingFile) {
              console.warn('Timed out waiting for remaining chunks after file-end, forcing finish')
              this.isDataEofReceived = true
              this.checkAndFinishFile()
            }
          }, 30000)
        }

        await this.checkAndFinishFile()
        break
      }
      case 'file-ack': {
        const { fileIndex } = packet.payload
        const resolveAck = this.pendingAcks.get(fileIndex)
        if (resolveAck) {
          resolveAck()
          this.pendingAcks.delete(fileIndex)
        }
        break
      }
      case 'all-complete': {
        await this.checkAndFinishFile()
        this.events.onAllCompleted?.()
        break
      }
      case 'cancel': {
        this.isCancelled = true
        if (this.fileEndTimeout) {
          clearTimeout(this.fileEndTimeout)
          this.fileEndTimeout = null
        }
        this.pendingChunks = []
        if (this.currentWriter) {
          await this.currentWriter.abort()
          this.currentWriter = null
        }
        this.writerPromise = null
        this.currentFileMeta = null
        this.events.onCancel?.()
        break
      }
      case 'text': {
        this.events.onTextReceived?.(packet.payload)
        break
      }
    }
  }

  private async checkAndFinishFile() {
    if (this.isFinishingFile || !this.currentWriter || !this.currentFileMeta) return

    const totalChunks =
      this.currentFileMeta.totalChunks || Math.ceil(this.currentFileMeta.size / CHUNK_SIZE)
    const allChunksArrived =
      totalChunks === 0 ||
      this.receivedChunksCount >= totalChunks ||
      this.receivedBytes >= this.currentFileMeta.size

    const shouldFinish =
      (this.isDataEofReceived && allChunksArrived) ||
      (this.isFileEndReceived && allChunksArrived) ||
      (this.isFileEndReceived && this.isDataEofReceived) ||
      (totalChunks === 0 && this.isFileEndReceived)

    if (!shouldFinish) return

    this.isFinishingFile = true
    if (this.fileEndTimeout) {
      clearTimeout(this.fileEndTimeout)
      this.fileEndTimeout = null
    }

    const file = this.currentFileMeta
    const fileIndex = this.currentFileIndex

    try {
      if (this.writerPromise) {
        await this.writerPromise
      }
      await this.currentWriter.finish()
    } catch (err) {
      console.error('Error finishing file write:', err)
    } finally {
      this.currentWriter = null
      this.writerPromise = null
      this.currentFileMeta = null
      this.pendingChunks = []
      this.isFinishingFile = false
    }

    this.events.onFileComplete?.(fileIndex, file)
    // Send ACK back so sender can advance
    this.sendControl({ type: 'file-ack', payload: { fileIndex } })
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

      // Send in-band EOF frame on dataDc (guaranteed to arrive after all chunks because ordered: true)
      if (this.dataDc.readyState === 'open') {
        const eofFrame = new Uint8Array(8)
        const eofView = new DataView(eofFrame.buffer)
        eofView.setUint32(0, fileIndex)
        eofView.setUint32(4, EOF_CHUNK_INDEX)
        this.dataDc.send(eofFrame.buffer)
      }

      // Wait for all data chunks of this file to exit sender's DataChannel buffer
      await this.waitForBufferEmpty()

      // Setup ACK waiting from receiver with generous timeout for large files
      const ackTimeoutMs = Math.max(60000, Math.ceil(file.size / 100000) * 1000)
      const ackPromise = new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          this.pendingAcks.delete(fileIndex)
          resolve()
        }, ackTimeoutMs)
        this.pendingAcks.set(fileIndex, () => {
          clearTimeout(timer)
          resolve()
        })
      })

      // 3. Notify receiver about file end
      this.sendControl({
        type: 'file-end',
        payload: { fileIndex, file: meta },
      })

      // Wait for receiver to acknowledge file write & save
      await ackPromise

      this.events.onFileComplete?.(fileIndex, meta)
      // Small tick between files
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    if (!this.isCancelled) {
      // 4. Notify receiver that all files are transferred
      this.sendControl({
        type: 'all-complete',
        payload: { transferId },
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
    if (this.fileEndTimeout) {
      clearTimeout(this.fileEndTimeout)
      this.fileEndTimeout = null
    }
    this.pendingAcks.forEach((resolve) => resolve())
    this.pendingAcks.clear()
    this.sendControl({ type: 'cancel', payload: { reason: 'user_cancelled' } })
    if (this.currentWriter) {
      this.currentWriter.abort().catch(() => {})
      this.currentWriter = null
    }
  }

  private waitForBufferDrain(): Promise<void> {
    if (this.dataDc.bufferedAmount <= BUFFERED_AMOUNT_LOW_THRESHOLD || this.dataDc.readyState !== 'open') {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      let resolved = false
      const done = () => {
        if (!resolved) {
          resolved = true
          clearInterval(interval)
          this.dataDc.removeEventListener('bufferedamountlow', done)
          resolve()
        }
      }
      this.dataDc.addEventListener('bufferedamountlow', done)
      const interval = setInterval(() => {
        if (this.dataDc.bufferedAmount <= BUFFERED_AMOUNT_LOW_THRESHOLD || this.dataDc.readyState !== 'open') {
          done()
        }
      }, 10)
      setTimeout(done, 1000)
    })
  }

  private waitForBufferEmpty(): Promise<void> {
    if (this.dataDc.bufferedAmount === 0 || this.dataDc.readyState !== 'open') {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      let resolved = false
      const done = () => {
        if (!resolved) {
          resolved = true
          clearInterval(interval)
          this.dataDc.removeEventListener('bufferedamountlow', done)
          resolve()
        }
      }
      this.dataDc.addEventListener('bufferedamountlow', done)
      const interval = setInterval(() => {
        if (this.dataDc.bufferedAmount === 0 || this.dataDc.readyState !== 'open') {
          done()
        }
      }, 20)
      setTimeout(done, 5000)
    })
  }

  public close() {
    this.isCancelled = true
    if (this.fileEndTimeout) {
      clearTimeout(this.fileEndTimeout)
      this.fileEndTimeout = null
    }
    this.pendingAcks.forEach((resolve) => resolve())
    this.pendingAcks.clear()
    try {
      this.controlDc.close()
    } catch {}
    try {
      this.dataDc.close()
    } catch {}
  }
}

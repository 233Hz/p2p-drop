export interface FileMeta {
  id: string
  name: string
  size: number
  type: string
  relativePath?: string
  totalChunks: number
  chunkSizeBytes: number
  lastModified?: number
}

export type TransferStatus =
  | 'waiting_auth'
  | 'connecting'
  | 'transferring'
  | 'completed'
  | 'cancelled'
  | 'failed'

export interface TransferTask {
  id: string
  direction: 'send' | 'receive'
  peerId: string
  peerName: string
  files: FileMeta[]
  currentFileIndex: number
  currentChunkIndex: number
  bytesTransferred: number
  totalBytes: number
  progress: number
  speedBytesPerSec: number
  etaSeconds: number
  status: TransferStatus
  errorMessage?: string
  startTime: number
  completedTime?: number
}

export type SignalType =
  | 'transfer-request'
  | 'transfer-response'
  | 'webrtc-offer'
  | 'webrtc-answer'
  | 'webrtc-ice'
  | 'text-message'

export interface SignalMessage {
  from: string
  to: string
  type: SignalType
  payload: any
}

export type ControlType =
  | 'file-start'
  | 'file-end'
  | 'file-ack'
  | 'cancel'
  | 'text'

export interface ControlPacket {
  type: ControlType
  payload: any
}

export interface TextItem {
  id: string
  fromPeerId: string
  fromPeerName: string
  text: string
  timestamp: number
}

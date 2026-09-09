import { ref, reactive, watch, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import type { PeerInfo } from '@/types/peer'
import type { FileMeta, TransferTask, SignalMessage, TextItem } from '@/types/transfer'
import { sound } from '@/utils/sound'
import { WebRTCService, type WebRTCConnectionResult } from '@/services/webrtc'
import { TransferChannel, CHUNK_SIZE } from '@/services/channel'
import { supabaseService } from '@/services/supabase'
import type { AppSettings } from '@/types/config'

export interface IncomingRequest {
  transferId: string
  fromPeer: PeerInfo
  files: FileMeta[]
}

function formatErrorMessage(err: any): string {
  if (!err) return '内网传输连接中断'
  const msg = typeof err === 'string' ? err : err.message || String(err)
  if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('超时')) {
    return '内网连接超时：请确认两台设备处于同一 Wi-Fi 或局域网内，且路由器未开启 AP 隔离或访客模式。若设备开启了代理或 VPN，请尝试临时关闭。'
  }
  if (
    msg.includes('Symmetric NAT') ||
    msg.includes('firewall') ||
    msg.includes('WebRTC connection failed') ||
    msg.includes('直连建立失败') ||
    msg.includes('穿透失败')
  ) {
    return '局域网直连失败：两台设备未能在本地网络建立连通。请确保连接同一 Wi-Fi，且未开启 AP 隔离或 VPN 代理拦截。'
  }
  if (msg.includes('closed unexpectedly') || msg.includes('closed')) {
    return '内网传输通道被意外中断'
  }
  return msg
}


export function useTransfer(selfPeer: PeerInfo, settings: AppSettings) {
  const activeTask = ref<TransferTask | null>(null)
  const incomingRequest = ref<IncomingRequest | null>(null)
  const incomingText = ref<TextItem | null>(null)
  const textMessages = ref<TextItem[]>([])

  const appendTextMessage = (item: TextItem) => {
    if (!item || !item.id) return
    if (textMessages.value.some((m) => m.id === item.id)) return
    textMessages.value.unshift(item)
  }

  const webrtcService = new WebRTCService(settings)
  let activeRtc: WebRTCConnectionResult | null = null
  let activeChannel: TransferChannel | null = null
  let pendingFilesToSend: File[] = []
  let earlyIceCandidates: RTCIceCandidateInit[] = []

  // Keep webrtc config in sync with settings
  watch(
    () => settings,
    (newSettings) => {
      webrtcService.updateConfig(newSettings)
    },
    { deep: true }
  )

  // Metrics interval
  let speedInterval: any = null
  let lastBytesTransferred = 0
  let lastTime = Date.now()

  const startMetricsTracking = () => {
    stopMetricsTracking()
    lastBytesTransferred = activeTask.value?.bytesTransferred || 0
    lastTime = Date.now()

    speedInterval = setInterval(() => {
      if (!activeTask.value || activeTask.value.status !== 'transferring') return

      const now = Date.now()
      const timeDeltaSec = (now - lastTime) / 1000
      if (timeDeltaSec <= 0) return

      const bytesDelta = activeTask.value.bytesTransferred - lastBytesTransferred
      const speed = bytesDelta / timeDeltaSec

      activeTask.value.speedBytesPerSec = Math.max(0, speed)
      const remainingBytes = activeTask.value.totalBytes - activeTask.value.bytesTransferred

      if (speed > 0) {
        activeTask.value.etaSeconds = Math.max(0, remainingBytes / speed)
      } else {
        activeTask.value.etaSeconds = 0
      }

      lastBytesTransferred = activeTask.value.bytesTransferred
      lastTime = now
    }, 500)
  }

  const stopMetricsTracking = () => {
    if (speedInterval) {
      clearInterval(speedInterval)
      speedInterval = null
    }
  }

  const resetActiveTask = () => {
    stopMetricsTracking()
    if (activeChannel) {
      activeChannel.close()
      activeChannel = null
    }
    if (activeRtc) {
      activeRtc.close()
      activeRtc = null
    }
    pendingFilesToSend = []
    earlyIceCandidates = []
  }

  // Handle incoming Supabase Realtime signals
  const handleSignal = async (signal: SignalMessage) => {
    switch (signal.type) {
      case 'transfer-request': {
        const { transferId, files, sender } = signal.payload
        incomingRequest.value = {
          transferId,
          fromPeer: sender,
          files,
        }
        if (settings.soundEnabled) sound.playNotification()
        if (settings.vibrationEnabled) sound.vibrate([100, 50, 100])
        break
      }

      case 'transfer-response': {
        const { transferId, accepted, reason } = signal.payload
        if (!activeTask.value || activeTask.value.id !== transferId) return

        if (!accepted) {
          activeTask.value.status = 'failed'
          activeTask.value.errorMessage = reason || '对端拒绝了接收文件'
          if (settings.soundEnabled) sound.playError()
          return
        }

        // Accepted: Initiate WebRTC connection as offerer
        activeTask.value.status = 'connecting'

        try {
          const session = webrtcService.initiateConnection(
            selfPeer.peerId,
            activeTask.value.peerId,
            (sig) => supabaseService.sendSignal(sig),
            (state) => {
              if (state === 'failed') {
                if (activeTask.value && activeTask.value.status !== 'completed') {
                  activeTask.value.status = 'failed'
                  activeTask.value.errorMessage =
                    '局域网直连失败：请检查两端是否连接同一 Wi-Fi，且路由器未开启 AP 隔离'
                }
              }
            }
          )
          activeRtc = session

          // Flush any early arrival candidates
          while (earlyIceCandidates.length > 0) {
            session.addRemoteCandidate(earlyIceCandidates.shift()!)
          }

          const channels = await session.getChannels()
          setupTransferChannel(channels.control, channels.data)

          // Start sending files
          activeTask.value.status = 'transferring'
          startMetricsTracking()

          await activeChannel!.sendFiles(
            pendingFilesToSend,
            activeTask.value.files,
            transferId
          )
        } catch (err: any) {
          if (activeTask.value && (activeTask.value.status as string) !== 'completed') {
            activeTask.value.status = 'failed'
            activeTask.value.errorMessage = formatErrorMessage(err)
          }
        }
        break
      }

      case 'webrtc-offer': {
        if (!activeTask.value || activeTask.value.direction !== 'receive') return
        const offer = signal.payload

        try {
          const session = webrtcService.acceptConnection(
            selfPeer.peerId,
            signal.from,
            offer,
            (sig) => supabaseService.sendSignal(sig),
            (state) => {
              if (state === 'failed') {
                if (activeTask.value && activeTask.value.status !== 'completed') {
                  activeTask.value.status = 'failed'
                  activeTask.value.errorMessage =
                    '局域网直连失败：请检查两端是否连接同一 Wi-Fi，且路由器未开启 AP 隔离'
                }
              }
            }
          )
          activeRtc = session

          // Flush any early arrival candidates
          while (earlyIceCandidates.length > 0) {
            session.addRemoteCandidate(earlyIceCandidates.shift()!)
          }

          const channels = await session.getChannels()
          setupTransferChannel(channels.control, channels.data)
          activeTask.value.status = 'transferring'
          startMetricsTracking()
        } catch (err: any) {
          if (activeTask.value && (activeTask.value.status as string) !== 'completed') {
            activeTask.value.status = 'failed'
            activeTask.value.errorMessage = formatErrorMessage(err)
          }
        }
        break
      }

      case 'webrtc-answer': {
        if (activeRtc && signal.payload) {
          try {
            await activeRtc.setRemoteDescription(signal.payload)
          } catch (err: any) {
            console.error('Failed to set remote answer:', err)
          }
        }
        break
      }

      case 'webrtc-ice': {
        if (signal.payload) {
          if (activeRtc) {
            await activeRtc.addRemoteCandidate(signal.payload)
          } else {
            earlyIceCandidates.push(signal.payload)
          }
        }
        break
      }

      case 'text-message': {
        const item: TextItem = signal.payload
        if (!item || item.fromPeerId === selfPeer.peerId) break
        incomingText.value = item
        appendTextMessage(item)
        if (settings.soundEnabled) sound.playNotification()
        break
      }
    }
  }


  const handleAllCompleted = () => {
    if (!activeTask.value) return
    if (activeTask.value.status === 'completed') return

    activeTask.value.status = 'completed'
    activeTask.value.progress = 100
    activeTask.value.bytesTransferred = activeTask.value.totalBytes
    activeTask.value.speedBytesPerSec = 0
    activeTask.value.etaSeconds = 0
    activeTask.value.completedTime = Date.now()

    stopMetricsTracking()
    if (settings.soundEnabled) sound.playSuccess()
    if (settings.vibrationEnabled) sound.vibrate([150, 80, 150])
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      })
    } catch {}
  }

  const setupTransferChannel = (controlDc: RTCDataChannel, dataDc: RTCDataChannel) => {
    activeChannel = new TransferChannel(controlDc, dataDc, {
      onProgress: (bytesDelta, currentFileIndex, currentChunkIndex) => {
        if (!activeTask.value) return
        activeTask.value.bytesTransferred += bytesDelta
        activeTask.value.currentFileIndex = currentFileIndex
        activeTask.value.currentChunkIndex = currentChunkIndex
        activeTask.value.progress = Math.min(
          100,
          Math.round((activeTask.value.bytesTransferred / activeTask.value.totalBytes) * 100)
        )
      },
      onFileStart: (index, _meta) => {
        if (activeTask.value) {
          activeTask.value.currentFileIndex = index
        }
      },
      onFileComplete: (fileIndex, _meta) => {
        // Individual file completed
        if (activeTask.value && activeTask.value.direction === 'receive') {
          // If all files have completed receiving, trigger completion immediately
          if (fileIndex + 1 >= activeTask.value.files.length) {
            handleAllCompleted()
          }
        }
      },
      onAllCompleted: () => {
        handleAllCompleted()
      },
      onCancel: () => {
        if (activeTask.value) {
          activeTask.value.status = 'cancelled'
        }
        stopMetricsTracking()
      },
      onError: (err) => {
        if (activeTask.value && activeTask.value.status !== 'completed') {
          activeTask.value.status = 'failed'
          activeTask.value.errorMessage = formatErrorMessage(err)
        }
        stopMetricsTracking()
        if (settings.soundEnabled) sound.playError()
      },
      onTextReceived: (item) => {
        if (!item || item.fromPeerId === selfPeer.peerId) return
        incomingText.value = item
        appendTextMessage(item)
        if (settings.soundEnabled) sound.playNotification()
      },
    })
  }

  // Public Actions
  const requestSendFiles = async (targetPeer: PeerInfo, rawFiles: File[]) => {
    if (rawFiles.length === 0) return

    resetActiveTask()
    pendingFilesToSend = rawFiles

    const fileMetas: FileMeta[] = rawFiles.map((f, i) => ({
      id: `file_${i}_${Date.now()}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      relativePath: (f as any).webkitRelativePath || undefined,
      totalChunks: Math.ceil(f.size / CHUNK_SIZE),
      chunkSizeBytes: CHUNK_SIZE,
      lastModified: f.lastModified,
    }))

    const totalBytes = rawFiles.reduce((acc, f) => acc + f.size, 0)
    const transferId = 'tx_' + Math.random().toString(36).substring(2, 9)

    activeTask.value = reactive<TransferTask>({
      id: transferId,
      direction: 'send',
      peerId: targetPeer.peerId,
      peerName: targetPeer.name,
      files: fileMetas,
      currentFileIndex: 0,
      currentChunkIndex: 0,
      bytesTransferred: 0,
      totalBytes,
      progress: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: 'waiting_auth',
      startTime: Date.now(),
    })

    // Send transfer-request signal
    await supabaseService.sendSignal({
      from: selfPeer.peerId,
      to: targetPeer.peerId,
      type: 'transfer-request',
      payload: {
        transferId,
        files: fileMetas,
        sender: selfPeer,
      },
    })
  }

  const acceptTransfer = async () => {
    if (!incomingRequest.value) return
    const req = incomingRequest.value
    incomingRequest.value = null

    resetActiveTask()

    const totalBytes = req.files.reduce((acc, f) => acc + f.size, 0)

    activeTask.value = reactive<TransferTask>({
      id: req.transferId,
      direction: 'receive',
      peerId: req.fromPeer.peerId,
      peerName: req.fromPeer.name,
      files: req.files,
      currentFileIndex: 0,
      currentChunkIndex: 0,
      bytesTransferred: 0,
      totalBytes,
      progress: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: 'connecting',
      startTime: Date.now(),
    })

    // Send response accept
    await supabaseService.sendSignal({
      from: selfPeer.peerId,
      to: req.fromPeer.peerId,
      type: 'transfer-response',
      payload: {
        transferId: req.transferId,
        accepted: true,
      },
    })
  }

  const rejectTransfer = async () => {
    if (!incomingRequest.value) return
    const req = incomingRequest.value
    incomingRequest.value = null

    await supabaseService.sendSignal({
      from: selfPeer.peerId,
      to: req.fromPeer.peerId,
      type: 'transfer-response',
      payload: {
        transferId: req.transferId,
        accepted: false,
        reason: '对方拒绝了接收',
      },
    })
  }

  const cancelActiveTask = () => {
    if (!activeTask.value) return

    if (activeChannel) {
      activeChannel.cancel()
    }
    activeTask.value.status = 'cancelled'
    resetActiveTask()
  }

  const dismissActiveTask = () => {
    resetActiveTask()
    activeTask.value = null
  }

  const sendTextMessage = async (targetPeer: PeerInfo | null | undefined, text: string) => {
    if (!text.trim()) return

    const item: TextItem = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      fromPeerId: selfPeer.peerId,
      fromPeerName: selfPeer.name,
      text: text.trim(),
      timestamp: Date.now(),
    }

    // Try through open control channel first if target peer matches, otherwise send via Supabase
    if (targetPeer && activeChannel) {
      activeChannel.sendText(item)
    } else {
      await supabaseService.sendSignal({
        from: selfPeer.peerId,
        to: targetPeer ? targetPeer.peerId : 'all',
        type: 'text-message',
        payload: item,
      })
    }

    appendTextMessage(item)
  }

  onUnmounted(() => {
    stopMetricsTracking()
    resetActiveTask()
  })

  return {
    activeTask,
    incomingRequest,
    incomingText,
    textMessages,
    handleSignal,
    requestSendFiles,
    acceptTransfer,
    rejectTransfer,
    cancelActiveTask,
    dismissActiveTask,
    sendTextMessage,
  }
}

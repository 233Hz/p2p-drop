import type { SignalMessage } from '@/types/transfer'
import type { AppSettings } from '@/types/config'
import { DEFAULT_STUN_SERVERS, DEFAULT_FALLBACK_TURN_SERVERS } from '@/types/config'

export interface WebRTCConnectionResult {
  pc: RTCPeerConnection
  getChannels: () => Promise<{ control: RTCDataChannel; data: RTCDataChannel }>
  addRemoteCandidate: (candidate: RTCIceCandidateInit) => Promise<void>
  setRemoteDescription: (desc: RTCSessionDescriptionInit) => Promise<void>
  close: () => void
}

export function buildRtcConfig(settings: Partial<AppSettings>): RTCConfiguration {
  const iceServers: RTCIceServer[] = []

  // STUN servers
  const stunUrls =
    settings.stunServers && settings.stunServers.length > 0
      ? settings.stunServers
      : DEFAULT_STUN_SERVERS

  iceServers.push({ urls: stunUrls })

  // Custom TURN server or fallback
  if (settings.turnServer && settings.turnServer.urls.trim()) {
    const turnEntry: RTCIceServer = {
      urls: settings.turnServer.urls.trim(),
    }
    if (settings.turnServer.username) {
      turnEntry.username = settings.turnServer.username
    }
    if (settings.turnServer.credential) {
      turnEntry.credential = settings.turnServer.credential
    }
    iceServers.push(turnEntry)
  } else {
    // Inject default fallback TURN servers for symmetric NAT / mobile networks
    iceServers.push(...DEFAULT_FALLBACK_TURN_SERVERS)
  }

  return {
    iceServers,
    iceCandidatePoolSize: 2,
  }
}

class WebRTCConnectionSession implements WebRTCConnectionResult {
  public pc: RTCPeerConnection
  private pendingCandidates: RTCIceCandidateInit[] = []
  private hasRemoteDesc = false
  public getChannels: () => Promise<{ control: RTCDataChannel; data: RTCDataChannel }>
  public close: () => void

  constructor(
    pc: RTCPeerConnection,
    getChannels: () => Promise<{ control: RTCDataChannel; data: RTCDataChannel }>,
    closeFn: () => void
  ) {
    this.pc = pc
    this.getChannels = getChannels
    this.close = closeFn
  }

  public async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(desc))
    this.hasRemoteDesc = true
    await this.flushPendingCandidates()
  }

  public async addRemoteCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!candidate || !candidate.candidate) {
      return
    }

    if (!this.hasRemoteDesc || !this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate)
      return
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn('Failed to add remote ICE candidate directly:', err)
    }
  }

  private async flushPendingCandidates(): Promise<void> {
    if (this.pendingCandidates.length === 0) return
    const queue = [...this.pendingCandidates]
    this.pendingCandidates = []

    for (const cand of queue) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(cand))
      } catch (err) {
        console.warn('Failed to add queued remote ICE candidate:', err)
      }
    }
  }
}

export class WebRTCService {
  private config: RTCConfiguration

  constructor(settings: Partial<AppSettings> = {}) {
    this.config = buildRtcConfig(settings)
  }

  public updateConfig(settings: Partial<AppSettings>) {
    this.config = buildRtcConfig(settings)
  }

  public async initiateConnection(
    selfPeerId: string,
    targetPeerId: string,
    sendSignal: (signal: SignalMessage) => void,
    onStateChange?: (state: RTCPeerConnectionState) => void,
    initialCandidates: RTCIceCandidateInit[] = []
  ): Promise<WebRTCConnectionResult> {
    const pc = new RTCPeerConnection(this.config)

    const controlDc = pc.createDataChannel('control', { ordered: true })
    const dataDc = pc.createDataChannel('data', { ordered: true })

    this.bindConnectionMonitoring(pc, onStateChange)

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          from: selfPeerId,
          to: targetPeerId,
          type: 'webrtc-ice',
          payload: event.candidate.toJSON(),
        })
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    sendSignal({
      from: selfPeerId,
      to: targetPeerId,
      type: 'webrtc-offer',
      payload: offer,
    })

    const getChannels = (): Promise<{ control: RTCDataChannel; data: RTCDataChannel }> => {
      return new Promise((resolve, reject) => {
        let isResolved = false

        const checkOpen = () => {
          if (isResolved) return
          if (controlDc.readyState === 'open' && dataDc.readyState === 'open') {
            isResolved = true
            clearTimeout(timer)
            resolve({ control: controlDc, data: dataDc })
          }
        }

        controlDc.onopen = checkOpen
        dataDc.onopen = checkOpen
        checkOpen()

        const timer = setTimeout(() => {
          if (!isResolved) {
            isResolved = true
            reject(new Error('数据通道连接超时（对端未就绪或被拦截）'))
          }
        }, 30000)

        const handleFail = (msg: string) => {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timer)
            reject(new Error(msg))
          }
        }

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') {
            handleFail('WebRTC 连接失败（对称型 NAT 或防火墙限制）')
          }
        }

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'failed') {
            handleFail('WebRTC ICE 穿透失败（无法建立直连或中继）')
          }
        }
      })
    }

    const session = new WebRTCConnectionSession(
      pc,
      getChannels,
      () => {
        controlDc.close()
        dataDc.close()
        pc.close()
      }
    )

    // Add any early arrival candidates
    for (const cand of initialCandidates) {
      await session.addRemoteCandidate(cand)
    }

    return session
  }

  public async acceptConnection(
    selfPeerId: string,
    fromPeerId: string,
    offer: RTCSessionDescriptionInit,
    sendSignal: (signal: SignalMessage) => void,
    onStateChange?: (state: RTCPeerConnectionState) => void,
    initialCandidates: RTCIceCandidateInit[] = []
  ): Promise<WebRTCConnectionResult> {
    const pc = new RTCPeerConnection(this.config)
    let controlDc: RTCDataChannel | null = null
    let dataDc: RTCDataChannel | null = null

    this.bindConnectionMonitoring(pc, onStateChange)

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          from: selfPeerId,
          to: fromPeerId,
          type: 'webrtc-ice',
          payload: event.candidate.toJSON(),
        })
      }
    }

    const channelsPromise = new Promise<{ control: RTCDataChannel; data: RTCDataChannel }>(
      (resolve, reject) => {
        let isResolved = false

        const timeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true
            reject(new Error('等待远端数据通道超时（网络受限或防火墙阻隔）'))
          }
        }, 30000)

        const checkOpen = () => {
          if (isResolved) return
          if (
            controlDc &&
            dataDc &&
            controlDc.readyState === 'open' &&
            dataDc.readyState === 'open'
          ) {
            isResolved = true
            clearTimeout(timeout)
            resolve({ control: controlDc, data: dataDc })
          }
        }

        pc.ondatachannel = (event) => {
          if (event.channel.label === 'control') {
            controlDc = event.channel
            controlDc.onopen = checkOpen
          } else if (event.channel.label === 'data') {
            dataDc = event.channel
            dataDc.onopen = checkOpen
          }
          checkOpen()
        }

        const handleFail = (msg: string) => {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeout)
            reject(new Error(msg))
          }
        }

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') {
            handleFail('WebRTC 连接失败（对称型 NAT 或防火墙限制）')
          }
        }

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'failed') {
            handleFail('WebRTC ICE 穿透失败（无法建立直连或中继）')
          }
        }
      }
    )

    const session = new WebRTCConnectionSession(
      pc,
      () => channelsPromise,
      () => {
        controlDc?.close()
        dataDc?.close()
        pc.close()
      }
    )

    // Pre-queue early candidates before setRemoteDescription
    for (const cand of initialCandidates) {
      await session.addRemoteCandidate(cand)
    }

    // Set remote offer and auto-flush queued candidates
    await session.setRemoteDescription(offer)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    sendSignal({
      from: selfPeerId,
      to: fromPeerId,
      type: 'webrtc-answer',
      payload: answer,
    })

    return session
  }

  private bindConnectionMonitoring(
    pc: RTCPeerConnection,
    onStateChange?: (state: RTCPeerConnectionState) => void
  ) {
    pc.onconnectionstatechange = () => {
      onStateChange?.(pc.connectionState)
    }
  }
}


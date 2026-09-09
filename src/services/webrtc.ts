import type { SignalMessage } from '@/types/transfer'
import type { AppSettings } from '@/types/config'
import { DEFAULT_STUN_SERVERS } from '@/types/config'

export interface WebRTCConnectionResult {
  pc: RTCPeerConnection
  getChannels: () => Promise<{ control: RTCDataChannel; data: RTCDataChannel }>
  addRemoteCandidate: (candidate: RTCIceCandidateInit) => Promise<void>
  setRemoteDescription: (desc: RTCSessionDescriptionInit) => Promise<void>
  close: () => void
}

export function buildRtcConfig(settings: Partial<AppSettings>): RTCConfiguration {
  const iceServers: RTCIceServer[] = []

  // 1. Custom TURN server only if explicitly configured by user
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
  }

  // 2. Local STUN servers for router port discovery
  const stunUrls =
    settings.stunServers && settings.stunServers.length > 0
      ? settings.stunServers
      : DEFAULT_STUN_SERVERS

  iceServers.push({ urls: stunUrls })

  return {
    iceServers,
    bundlePolicy: 'max-bundle',
    iceCandidatePoolSize: 0,
  }
}

export class WebRTCConnectionSession implements WebRTCConnectionResult {
  public pc: RTCPeerConnection
  private pendingCandidates: RTCIceCandidateInit[] = []
  private hasRemoteDesc = false
  private controlDc: RTCDataChannel | null = null
  private dataDc: RTCDataChannel | null = null
  private channelsPromise: Promise<{ control: RTCDataChannel; data: RTCDataChannel }>
  private resolveChannels!: (val: { control: RTCDataChannel; data: RTCDataChannel }) => void
  private rejectChannels!: (err: Error) => void
  private isFinished = false
  private timeoutTimer: any = null

  constructor(config: RTCConfiguration) {
    this.pc = new RTCPeerConnection(config)

    this.channelsPromise = new Promise((resolve, reject) => {
      this.resolveChannels = resolve
      this.rejectChannels = reject
    })

    this.timeoutTimer = setTimeout(() => {
      this.fail(new Error('等待内网数据通道连接超时（请确保两端处于同一 Wi-Fi，且未开启 AP 隔离或 VPN 代理）'))
    }, 35000)
  }

  public getChannels = (): Promise<{ control: RTCDataChannel; data: RTCDataChannel }> => {
    return this.channelsPromise
  }

  public async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(desc))
      this.hasRemoteDesc = true
      await this.flushPendingCandidates()
    } catch (err: any) {
      console.error('Failed to set remote description:', err)
      this.fail(err)
    }
  }

  public async addRemoteCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!candidate || !candidate.candidate) return

    if (!this.hasRemoteDesc || !this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate)
      return
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn('Failed to add remote candidate:', err)
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
        console.warn('Failed to add queued candidate:', err)
      }
    }
  }

  public setupLocalChannels(
    controlDc: RTCDataChannel,
    dataDc: RTCDataChannel,
    onStateChange?: (state: RTCPeerConnectionState) => void
  ) {
    this.controlDc = controlDc
    this.dataDc = dataDc

    this.bindMonitoring(onStateChange)

    const checkOpen = () => {
      if (this.isFinished) return
      if (controlDc.readyState === 'open' && dataDc.readyState === 'open') {
        this.isFinished = true
        if (this.timeoutTimer) clearTimeout(this.timeoutTimer)
        this.resolveChannels({ control: controlDc, data: dataDc })
      }
    }

    controlDc.onopen = checkOpen
    dataDc.onopen = checkOpen
    checkOpen()
  }

  public setupRemoteChannels(onStateChange?: (state: RTCPeerConnectionState) => void) {
    this.bindMonitoring(onStateChange)

    const checkOpen = () => {
      if (this.isFinished) return
      if (
        this.controlDc &&
        this.dataDc &&
        this.controlDc.readyState === 'open' &&
        this.dataDc.readyState === 'open'
      ) {
        this.isFinished = true
        if (this.timeoutTimer) clearTimeout(this.timeoutTimer)
        this.resolveChannels({ control: this.controlDc, data: this.dataDc })
      }
    }

    this.pc.ondatachannel = (event) => {
      if (event.channel.label === 'control') {
        this.controlDc = event.channel
        this.controlDc.onopen = checkOpen
      } else if (event.channel.label === 'data') {
        this.dataDc = event.channel
        this.dataDc.onopen = checkOpen
      }
      checkOpen()
    }
  }

  private bindMonitoring(onStateChange?: (state: RTCPeerConnectionState) => void) {
    this.pc.onconnectionstatechange = () => {
      onStateChange?.(this.pc.connectionState)
      if (this.pc.connectionState === 'failed') {
        this.fail(new Error('局域网直连建立失败（两台设备未在同一 Wi-Fi 或受路由器 AP 隔离限制）'))
      }
    }

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === 'failed') {
        this.fail(new Error('局域网 ICE 穿透失败（无法建立本地点对点直连）'))
      }
    }
  }

  public fail(err: Error) {
    if (this.isFinished) return
    this.isFinished = true
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer)
    this.rejectChannels(err)
  }

  public close = () => {
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer)
    this.isFinished = true
    try {
      this.controlDc?.close()
    } catch {}
    try {
      this.dataDc?.close()
    } catch {}
    try {
      this.pc.close()
    } catch {}
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

  public initiateConnection(
    selfPeerId: string,
    targetPeerId: string,
    sendSignal: (signal: SignalMessage) => void,
    onStateChange?: (state: RTCPeerConnectionState) => void
  ): WebRTCConnectionSession {
    const session = new WebRTCConnectionSession(this.config)
    const pc = session.pc

    const controlDc = pc.createDataChannel('control', { ordered: true })
    const dataDc = pc.createDataChannel('data', { ordered: true })

    session.setupLocalChannels(controlDc, dataDc, onStateChange)

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

    // Create and send offer
    pc.createOffer()
      .then(async (offer) => {
        await pc.setLocalDescription(offer)
        sendSignal({
          from: selfPeerId,
          to: targetPeerId,
          type: 'webrtc-offer',
          payload: offer,
        })
      })
      .catch((err) => session.fail(err))

    return session
  }

  public acceptConnection(
    selfPeerId: string,
    fromPeerId: string,
    offer: RTCSessionDescriptionInit,
    sendSignal: (signal: SignalMessage) => void,
    onStateChange?: (state: RTCPeerConnectionState) => void
  ): WebRTCConnectionSession {
    const session = new WebRTCConnectionSession(this.config)
    const pc = session.pc

    session.setupRemoteChannels(onStateChange)

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

    // Set remote offer then create answer
    session
      .setRemoteDescription(offer)
      .then(async () => {
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendSignal({
          from: selfPeerId,
          to: fromPeerId,
          type: 'webrtc-answer',
          payload: answer,
        })
      })
      .catch((err) => session.fail(err))

    return session
  }
}


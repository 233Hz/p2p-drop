import type { SignalMessage } from '@/types/transfer'
import type { AppSettings } from '@/types/config'
import { DEFAULT_STUN_SERVERS } from '@/types/config'

export interface WebRTCConnectionResult {
  pc: RTCPeerConnection
  getChannels: () => Promise<{ control: RTCDataChannel; data: RTCDataChannel }>
  close: () => void
}

export function buildRtcConfig(settings: Partial<AppSettings>): RTCConfiguration {
  const iceServers: RTCIceServer[] = []

  // STUN servers
  const stunUrls = settings.stunServers && settings.stunServers.length > 0
    ? settings.stunServers
    : DEFAULT_STUN_SERVERS

  iceServers.push({ urls: stunUrls })

  // Custom TURN server
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

  return {
    iceServers,
    iceCandidatePoolSize: 2,
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
    onStateChange?: (state: RTCPeerConnectionState) => void
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
        let controlOpen = controlDc.readyState === 'open'
        let dataOpen = dataDc.readyState === 'open'

        if (controlOpen && dataOpen) {
          return resolve({ control: controlDc, data: dataDc })
        }

        const checkOpen = () => {
          if (controlDc.readyState === 'open' && dataDc.readyState === 'open') {
            resolve({ control: controlDc, data: dataDc })
          }
        }

        controlDc.onopen = checkOpen
        dataDc.onopen = checkOpen

        const timer = setTimeout(() => {
          if (controlDc.readyState !== 'open' || dataDc.readyState !== 'open') {
            reject(new Error('DataChannel open timeout'))
          }
        }, 20000)

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') {
            clearTimeout(timer)
            reject(new Error('WebRTC connection failed (Symmetric NAT or firewall)'))
          }
        }
      })
    }

    return {
      pc,
      getChannels,
      close: () => {
        controlDc.close()
        dataDc.close()
        pc.close()
      },
    }
  }

  public async acceptConnection(
    selfPeerId: string,
    fromPeerId: string,
    offer: RTCSessionDescriptionInit,
    sendSignal: (signal: SignalMessage) => void,
    onStateChange?: (state: RTCPeerConnectionState) => void
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
        const timeout = setTimeout(() => {
          reject(new Error('Waiting for remote DataChannels timed out'))
        }, 20000)

        pc.ondatachannel = (event) => {
          if (event.channel.label === 'control') {
            controlDc = event.channel
          } else if (event.channel.label === 'data') {
            dataDc = event.channel
          }

          if (controlDc && dataDc) {
            clearTimeout(timeout)
            resolve({ control: controlDc, data: dataDc })
          }
        }

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') {
            clearTimeout(timeout)
            reject(new Error('WebRTC connection failed'))
          }
        }
      }
    )

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    sendSignal({
      from: selfPeerId,
      to: fromPeerId,
      type: 'webrtc-answer',
      payload: answer,
    })

    return {
      pc,
      getChannels: () => channelsPromise,
      close: () => {
        controlDc?.close()
        dataDc?.close()
        pc.close()
      },
    }
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

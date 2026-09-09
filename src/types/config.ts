export interface TurnConfig {
  urls: string
  username?: string
  credential?: string
}

export interface AppSettings {
  stunServers: string[]
  turnServer?: TurnConfig
  theme: 'light' | 'dark' | 'auto'
  soundEnabled: boolean
  vibrationEnabled: boolean
}

export const DEFAULT_STUN_SERVERS = [
  'stun:stun.qq.com:3478',
  'stun:stun.miwifi.com:3478',
  'stun:stun.bilibili.com:3478',
  'stun:stun.syncthing.net:3478',
  'stun:stun.cloudflare.com:3478',
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
]

export const DEFAULT_FALLBACK_TURN_SERVERS: RTCIceServer[] = [
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelay',
    credential: 'openrelay',
  },
]

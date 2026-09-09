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
]


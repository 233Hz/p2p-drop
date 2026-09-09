export interface TurnConfig {
  urls: string
  username?: string
  credential?: string
}

export interface AppSettings {
  supabaseUrl: string
  supabaseAnonKey: string
  stunServers: string[]
  turnServer?: TurnConfig
  theme: 'light' | 'dark' | 'auto'
  soundEnabled: boolean
  vibrationEnabled: boolean
}

export const DEFAULT_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
]

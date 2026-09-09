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

export const DEFAULT_SUPABASE_URL = 'https://angslcexviasghvjbcqe.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZ3NsY2V4dmlhc2dodmpiY3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDQxMjksImV4cCI6MjEwNDUyMDEyOX0.rlnVQgDT6hzsE2xVCXW2dH_bIDU73af3YqE6yV-BEDE'

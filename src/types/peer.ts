export type DeviceType = 'desktop' | 'mobile' | 'tablet'

export type OsType = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown'

export type BrowserType = 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'browser'

export interface PeerInfo {
  peerId: string
  name: string
  deviceType: DeviceType
  os: OsType
  browser: BrowserType
  joinedAt: number
  isSelf?: boolean
  avatarColor: string
}

export type ConnectionPhase =
  | 'idle'
  | 'signaling'
  | 'discovered'
  | 'punching'
  | 'connected'
  | 'transferring'
  | 'completed'
  | 'failed'

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js'
import type { PeerInfo } from '@/types/peer'
import type { SignalMessage } from '@/types/transfer'

export interface SupabaseSignalingHandlers {
  onPresenceSync: (peers: PeerInfo[]) => void
  onSignal: (signal: SignalMessage) => void
  onStatusChange: (status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR') => void
}

const DEFAULT_SUPABASE_URL = 'https://angslcexviasghvjbcqe.supabase.co'
const DEFAULT_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZ3NsY2V4dmlhc2dodmpiY3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDQxMjksImV4cCI6MjEwNDUyMDEyOX0.rlnVQgDT6hzsE2xVCXW2dH_bIDU73af3YqE6yV-BEDE'

export class SupabaseSignalingService {
  private client: SupabaseClient | null = null
  private channel: RealtimeChannel | null = null
  private currentRoomId: string | null = null
  private selfPeer: PeerInfo | null = null

  public getCurrentRoomId(): string | null {
    return this.currentRoomId
  }

  public getSelfPeer(): PeerInfo | null {
    return this.selfPeer
  }

  public isConfigured(): boolean {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY
    return Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'))
  }

  public initClient(url: string, key: string) {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
    this.client = createClient(url, key, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    })
  }

  public async joinRoom(
    roomId: string,
    selfPeer: PeerInfo,
    handlers: SupabaseSignalingHandlers
  ): Promise<boolean> {
    if (!this.client) {
      const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY
      if (url && key && url.startsWith('http')) {
        this.initClient(url, key)
      } else {
        console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment')
        handlers.onStatusChange('ERROR')
        return false
      }
    }

    if (this.client) {
      try {
        await this.client.removeAllChannels()
      } catch {}
    } else if (this.channel) {
      await this.channel.unsubscribe()
    }
    this.channel = null

    this.currentRoomId = roomId
    this.selfPeer = selfPeer
    handlers.onStatusChange('CONNECTING')

    this.channel = this.client!.channel(`room:${roomId}`, {
      config: {
        presence: { key: selfPeer.peerId },
        broadcast: { self: false },
      },
    })

    const syncPresence = () => {
      if (!this.channel) return
      const state = this.channel.presenceState()
      const peers: PeerInfo[] = []

      for (const key in state) {
        const presences = state[key]
        if (presences && Array.isArray(presences)) {
          for (const item of presences) {
            const p = item as unknown as PeerInfo
            if (p && p.peerId && p.peerId !== selfPeer.peerId) {
              if (!peers.some((existing) => existing.peerId === p.peerId)) {
                peers.push(p)
              }
            }
          }
        }
      }
      handlers.onPresenceSync(peers)
    }

    this.channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)

    this.channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      const signal = payload as SignalMessage
      if (signal.to === selfPeer.peerId || signal.to === 'all') {
        handlers.onSignal(signal)
      }
    })

    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        handlers.onStatusChange('CONNECTED')
        try {
          await this.channel?.track(JSON.parse(JSON.stringify(selfPeer)))
          syncPresence()
        } catch (err) {
          console.error('Failed to track selfPeer:', err)
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        handlers.onStatusChange('DISCONNECTED')
      } else if (status === 'TIMED_OUT') {
        handlers.onStatusChange('ERROR')
      }
    })

    return true
  }

  public async sendSignal(signal: SignalMessage): Promise<void> {
    if (!this.channel) {
      console.warn('Cannot send signal, channel not connected')
      return
    }
    await this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: signal,
    })
  }

  public async updateSelfPeer(selfPeer: PeerInfo) {
    this.selfPeer = selfPeer
    if (this.channel) {
      await this.channel.track(JSON.parse(JSON.stringify(selfPeer)))
    }
  }

  public async leaveRoom() {
    if (this.client) {
      try {
        await this.client.removeAllChannels()
      } catch {}
    } else if (this.channel) {
      await this.channel.unsubscribe()
    }
    this.channel = null
    this.currentRoomId = null
  }
}

export const supabaseService = new SupabaseSignalingService()

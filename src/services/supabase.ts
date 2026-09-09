import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js'
import type { PeerInfo } from '@/types/peer'
import type { SignalMessage } from '@/types/transfer'
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '@/types/config'

export interface SupabaseSignalingHandlers {
  onPresenceSync: (peers: PeerInfo[]) => void
  onSignal: (signal: SignalMessage) => void
  onStatusChange: (status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR') => void
}

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

  public isConfigured(url?: string, key?: string): boolean {
    const supabaseUrl = url || import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('p2p_drop_supabase_url') || DEFAULT_SUPABASE_URL
    const supabaseKey = key || import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('p2p_drop_supabase_anon_key') || DEFAULT_SUPABASE_ANON_KEY
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
      const url = localStorage.getItem('p2p_drop_supabase_url') || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
      const key = localStorage.getItem('p2p_drop_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
      if (url && key && url.startsWith('http')) {
        this.initClient(url, key)
      } else {
        handlers.onStatusChange('ERROR')
        return false
      }
    }

    if (this.channel) {
      await this.channel.unsubscribe()
      this.channel = null
    }

    this.currentRoomId = roomId
    this.selfPeer = selfPeer
    handlers.onStatusChange('CONNECTING')

    this.channel = this.client!.channel(`room:${roomId}`, {
      config: {
        presence: { key: selfPeer.peerId },
        broadcast: { self: false },
      },
    })

    this.channel.on('presence', { event: 'sync' }, () => {
      if (!this.channel) return
      const state = this.channel.presenceState()
      const peers: PeerInfo[] = []
      
      for (const key in state) {
        const presences = state[key]
        if (presences && presences.length > 0) {
          const p = presences[0] as unknown as PeerInfo
          if (p.peerId !== selfPeer.peerId) {
            peers.push(p)
          }
        }
      }
      handlers.onPresenceSync(peers)
    })

    this.channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      const signal = payload as SignalMessage
      if (signal.to === selfPeer.peerId || signal.to === 'all') {
        handlers.onSignal(signal)
      }
    })

    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        handlers.onStatusChange('CONNECTED')
        await this.channel?.track(selfPeer)
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
      await this.channel.track(selfPeer)
    }
  }

  public async leaveRoom() {
    if (this.channel) {
      await this.channel.unsubscribe()
      this.channel = null
    }
    this.currentRoomId = null
  }
}

export const supabaseService = new SupabaseSignalingService()

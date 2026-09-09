import { ref, reactive, onMounted, onUnmounted } from 'vue'
import type { PeerInfo } from '@/types/peer'
import { generateRandomName, getAvatarGradient, detectDeviceType, detectOs, detectBrowser } from '@/utils/names'
import { getPublicIpHash } from '@/services/ip'
import { supabaseService, type SupabaseSignalingHandlers } from '@/services/supabase'

export function normalizeRoomId(roomId: string): string {
  if (!roomId) return ''
  let cleaned = roomId.trim().toLowerCase()
  if (cleaned.startsWith('lan-')) {
    cleaned = cleaned.replace(/^lan-/, '')
  }
  return cleaned
}

export function usePeerManager(handlers: Partial<SupabaseSignalingHandlers> = {}) {
  const selfPeerId = 'peer_' + Math.random().toString(36).substring(2, 9)

  const selfPeer = reactive<PeerInfo>({
    peerId: selfPeerId,
    name: generateRandomName(),
    deviceType: detectDeviceType(),
    os: detectOs(),
    browser: detectBrowser(),
    joinedAt: Date.now(),
    avatarColor: getAvatarGradient(selfPeerId),
    isSelf: true,
  })

  const peers = ref<PeerInfo[]>([])
  const currentRoomId = ref<string>('')
  const defaultRoomId = ref<string>('')
  const isDefaultRoom = ref<boolean>(true)
  const connectionStatus = ref<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED')

  const parseRoomFromUrl = (): string | null => {
    const hash = window.location.hash
    const match = hash.match(/#\/?room\/([a-zA-Z0-9_-]+)/i) || hash.match(/#room=([a-zA-Z0-9_-]+)/i)
    if (match && match[1]) {
      return normalizeRoomId(match[1])
    }
    const searchParams = new URLSearchParams(window.location.search)
    const queryRoom = searchParams.get('room')
    if (queryRoom) {
      return normalizeRoomId(queryRoom)
    }
    return null
  }

  const initRoom = async () => {
    currentRoomId.value = '正在发现同频设备...'
    const ipRoom = await getPublicIpHash()
    defaultRoomId.value = normalizeRoomId(ipRoom)

    const urlRoom = parseRoomFromUrl()
    if (urlRoom) {
      const normalized = normalizeRoomId(urlRoom)
      currentRoomId.value = normalized
      isDefaultRoom.value = normalized === defaultRoomId.value
    } else {
      currentRoomId.value = defaultRoomId.value
      isDefaultRoom.value = true
      window.location.hash = `#/room/${defaultRoomId.value}`
    }

    await joinCurrentRoom()
  }

  const joinCurrentRoom = async () => {
    if (!currentRoomId.value || currentRoomId.value.includes('正在')) return

    await supabaseService.joinRoom(currentRoomId.value, selfPeer, {
      onPresenceSync: (updatedPeers) => {
        peers.value = updatedPeers
        handlers.onPresenceSync?.(updatedPeers)
      },
      onSignal: (signal) => {
        handlers.onSignal?.(signal)
      },
      onStatusChange: (status) => {
        connectionStatus.value = status
        handlers.onStatusChange?.(status)
      },
    })
  }

  const switchRoom = async (newRoom: string) => {
    const normalized = normalizeRoomId(newRoom)
    if (!normalized || normalized === currentRoomId.value) return

    currentRoomId.value = normalized
    isDefaultRoom.value = normalized === defaultRoomId.value
    window.location.hash = `#/room/${normalized}`
    await joinCurrentRoom()
  }

  const resetToDefaultRoom = async () => {
    if (!defaultRoomId.value) {
      const ipRoom = await getPublicIpHash()
      defaultRoomId.value = normalizeRoomId(ipRoom)
    }
    currentRoomId.value = defaultRoomId.value
    isDefaultRoom.value = true
    window.location.hash = `#/room/${defaultRoomId.value}`
    await joinCurrentRoom()
  }

  const updateSelfName = (newName: string) => {
    if (!newName.trim()) return
    selfPeer.name = newName.trim()
    supabaseService.updateSelfPeer(selfPeer)
  }

  const onHashChange = () => {
    const newRoom = parseRoomFromUrl()
    if (newRoom && newRoom !== currentRoomId.value) {
      currentRoomId.value = newRoom
      isDefaultRoom.value = newRoom === defaultRoomId.value
      joinCurrentRoom()
    }
  }

  const handleVisibilityOrOnline = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      if (currentRoomId.value && !currentRoomId.value.includes('正在')) {
        joinCurrentRoom()
      }
    }
  }

  onMounted(() => {
    window.addEventListener('hashchange', onHashChange)
    document.addEventListener('visibilitychange', handleVisibilityOrOnline)
    window.addEventListener('online', handleVisibilityOrOnline)
    initRoom()
  })

  onUnmounted(() => {
    window.removeEventListener('hashchange', onHashChange)
    document.removeEventListener('visibilitychange', handleVisibilityOrOnline)
    window.removeEventListener('online', handleVisibilityOrOnline)
    supabaseService.leaveRoom()
  })

  return {
    selfPeer,
    peers,
    currentRoomId,
    defaultRoomId,
    isDefaultRoom,
    connectionStatus,
    switchRoom,
    resetToDefaultRoom,
    updateSelfName,
    reconnect: joinCurrentRoom,
  }
}

import { ref, reactive, onMounted, onUnmounted } from 'vue'
import type { PeerInfo } from '@/types/peer'
import { generateRandomName, getAvatarGradient, detectDeviceType, detectOs, detectBrowser } from '@/utils/names'
import { getPublicIpHash } from '@/services/ip'
import { supabaseService, type SupabaseSignalingHandlers } from '@/services/supabase'

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
  const isDefaultRoom = ref<boolean>(true)
  const connectionStatus = ref<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('DISCONNECTED')

  const isLanRoom = (roomId: string) => {
    return roomId.startsWith('lan-') || roomId === 'lobby-global' || roomId.includes('正在')
  }

  const parseRoomFromUrl = (): string | null => {
    const hash = window.location.hash
    const match = hash.match(/#\/room\/([a-zA-Z0-9_-]+)/)
    if (match && match[1]) {
      return match[1]
    }
    return null
  }

  const initRoom = async () => {
    const urlRoom = parseRoomFromUrl()
    if (urlRoom) {
      currentRoomId.value = urlRoom
      isDefaultRoom.value = isLanRoom(urlRoom)
    } else {
      currentRoomId.value = '正在发现同频设备...'
      const ipRoom = await getPublicIpHash()
      currentRoomId.value = ipRoom
      isDefaultRoom.value = true
      window.location.hash = `#/room/${ipRoom}`
    }

    await joinCurrentRoom()
  }

  const joinCurrentRoom = async () => {
    if (!currentRoomId.value) return

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
    const trimmed = newRoom.trim()
    if (!trimmed || trimmed === currentRoomId.value) return

    currentRoomId.value = trimmed
    isDefaultRoom.value = isLanRoom(trimmed)
    window.location.hash = `#/room/${trimmed}`
    await joinCurrentRoom()
  }

  const resetToDefaultRoom = async () => {
    const ipRoom = await getPublicIpHash()
    currentRoomId.value = ipRoom
    isDefaultRoom.value = true
    window.location.hash = `#/room/${ipRoom}`
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
      isDefaultRoom.value = isLanRoom(newRoom)
      joinCurrentRoom()
    }
  }

  onMounted(() => {
    window.addEventListener('hashchange', onHashChange)
    initRoom()
  })

  onUnmounted(() => {
    window.removeEventListener('hashchange', onHashChange)
    supabaseService.leaveRoom()
  })

  return {
    selfPeer,
    peers,
    currentRoomId,
    isDefaultRoom,
    connectionStatus,
    switchRoom,
    resetToDefaultRoom,
    updateSelfName,
    reconnect: joinCurrentRoom,
  }
}

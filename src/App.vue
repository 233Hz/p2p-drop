<template>
  <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
    <!-- Unconfigured Supabase Alert Banner -->
    <div 
      v-if="!hasConfiguredSupabase"
      class="bg-indigo-600 dark:bg-indigo-700 text-white px-4 py-2.5 text-xs flex items-center justify-between shadow-md z-40"
    >
      <div class="flex items-center space-x-2 truncate">
        <span class="px-1.5 py-0.5 rounded bg-white/20 font-bold">提示</span>
        <span class="truncate">当前尚未配置 Supabase 信令凭据，需填写 Project URL 与 Anon Key 才能激活实时通信与设备发现。</span>
      </div>
      <button
        @click="isSettingsOpen = true"
        class="ml-3 px-3 py-1 bg-white text-indigo-700 font-bold rounded-lg text-xs hover:bg-indigo-50 transition active:scale-95 flex-shrink-0"
      >
        立即配置
      </button>
    </div>

    <!-- Header Navigation -->
    <HeaderBar
      :room-id="currentRoomId"
      :is-default-room="isDefaultRoom"
      :status="connectionStatus"
      :is-dark="isDark"
      :unread-count="textMessages.length"
      @open-qr="isQrOpen = true"
      @open-text="openTextModal(null)"
      @open-settings="isSettingsOpen = true"
      @open-room-modal="isQrOpen = true"
      @toggle-theme="toggleTheme"
    />

    <!-- Main Radar Area -->
    <main class="flex-1 flex flex-col relative">
      <RadarCanvas
        :self-peer="selfPeer"
        :peers="peers"
        :status="connectionStatus"
        @send-files="handleSendFiles"
        @send-text="openTextModal"
        @edit-name="isNameOpen = true"
        @open-qr="isQrOpen = true"
      />
    </main>

    <!-- Floating Dynamic Island -->
    <DynamicIsland
      :task="activeTask"
      @cancel="cancelActiveTask"
      @dismiss="activeTask = null"
    />

    <!-- Incoming Transfer Authorization Modal -->
    <TransferModal
      :request="incomingRequest"
      @accept="acceptTransfer"
      @reject="rejectTransfer"
    />

    <!-- Text / Clipboard Transfer Modal -->
    <TextModal
      :is-open="isTextOpen"
      :messages="textMessages"
      :target-peer="textTargetPeer"
      @close="isTextOpen = false"
      @send="handleSendText"
    />

    <!-- QR Code & Room Switcher Modal -->
    <QrCodeModal
      :is-open="isQrOpen"
      :room-id="currentRoomId"
      :is-default-room="isDefaultRoom"
      @close="isQrOpen = false"
      @switch-room="handleSwitchRoom"
      @reset-default="resetToDefaultRoom"
    />

    <!-- Settings Modal -->
    <SettingsModal
      :is-open="isSettingsOpen"
      :settings="settings"
      @close="isSettingsOpen = false"
      @save="handleSaveSettings"
    />

    <!-- Nickname Edit Modal -->
    <NameModal
      :is-open="isNameOpen"
      :current-name="selfPeer.name"
      @close="isNameOpen = false"
      @save="updateSelfName"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import HeaderBar from './components/HeaderBar.vue'
import RadarCanvas from './components/RadarCanvas.vue'
import DynamicIsland from './components/DynamicIsland.vue'
import TransferModal from './components/TransferModal.vue'
import TextModal from './components/TextModal.vue'
import QrCodeModal from './components/QrCodeModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import NameModal from './components/NameModal.vue'
import { useConfig } from './composables/useConfig'
import { usePeerManager } from './composables/usePeerManager'
import { useTransfer } from './composables/useTransfer'
import { supabaseService } from './services/supabase'
import type { PeerInfo } from './types/peer'
import type { AppSettings } from './types/config'

// Config & theme
const { settings, isDark, toggleTheme, saveSettings } = useConfig()

const hasConfiguredSupabase = computed(() => {
  return supabaseService.isConfigured(settings.supabaseUrl, settings.supabaseAnonKey)
})

// Modals
const isQrOpen = ref(false)
const isTextOpen = ref(false)
const isSettingsOpen = ref(false)
const isNameOpen = ref(false)
const textTargetPeer = ref<PeerInfo | null>(null)

// Callback hook for incoming signal
let onSignalCallback: ((sig: any) => void) | null = null

// Initialize peer manager with signaling delegation
const {
  selfPeer,
  peers,
  currentRoomId,
  isDefaultRoom,
  connectionStatus,
  switchRoom,
  resetToDefaultRoom,
  updateSelfName,
  reconnect,
} = usePeerManager({
  onSignal: (sig) => onSignalCallback?.(sig),
})

// Initialize transfer composable with selfPeer
const {
  activeTask,
  incomingRequest,
  textMessages,
  handleSignal,
  requestSendFiles,
  acceptTransfer,
  rejectTransfer,
  cancelActiveTask,
  sendTextMessage,
} = useTransfer(selfPeer, settings)

onSignalCallback = handleSignal

// Handlers
const handleSendFiles = (peer: PeerInfo, files: File[]) => {
  requestSendFiles(peer, files)
}

const openTextModal = (peer: PeerInfo | null) => {
  textTargetPeer.value = peer
  isTextOpen.value = true
}

const handleSendText = (text: string) => {
  if (textTargetPeer.value) {
    sendTextMessage(textTargetPeer.value, text)
  } else if (peers.value.length > 0) {
    // Send to first online peer or all
    peers.value.forEach((p) => sendTextMessage(p, text))
  }
}

const handleSwitchRoom = (roomId: string) => {
  switchRoom(roomId)
  isQrOpen.value = false
}

const handleSaveSettings = (newSettings: Partial<AppSettings>) => {
  Object.assign(settings, newSettings)
  saveSettings()
  if (newSettings.supabaseUrl && newSettings.supabaseAnonKey) {
    supabaseService.initClient(newSettings.supabaseUrl, newSettings.supabaseAnonKey)
    reconnect()
  }
}
</script>

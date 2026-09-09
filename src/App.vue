<template>
  <div class="h-[100dvh] min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
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
import { ref } from 'vue'
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
import type { PeerInfo } from './types/peer'
import type { AppSettings } from './types/config'

// Config & theme
const { settings, isDark, toggleTheme, saveSettings } = useConfig()

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
}
</script>

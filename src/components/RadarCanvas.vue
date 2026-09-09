<template>
  <div 
    class="relative w-full flex-1 flex items-center justify-center overflow-hidden select-none py-6 sm:py-12 bg-[#f5f5f7] dark:bg-[#1c1c1e] transition-colors duration-200"
    @click="onBackgroundClick"
    @dragover.prevent="onGlobalDragOver"
    @dragleave.prevent="onGlobalDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Radar Concentric Rings & Sweep Animation -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <!-- Outer ring 3 -->
      <div class="w-[320px] h-[320px] sm:w-[580px] sm:h-[580px] rounded-full border border-black/[0.06] dark:border-white/5 animate-pulse-slow"></div>
      <!-- Middle ring 2 -->
      <div class="absolute w-[220px] h-[220px] sm:w-[400px] sm:h-[400px] rounded-full border border-black/[0.08] dark:border-white/8"></div>
      <!-- Inner ring 1 -->
      <div class="absolute w-[130px] h-[130px] sm:w-[240px] sm:h-[240px] rounded-full border border-black/[0.1] dark:border-white/10"></div>

      <!-- Radar Light Cone (Animated Sweep) -->
      <div 
        v-if="status === 'CONNECTED'"
        class="absolute w-[320px] h-[320px] sm:w-[580px] sm:h-[580px] rounded-full opacity-40 dark:opacity-20 animate-radar-sweep origin-center pointer-events-none"
        style="background: conic-gradient(from 0deg, transparent 0deg, rgba(99, 102, 241, 0.15) 60deg, transparent 60.1deg);"
      ></div>
    </div>

    <!-- Center Node (Self) -->
    <div class="relative z-10" @click.stop>
      <PeerNode
        :peer="selfPeer"
        :is-self="true"
        @edit-name="$emit('edit-name')"
      />
    </div>

    <!-- Surrounding Peer Nodes -->
    <div 
      v-for="(peer, index) in peers" 
      :key="peer.peerId"
      class="absolute z-20 transition-all duration-500 ease-out"
      :style="getPeerPositionStyle(index, peers.length)"
      @click.stop
    >
      <PeerNode
        :peer="peer"
        :is-self="false"
        :is-selected="selectedPeerId === peer.peerId"
        @select="handleSelectPeer(peer)"
        @send-files="(p, files) => $emit('send-files', p, files)"
        @send-text="(p) => $emit('send-text', p)"
      />
    </div>

    <!-- Empty State Guide -->
    <div 
      v-if="peers.length === 0"
      class="absolute bottom-4 sm:bottom-8 w-[92%] max-w-sm p-4 md:p-6 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/8 dark:border-white/8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none transition-colors duration-200 z-20"
    >
      <h3 class="font-serif font-semibold text-[#1d1d1f] dark:text-white/95 text-sm sm:text-base">
        正在雷达侦测同频设备...
      </h3>
      <p class="text-xs text-[#1d1d1f]/70 dark:text-white/70 mt-1.5 leading-relaxed">
        同一 Wi-Fi 或局域网下的设备打开网页即可被发现，或点击右上角
        <span class="text-[#0a84ff] underline cursor-pointer" @click="$emit('open-qr')">扫码分享</span>
        让其他设备快速加入。
      </p>
    </div>

    <!-- Global Drag Overlay Hint -->
    <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div 
        v-if="isGlobalDragging"
        class="absolute inset-4 sm:inset-8 rounded-xl border border-[#0a84ff]/40 bg-white/95 dark:bg-[#1c1c1e]/90 backdrop-blur-md z-30 flex flex-col items-center justify-center pointer-events-none p-6 text-center shadow-lg dark:shadow-none"
      >
        <div class="w-12 h-12 rounded-lg bg-[#e5e5ea] dark:bg-[#3a3a3c] border border-black/8 dark:border-white/10 text-[#0a84ff] flex items-center justify-center mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>
        <h3 class="font-serif font-semibold text-[#1d1d1f] dark:text-white/95 text-base">
          {{ peers.length > 0 ? '将文件拖拽至目标设备卡片发起传输' : '拖放文件' }}
        </h3>
        <p class="text-xs text-[#1d1d1f]/70 dark:text-white/70 mt-1">
          {{ peers.length === 1 ? '松开将直接发给当前唯一的在线设备' : '支持多选文件与大文件直传' }}
        </p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PeerNode from './PeerNode.vue'
import type { PeerInfo } from '@/types/peer'

const props = defineProps<{
  selfPeer: PeerInfo
  peers: PeerInfo[]
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
}>()

const emit = defineEmits<{
  (e: 'send-files', peer: PeerInfo, files: File[]): void
  (e: 'send-text', peer: PeerInfo): void
  (e: 'edit-name'): void
  (e: 'open-qr'): void
}>()

const isGlobalDragging = ref(false)
const selectedPeerId = ref<string | null>(null)

const handleSelectPeer = (peer: PeerInfo) => {
  selectedPeerId.value = selectedPeerId.value === peer.peerId ? null : peer.peerId
}

const onBackgroundClick = () => {
  selectedPeerId.value = null
}

const getPeerPositionStyle = (index: number, total: number) => {
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  // Safe circular radius on both desktop (200px) and mobile (120px)
  const radius = isDesktop ? 200 : 120

  const angleStep = (2 * Math.PI) / total
  const angle = -Math.PI / 2 + index * angleStep

  const x = Math.round(Math.cos(angle) * radius)
  const y = Math.round(Math.sin(angle) * radius)

  return {
    transform: `translate(${x}px, ${y}px)`,
  }
}

const onGlobalDragOver = (e: DragEvent) => {
  if (e.dataTransfer?.types?.includes('Files')) {
    isGlobalDragging.value = true
  }
}

const onGlobalDragLeave = (e: DragEvent) => {
  if (!e.relatedTarget || (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
    return
  }
  isGlobalDragging.value = false
}

const onDrop = (e: DragEvent) => {
  isGlobalDragging.value = false
  if (props.peers.length === 1 && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    emit('send-files', props.peers[0], Array.from(e.dataTransfer.files))
  }
}
</script>

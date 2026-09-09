<template>
  <div 
    class="relative w-full flex-1 flex items-center justify-center overflow-hidden select-none py-6 sm:py-12"
    @dragover.prevent="onGlobalDragOver"
    @dragleave.prevent="onGlobalDragLeave"
    @drop.prevent="onGlobalDrop"
  >
    <!-- Radar Concentric Rings & Sweep Animation -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <!-- Outer ring 3 -->
      <div class="w-[320px] h-[320px] sm:w-[580px] sm:h-[580px] rounded-full border border-slate-200/60 dark:border-slate-800/60 animate-pulse-slow"></div>
      <!-- Middle ring 2 -->
      <div class="absolute w-[220px] h-[220px] sm:w-[400px] sm:h-[400px] rounded-full border border-slate-200/80 dark:border-slate-800/80"></div>
      <!-- Inner ring 1 -->
      <div class="absolute w-[130px] h-[130px] sm:w-[240px] sm:h-[240px] rounded-full border border-slate-300/80 dark:border-slate-700/80"></div>

      <!-- Radar Light Cone (Animated Sweep) -->
      <div 
        v-if="status === 'CONNECTED'"
        class="absolute w-[320px] h-[320px] sm:w-[580px] sm:h-[580px] rounded-full opacity-40 dark:opacity-20 animate-radar-sweep origin-center pointer-events-none"
        style="background: conic-gradient(from 0deg, transparent 0deg, rgba(99, 102, 241, 0.15) 60deg, transparent 60.1deg);"
      ></div>
    </div>

    <!-- Center Node (Self) -->
    <div class="relative z-10">
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
      class="absolute z-20 transition-all duration-700 ease-out"
      :style="getPeerPositionStyle(index, peers.length)"
    >
      <PeerNode
        :peer="peer"
        :is-self="false"
        @send-files="(p, files) => $emit('send-files', p, files)"
        @send-text="(p) => $emit('send-text', p)"
      />
    </div>

    <!-- Empty State Guide -->
    <div 
      v-if="peers.length === 0"
      class="absolute bottom-4 sm:bottom-8 w-[92%] max-w-sm px-4 py-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-lg text-center transition-all z-20"
    >
      <div class="flex items-center justify-center space-x-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
        <span class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
        <span>正在雷达侦测同频设备...</span>
      </div>
      <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
        当前网络房间：<span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">{{ displayRoomId }}</span>
      </p>
      <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
        同 Wi-Fi 自动发现；跨网络或未发现请点击下方扫码互联
      </p>
      <button
        @click="$emit('open-qr')"
        class="mt-2.5 w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center justify-center space-x-1.5"
      >
        <QrCode class="w-3.5 h-3.5" />
        <span>扫码或输入房间号互联</span>
      </button>
    </div>

    <!-- Global Drag Overlay Hint -->
    <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div 
        v-if="isGlobalDragging"
        class="absolute inset-3 sm:inset-10 rounded-3xl border-2 border-dashed border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center pointer-events-none"
      >
        <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-2.5 animate-bounce">
          <svg class="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>
        <p class="text-sm sm:text-base font-bold text-indigo-900 dark:text-indigo-100">
          {{ peers.length > 0 ? '将文件拖拽至目标设备头像发起传输' : '拖放文件' }}
        </p>
        <p class="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
          {{ peers.length === 1 ? '松开将直接发给当前唯一的在线设备' : '支持多选文件与大文件直传' }}
        </p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { QrCode } from 'lucide-vue-next'
import PeerNode from './PeerNode.vue'
import type { PeerInfo } from '@/types/peer'

const props = defineProps<{
  selfPeer: PeerInfo
  peers: PeerInfo[]
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  roomId?: string
}>()

const emit = defineEmits<{
  (e: 'send-files', peer: PeerInfo, files: File[]): void
  (e: 'send-text', peer: PeerInfo): void
  (e: 'edit-name'): void
  (e: 'open-qr'): void
}>()

const displayRoomId = computed(() => {
  if (!props.roomId) return '...'
  if (props.roomId.startsWith('lan-')) {
    return props.roomId.replace('lan-', '')
  }
  return props.roomId
})

const isGlobalDragging = ref(false)

const getPeerPositionStyle = (index: number, total: number) => {
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  // Safe radius: 110px on mobile fits within standard mobile screen widths without clipping
  const radius = isDesktop ? 200 : 110

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

const onGlobalDrop = (e: DragEvent) => {
  isGlobalDragging.value = false
  if (props.peers.length === 1 && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    emit('send-files', props.peers[0], Array.from(e.dataTransfer.files))
  }
}
</script>

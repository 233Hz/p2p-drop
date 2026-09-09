<template>
  <div 
    class="relative w-full flex-1 flex items-center justify-center overflow-hidden select-none py-12"
    @dragover.prevent="onGlobalDragOver"
    @dragleave.prevent="onGlobalDragLeave"
    @drop.prevent="onGlobalDrop"
  >
    <!-- Radar Concentric Rings & Sweep Animation -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <!-- Outer ring 3 -->
      <div class="w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full border border-slate-200/60 dark:border-slate-800/60 animate-pulse-slow"></div>
      <!-- Middle ring 2 -->
      <div class="absolute w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full border border-slate-200/80 dark:border-slate-800/80"></div>
      <!-- Inner ring 1 -->
      <div class="absolute w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] rounded-full border border-slate-300/80 dark:border-slate-700/80"></div>

      <!-- Radar Light Cone (Animated Sweep) -->
      <div 
        v-if="status === 'CONNECTED'"
        class="absolute w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full opacity-40 dark:opacity-20 animate-radar-sweep origin-center pointer-events-none"
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
      class="absolute bottom-8 sm:bottom-12 max-w-sm px-6 py-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm text-center transition-all z-10"
    >
      <p class="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
        正在雷达侦测同频设备...
      </p>
      <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        同一 Wi-Fi 或局域网下的设备打开此网页将自动被发现，或点击右上角
        <span class="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer" @click="$emit('open-qr')">扫码分享</span>
        让手机一键加入。
      </p>
    </div>

    <!-- Global Drag Overlay Hint -->
    <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div 
        v-if="isGlobalDragging"
        class="absolute inset-4 sm:inset-10 rounded-3xl border-2 border-dashed border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center pointer-events-none"
      >
        <div class="w-16 h-16 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-3 animate-bounce">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>
        <p class="text-base font-bold text-indigo-900 dark:text-indigo-100">
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

const getPeerPositionStyle = (index: number, total: number) => {
  // Determine orbit radius based on screen size (estimate 150px on mobile, 220px on desktop)
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  const radius = isDesktop ? 210 : 145

  // Distribute angles evenly starting from -90 deg (top)
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
  // If moving outside boundary
  if (!e.relatedTarget || (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
    return
  }
  isGlobalDragging.value = false
}

const onGlobalDrop = (e: DragEvent) => {
  isGlobalDragging.value = false
  if (props.peers.length === 1 && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    // If exactly one peer is online, drop anywhere on canvas sends to that peer
    emit('send-files', props.peers[0], Array.from(e.dataTransfer.files))
  }
}
</script>

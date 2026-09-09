<template>
  <div 
    class="flex flex-col items-center justify-center select-none transition-transform duration-200"
    :class="[
      isSelf ? 'z-10' : 'group cursor-pointer hover:scale-105 active:scale-95'
    ]"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Hidden File Input for clicking peer -->
    <input
      v-if="!isSelf"
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      @change="onFileSelected"
    />

    <!-- Avatar Circle Container -->
    <div class="relative flex items-center justify-center">
      <!-- Drag Over Glow Ring -->
      <div 
        v-if="isDragOver"
        class="absolute -inset-2.5 rounded-full bg-[#0a84ff]/30 ring-2 ring-[#0a84ff] transition-all"
      ></div>

      <!-- Circle Node -->
      <div 
        @click="handleClick"
        class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-md transition-all duration-200 border-2"
        :class="[
          peer.avatarColor ? `bg-gradient-to-tr ${peer.avatarColor}` : 'bg-gradient-to-tr from-blue-500 to-indigo-600',
          isDragOver 
            ? 'border-[#0a84ff] scale-105 shadow-lg shadow-[#0a84ff]/30' 
            : isSelf 
              ? 'border-white dark:border-white/20 shadow-sm' 
              : 'border-white/90 dark:border-white/10 shadow-md group-hover:shadow-lg'
        ]"
      >
        <!-- Device Icon -->
        <component 
          :is="deviceIcon" 
          class="w-7 h-7 sm:w-9 sm:h-9 text-white drop-shadow-sm" 
          stroke-width="1.8"
        />

        <!-- Self Badge -->
        <span 
          v-if="isSelf" 
          class="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0a84ff] text-white shadow-sm ring-2 ring-white dark:ring-[#1c1c1e]"
        >
          本机
        </span>
      </div>
    </div>

    <!-- Peer Name & Meta -->
    <div class="mt-2 text-center max-w-[120px] sm:max-w-[150px]">
      <div class="flex items-center justify-center space-x-1">
        <span class="font-serif font-semibold text-xs sm:text-sm text-[#1d1d1f] dark:text-white/95 truncate">
          {{ peer.name }}
        </span>
        <button 
          v-if="isSelf" 
          @click.stop="$emit('edit-name')" 
          class="text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#0a84ff] p-0.5 rounded transition-colors duration-200"
          title="修改昵称"
        >
          <Edit2 class="w-3 h-3" />
        </button>
      </div>

      <div class="flex items-center justify-center space-x-1 mt-0.5 text-[10px] font-mono text-[#1d1d1f]/50 dark:text-white/40 capitalize">
        <span>{{ peer.os }}</span>
        <span>·</span>
        <span>{{ peer.browser }}</span>
      </div>

      <!-- Quick Action Buttons for Remote Peer -->
      <div 
        v-if="!isSelf"
        class="flex items-center space-x-1 mt-1.5 justify-center"
      >
        <button
          @click.stop="triggerFilePicker"
          class="px-2 py-0.5 rounded-full bg-[#e5e5ea] dark:bg-[#3a3a3c] hover:bg-black/10 dark:hover:bg-white/10 text-[#1d1d1f]/80 dark:text-white/90 text-[11px] font-medium border border-black/8 dark:border-white/8 transition-colors duration-200 flex items-center space-x-1 shadow-sm"
          title="发送文件"
        >
          <Upload class="w-2.5 h-2.5" />
          <span>发文件</span>
        </button>
        <button
          @click.stop="$emit('send-text', peer)"
          class="px-2 py-0.5 rounded-full bg-[#e5e5ea] dark:bg-[#3a3a3c] hover:bg-black/10 dark:hover:bg-white/10 text-[#1d1d1f]/80 dark:text-white/90 text-[11px] font-medium border border-black/8 dark:border-white/8 transition-colors duration-200 flex items-center space-x-1 shadow-sm"
          title="发送文字"
        >
          <MessageSquare class="w-2.5 h-2.5" />
          <span>发消息</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Laptop, Smartphone, Tablet, Upload, MessageSquare, Edit2 } from 'lucide-vue-next'
import type { PeerInfo } from '@/types/peer'

const props = defineProps<{
  peer: PeerInfo
  isSelf?: boolean
}>()

const emit = defineEmits<{
  (e: 'send-files', peer: PeerInfo, files: File[]): void
  (e: 'send-text', peer: PeerInfo): void
  (e: 'edit-name'): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const deviceIcon = computed(() => {
  switch (props.peer.deviceType) {
    case 'mobile':
      return Smartphone
    case 'tablet':
      return Tablet
    default:
      return Laptop
  }
})

const handleClick = () => {
  if (!props.isSelf) {
    triggerFilePicker()
  }
}

const triggerFilePicker = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('send-files', props.peer, Array.from(target.files))
  }
}

const onDragOver = () => {
  if (!props.isSelf) {
    isDragOver.value = true
  }
}

const onDragLeave = () => {
  isDragOver.value = false
}

const onDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (props.isSelf) return

  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    emit('send-files', props.peer, Array.from(event.dataTransfer.files))
  }
}
</script>

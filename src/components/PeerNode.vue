<template>
  <div 
    class="flex flex-col items-center justify-center select-none transition-all duration-300"
    :class="[
      isSelf ? 'scale-100 z-10' : 'group cursor-pointer hover:scale-105 active:scale-95'
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

    <!-- Avatar Container -->
    <div class="relative flex items-center justify-center">
      <!-- Drag Over Glow Ring -->
      <div 
        v-if="isDragOver"
        class="absolute -inset-3 rounded-full bg-indigo-500/30 dark:bg-indigo-400/30 animate-ping"
      ></div>

      <!-- Pulse Effect -->
      <div 
        v-if="!isSelf"
        class="absolute -inset-1 rounded-full bg-indigo-500/15 dark:bg-indigo-400/15 blur-sm group-hover:bg-indigo-500/30 transition-all"
      ></div>

      <!-- Circle Node -->
      <div 
        @click="handleClick"
        class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 border-2"
        :class="[
          peer.avatarColor ? `bg-gradient-to-tr ${peer.avatarColor}` : 'bg-gradient-to-tr from-indigo-500 to-purple-600',
          isDragOver 
            ? 'border-indigo-400 scale-110 shadow-indigo-500/40' 
            : isSelf 
              ? 'border-white/80 dark:border-slate-800 shadow-indigo-500/20' 
              : 'border-white/90 dark:border-slate-700/80 shadow-slate-300/40 dark:shadow-black/50'
        ]"
      >
        <!-- Device Icon -->
        <component 
          :is="deviceIcon" 
          class="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow" 
          stroke-width="1.8"
        />

        <!-- Self Badge -->
        <span 
          v-if="isSelf" 
          class="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
        >
          我
        </span>
      </div>

      <!-- Quick Action Buttons on hover (Remote Only) -->
      <div 
        v-if="!isSelf"
        class="absolute -bottom-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0"
      >
        <button
          @click.stop="triggerFilePicker"
          class="p-1 rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700 transition text-[11px]"
          title="发送文件"
        >
          <Upload class="w-3.5 h-3.5" />
        </button>
        <button
          @click.stop="$emit('send-text', peer)"
          class="p-1 rounded-full bg-slate-800 dark:bg-slate-700 text-white shadow hover:bg-slate-900 transition text-[11px]"
          title="发送文字"
        >
          <MessageSquare class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Peer Name & Meta -->
    <div class="mt-2.5 text-center max-w-[120px] sm:max-w-[150px]">
      <div class="flex items-center justify-center space-x-1">
        <span class="text-xs sm:text-sm font-semibold truncate text-slate-800 dark:text-slate-100">
          {{ peer.name }}
        </span>
        <button 
          v-if="isSelf" 
          @click.stop="$emit('edit-name')" 
          class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 rounded"
          title="修改昵称"
        >
          <Edit2 class="w-3 h-3" />
        </button>
      </div>

      <div class="flex items-center justify-center space-x-1 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 capitalize">
        <span>{{ peer.os }}</span>
        <span>·</span>
        <span>{{ peer.browser }}</span>
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

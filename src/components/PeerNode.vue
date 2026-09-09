<template>
  <div 
    class="flex flex-col items-center justify-center select-none transition-colors duration-200"
    :class="[
      isSelf ? 'z-10' : 'group cursor-pointer'
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

    <!-- Device Card Container -->
    <div 
      @click="handleClick"
      class="relative p-3 rounded-xl bg-[#2c2c2e] border transition-colors duration-200 flex flex-col items-center min-w-[115px] sm:min-w-[135px]"
      :class="[
        isDragOver 
          ? 'border-[#0a84ff] bg-[#3a3a3c]' 
          : isSelf 
            ? 'border-white/12 bg-[#2c2c2e]' 
            : 'border-white/10 group-hover:border-white/20 group-hover:bg-[#3a3a3c]/60'
      ]"
    >
      <!-- Self Badge -->
      <div v-if="isSelf" class="absolute top-2 right-2">
        <span class="px-1 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/80 border border-white/8">
          本机
        </span>
      </div>

      <!-- Device Icon Container -->
      <div class="w-11 h-11 rounded-lg bg-[#3a3a3c] border border-white/8 flex items-center justify-center text-white/90 mb-2">
        <component 
          :is="deviceIcon" 
          class="w-5 h-5 text-white/90" 
          stroke-width="1.8"
        />
      </div>

      <!-- Peer Name -->
      <div class="flex items-center space-x-1 max-w-[100px] sm:max-w-[120px] truncate">
        <span class="font-serif font-semibold text-xs text-white/95 truncate">
          {{ peer.name }}
        </span>
        <button 
          v-if="isSelf" 
          @click.stop="$emit('edit-name')" 
          class="text-white/40 hover:text-white/90 p-0.5 rounded transition-colors duration-200"
          title="修改昵称"
        >
          <Edit2 class="w-3 h-3" />
        </button>
      </div>

      <!-- OS & Browser Meta -->
      <div class="text-[10px] font-mono text-white/40 mt-0.5 capitalize truncate max-w-[110px]">
        {{ peer.os }} · {{ peer.browser }}
      </div>

      <!-- Quick Action Buttons for Remote Peer -->
      <div 
        v-if="!isSelf"
        class="flex items-center space-x-1.5 mt-2 pt-2 border-t border-white/8 w-full justify-center"
      >
        <button
          @click.stop="triggerFilePicker"
          class="px-2 py-1 rounded-lg bg-[#3a3a3c] hover:bg-white/10 text-white/80 hover:text-white/95 text-[11px] border border-white/8 transition-colors duration-200 flex items-center space-x-1"
          title="发送文件"
        >
          <Upload class="w-3 h-3" />
          <span class="hidden sm:inline">文件</span>
        </button>
        <button
          @click.stop="$emit('send-text', peer)"
          class="px-2 py-1 rounded-lg bg-[#3a3a3c] hover:bg-white/10 text-white/80 hover:text-white/95 text-[11px] border border-white/8 transition-colors duration-200 flex items-center space-x-1"
          title="发送文字"
        >
          <MessageSquare class="w-3 h-3" />
          <span class="hidden sm:inline">文本</span>
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

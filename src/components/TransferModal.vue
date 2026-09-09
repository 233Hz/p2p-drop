<template>
  <div 
    v-if="request"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md"
  >
    <div class="w-full max-w-md bg-white dark:bg-[#2c2c2e] rounded-xl border border-black/8 dark:border-white/10 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <!-- Sender Header -->
      <div class="flex items-center space-x-3 mb-5">
        <div class="w-10 h-10 rounded-lg bg-[#e5e5ea] dark:bg-[#3a3a3c] border border-black/8 dark:border-white/8 flex items-center justify-center text-[#1d1d1f] dark:text-white/90 flex-shrink-0">
          <component :is="deviceIcon" class="w-5 h-5 text-[#1d1d1f] dark:text-white/90" />
        </div>
        <div>
          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#1d1d1f]/80 dark:text-white/80 border border-black/8 dark:border-white/8">
            收到传输请求
          </span>
          <h3 class="font-serif font-semibold text-[#1d1d1f] dark:text-white/95 text-base mt-1">
            {{ request.fromPeer.name }}
          </h3>
          <p class="text-xs font-mono text-[#1d1d1f]/40 dark:text-white/40 capitalize">
            {{ request.fromPeer.os }} · {{ request.fromPeer.browser }}
          </p>
        </div>
      </div>

      <!-- File List Preview -->
      <div class="rounded-lg bg-[#f5f5f7] dark:bg-[#1c1c1e] p-3.5 border border-black/8 dark:border-white/8 mb-5">
        <div class="flex items-center justify-between text-xs font-medium text-[#1d1d1f]/50 dark:text-white/40 pb-2 border-b border-black/8 dark:border-white/8">
          <span>拟接收 {{ request.files.length }} 个文件</span>
          <span class="font-mono text-[#1d1d1f] dark:text-white/90 font-semibold">总大小 {{ totalFormattedSize }}</span>
        </div>

        <div class="max-h-40 overflow-y-auto mt-2 space-y-1.5 pr-1 custom-scrollbar">
          <div 
            v-for="(f, i) in request.files" 
            :key="f.id || i"
            class="flex items-center justify-between text-xs py-1"
          >
            <div class="flex items-center space-x-2 truncate max-w-[240px]">
              <FileText class="w-3.5 h-3.5 text-[#0a84ff] flex-shrink-0" />
              <span class="truncate text-[#1d1d1f] dark:text-white/90 font-medium" :title="f.name">
                {{ f.name }}
              </span>
            </div>
            <span class="text-[11px] text-[#1d1d1f]/50 dark:text-white/40 font-mono flex-shrink-0">
              {{ formatBytes(f.size) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Progressive Storage Notice -->
      <div v-if="hasLargeFile" class="text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-[#3a3a3c]/60 border border-amber-400/40 dark:border-amber-500/30 px-3 py-2 rounded-lg mb-5 flex items-start space-x-2">
        <Info class="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" />
        <span>包含大文件传输，点击“同意”后可能弹出系统文件保存位置选择，边收边存保护内存。</span>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-3">
        <button
          @click="$emit('reject')"
          class="w-full py-2 px-4 rounded-lg bg-[#e5e5ea] dark:bg-[#3a3a3c] border border-black/8 dark:border-white/8 text-[#1d1d1f]/70 dark:text-white/70 font-medium text-xs hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-200"
        >
          拒绝
        </button>
        <button
          @click="$emit('accept')"
          class="w-full py-2 px-4 rounded-lg bg-[#0a84ff] hover:bg-[#0071e3] text-white font-medium text-xs transition-colors duration-200 flex items-center justify-center space-x-1.5"
        >
          <Check class="w-3.5 h-3.5 text-white" />
          <span>同意接收</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Laptop, Smartphone, Tablet, FileText, Info, Check } from 'lucide-vue-next'
import type { IncomingRequest } from '@/composables/useTransfer'
import { formatBytes } from '@/utils/format'

const props = defineProps<{
  request: IncomingRequest | null
}>()

defineEmits<{
  (e: 'accept'): void
  (e: 'reject'): void
}>()

const deviceIcon = computed(() => {
  if (!props.request) return Laptop
  switch (props.request.fromPeer.deviceType) {
    case 'mobile':
      return Smartphone
    case 'tablet':
      return Tablet
    default:
      return Laptop
  }
})

const totalFormattedSize = computed(() => {
  if (!props.request) return '0 B'
  const total = props.request.files.reduce((acc, f) => acc + f.size, 0)
  return formatBytes(total)
})

const hasLargeFile = computed(() => {
  if (!props.request) return false
  return props.request.files.some((f) => f.size > 200 * 1024 * 1024)
})
</script>

<template>
  <div 
    v-if="request"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
  >
    <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transform transition-all animate-scale-up">
      <!-- Sender Header -->
      <div class="flex items-center space-x-3 mb-5">
        <div 
          class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md font-bold"
          :class="request.fromPeer.avatarColor ? `bg-gradient-to-tr ${request.fromPeer.avatarColor}` : 'bg-gradient-to-tr from-indigo-500 to-purple-600'"
        >
          <component :is="deviceIcon" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            收到传输请求
          </span>
          <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {{ request.fromPeer.name }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 capitalize">
            {{ request.fromPeer.os }} · {{ request.fromPeer.browser }}
          </p>
        </div>
      </div>

      <!-- File List Preview -->
      <div class="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/70 dark:border-slate-700/60 mb-5">
        <div class="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
          <span>拟接收 {{ request.files.length }} 个文件</span>
          <span class="font-mono text-slate-700 dark:text-slate-300 font-semibold">总大小 {{ totalFormattedSize }}</span>
        </div>

        <div class="max-h-40 overflow-y-auto mt-2 space-y-2 pr-1 custom-scrollbar">
          <div 
            v-for="(f, i) in request.files" 
            :key="f.id || i"
            class="flex items-center justify-between text-xs py-1"
          >
            <div class="flex items-center space-x-2 truncate max-w-[240px]">
              <FileText class="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span class="truncate text-slate-700 dark:text-slate-200 font-medium" :title="f.name">
                {{ f.name }}
              </span>
            </div>
            <span class="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0">
              {{ formatBytes(f.size) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Progressive Storage Notice -->
      <div v-if="hasLargeFile" class="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-xl mb-5 flex items-start space-x-2">
        <Info class="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>包含大文件传输，点击“同意”后可能弹出系统文件保存位置选择，边收边存保护内存。</span>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-3">
        <button
          @click="$emit('reject')"
          class="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
        >
          拒绝
        </button>
        <button
          @click="$emit('accept')"
          class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center justify-center space-x-1.5"
        >
          <Check class="w-4 h-4" />
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

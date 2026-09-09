<template>
  <header class="w-full px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
    <!-- Brand -->
    <div class="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-black">
        <svg class="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" stroke-dasharray="4 4"/>
          <path d="m16 12-4-4-4 4M12 8v8"/>
        </svg>
      </div>
      <div>
        <h1 class="text-sm sm:text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-700 dark:from-white dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent">
          P2P Drop
        </h1>
        <p class="text-[10px] text-slate-500 dark:text-slate-400 hidden md:block">免安装 · 跨设备直连快传</p>
      </div>
    </div>

    <!-- Room / Status Indicator -->
    <div class="flex items-center px-1 sm:px-2 flex-shrink min-w-0">
      <div 
        @click="$emit('open-room-modal')"
        class="group flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-[11px] sm:text-xs font-medium cursor-pointer transition-all border border-slate-200/60 dark:border-slate-700/60 shadow-sm max-w-[145px] sm:max-w-none whitespace-nowrap"
        title="点击切换房间或扫码"
      >
        <span class="relative flex h-2 w-2 flex-shrink-0">
          <span 
            v-if="status === 'CONNECTED'" 
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
          ></span>
          <span 
            class="relative inline-flex rounded-full h-2 w-2"
            :class="{
              'bg-emerald-500': status === 'CONNECTED',
              'bg-amber-500': status === 'CONNECTING',
              'bg-rose-500': status === 'DISCONNECTED' || status === 'ERROR'
            }"
          ></span>
        </span>
        <span class="text-slate-700 dark:text-slate-300 font-mono truncate">
          {{ isDefaultRoom ? '局域网络' : '房间' }}: {{ displayRoomId }}
        </span>
        <span class="text-[10px] text-indigo-600 dark:text-indigo-400 underline font-sans ml-0.5 group-hover:opacity-100 opacity-75 hidden sm:inline-block flex-shrink-0">
          换房
        </span>
      </div>
    </div>

    <!-- Toolbar Icons -->
    <div class="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
      <!-- QR Code -->
      <button
        @click="$emit('open-qr')"
        class="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90"
        title="扫码加入此房间"
      >
        <QrCode class="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <!-- Text Messages -->
      <button
        @click="$emit('open-text')"
        class="relative p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90"
        title="剪贴板与文本快传"
      >
        <MessageSquare class="w-4 h-4 sm:w-5 sm:h-5" />
        <span 
          v-if="unreadCount > 0"
          class="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse"
        ></span>
      </button>

      <!-- Theme Switch -->
      <button
        @click="$emit('toggle-theme')"
        class="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90"
        :title="isDark ? '切换亮色模式' : '切换暗黑模式'"
      >
        <Sun v-if="isDark" class="w-4 h-4 sm:w-5 sm:h-5" />
        <Moon v-else class="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <!-- Settings -->
      <button
        @click="$emit('open-settings')"
        class="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90"
        title="设置"
      >
        <Settings class="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { QrCode, MessageSquare, Sun, Moon, Settings } from 'lucide-vue-next'

const props = defineProps<{
  roomId: string
  isDefaultRoom: boolean
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  isDark: boolean
  unreadCount: number
}>()

defineEmits<{
  (e: 'open-qr'): void
  (e: 'open-text'): void
  (e: 'open-settings'): void
  (e: 'open-room-modal'): void
  (e: 'toggle-theme'): void
}>()

const displayRoomId = computed(() => {
  if (!props.roomId) return '...'
  if (props.roomId.startsWith('lan-')) {
    return props.roomId.replace('lan-', '')
  }
  return props.roomId
})
</script>

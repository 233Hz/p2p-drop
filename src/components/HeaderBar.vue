<template>
  <header class="w-full px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between border-b border-black/8 dark:border-white/8 bg-[#f5f5f7]/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl sticky top-0 z-30 transition-colors duration-200">
    <!-- Brand -->
    <div class="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
      <div class="w-8 h-8 rounded-lg bg-[#e5e5ea] dark:bg-[#3a3a3c] border border-black/8 dark:border-white/10 flex items-center justify-center text-[#1d1d1f] dark:text-white/90">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" stroke-dasharray="3 3"/>
          <path d="m16 12-4-4-4 4M12 8v8"/>
        </svg>
      </div>
      <div>
        <h1 class="font-serif font-semibold text-[#1d1d1f] dark:text-white/95 text-sm sm:text-base leading-tight">
          P2P Drop
        </h1>
        <p class="text-[10px] sm:text-[11px] text-[#1d1d1f]/40 dark:text-white/40 font-sans hidden md:block">
          免安装 · 局域网直连快传
        </p>
      </div>
    </div>

    <!-- Room / Status Indicator -->
    <div class="flex items-center px-1 sm:px-2 flex-shrink min-w-0 max-w-[130px] sm:max-w-none">
      <div 
        @click="$emit('open-room-modal')"
        class="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] hover:bg-black/5 dark:hover:bg-white/8 text-xs font-medium cursor-pointer transition-colors duration-200 border border-black/8 dark:border-white/10 truncate"
        title="点击切换房间或扫码"
      >
        <span 
          class="w-2 h-2 rounded-sm flex-shrink-0"
          :class="{
            'bg-[#0a84ff]': status === 'CONNECTED',
            'bg-amber-400': status === 'CONNECTING',
            'bg-rose-400': status === 'DISCONNECTED' || status === 'ERROR'
          }"
        ></span>
        <span class="text-[#1d1d1f]/80 dark:text-white/80 font-mono text-xs truncate">
          <span class="hidden sm:inline">{{ isDefaultRoom ? '局域网络: ' : '房间: ' }}</span><span class="sm:hidden">{{ isDefaultRoom ? '局域网 ' : '' }}</span>{{ displayRoomId }}
        </span>
        <span class="text-[10px] text-[#0a84ff] font-sans ml-0.5 opacity-90 hidden sm:inline-block flex-shrink-0">
          换房
        </span>
      </div>
    </div>

    <!-- Toolbar Icons -->
    <div class="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0">
      <!-- QR Code -->
      <button
        @click="$emit('open-qr')"
        class="p-1.5 sm:p-2 rounded-lg text-[#1d1d1f]/70 dark:text-white/70 hover:text-[#1d1d1f] dark:hover:text-white/95 hover:bg-black/5 dark:hover:bg-white/8 transition-colors duration-200"
        title="扫码加入此房间"
      >
        <QrCode class="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      <!-- Text Messages -->
      <button
        @click="$emit('open-text')"
        class="relative p-1.5 sm:p-2 rounded-lg text-[#1d1d1f]/70 dark:text-white/70 hover:text-[#1d1d1f] dark:hover:text-white/95 hover:bg-black/5 dark:hover:bg-white/8 transition-colors duration-200"
        title="剪贴板与文本快传"
      >
        <MessageSquare class="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        <span 
          v-if="unreadCount > 0"
          class="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-sm bg-[#0a84ff]"
        ></span>
      </button>

      <!-- Theme Switch -->
      <button
        @click="$emit('toggle-theme')"
        class="p-1.5 sm:p-2 rounded-lg text-[#1d1d1f]/70 dark:text-white/70 hover:text-[#1d1d1f] dark:hover:text-white/95 hover:bg-black/5 dark:hover:bg-white/8 transition-colors duration-200"
        :title="isDark ? '切换亮色模式' : '切换暗黑模式'"
      >
        <Sun v-if="isDark" class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
        <Moon v-else class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#1d1d1f]" />
      </button>

      <!-- Settings -->
      <button
        @click="$emit('open-settings')"
        class="p-1.5 sm:p-2 rounded-lg text-[#1d1d1f]/70 dark:text-white/70 hover:text-[#1d1d1f] dark:hover:text-white/95 hover:bg-black/5 dark:hover:bg-white/8 transition-colors duration-200"
        title="设置"
      >
        <Settings class="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { QrCode, MessageSquare, Settings, Sun, Moon } from 'lucide-vue-next'

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

<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
  >
    <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center animate-scale-up">
      <!-- Close Button -->
      <div class="w-full flex justify-between items-center mb-3">
        <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
          手机扫码或分享房间
        </h3>
        <button 
          @click="$emit('close')"
          class="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- QR Code Canvas / Image -->
      <div class="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 mb-4">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="Room QR Code" class="w-48 h-48 rounded-lg" />
        <div v-else class="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
          生成二维码中...
        </div>
      </div>

      <p class="text-xs text-slate-500 dark:text-slate-400 mb-4 px-2">
        使用微信、浏览器或相机扫描二维码，即可让手机与电脑直连互传
      </p>

      <!-- Room Code Switcher -->
      <div class="w-full rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-slate-700/60 mb-4 text-left">
        <label class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
          当前房间码 / 自定义房间
        </label>
        <div class="flex items-center space-x-2">
          <input
            v-model="roomInput"
            type="text"
            placeholder="输入房间号(如 6 位数字)"
            class="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @keydown.enter="handleSwitchRoom"
          />
          <button
            @click="handleSwitchRoom"
            class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition active:scale-95 flex-shrink-0"
          >
            切换
          </button>
        </div>

        <div v-if="!isDefaultRoom" class="mt-2 flex items-center justify-between">
          <span class="text-[10px] text-amber-500">当前处于私密房间</span>
          <button 
            @click="$emit('reset-default')" 
            class="text-[10px] text-indigo-500 hover:underline"
          >
            返回局域网广播大厅
          </button>
        </div>
      </div>

      <!-- Copy Link Button -->
      <button
        @click="copyShareLink"
        class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition active:scale-95 flex items-center justify-center space-x-2"
      >
        <Check v-if="copied" class="w-4 h-4 text-emerald-500" />
        <Share2 v-else class="w-4 h-4" />
        <span>{{ copied ? '链接已复制到剪贴板' : '复制房间直达链接' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import { X, Share2, Check } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  roomId: string
  isDefaultRoom: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'switch-room', roomId: string): void
  (e: 'reset-default'): void
}>()

const qrDataUrl = ref('')
const roomInput = ref(props.roomId)
const copied = ref(false)

watch(
  () => props.roomId,
  (newRoom) => {
    roomInput.value = newRoom
    generateQr()
  }
)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      roomInput.value = props.roomId
      generateQr()
    }
  }
)

const generateQr = async () => {
  if (typeof window === 'undefined') return
  try {
    const url = window.location.href
    qrDataUrl.value = await QRCode.toDataURL(url, {
      margin: 1,
      width: 280,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    })
  } catch (err) {
    console.error('QR code generation failed', err)
  }
}

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
  } catch {}
}

const handleSwitchRoom = () => {
  if (!roomInput.value.trim()) return
  emit('switch-room', roomInput.value.trim())
}
</script>

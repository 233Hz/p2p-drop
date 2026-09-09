<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
  >
    <div class="w-full max-w-sm bg-[#2c2c2e] rounded-xl border border-white/10 p-5 sm:p-6 flex flex-col items-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <!-- Close Button -->
      <div class="w-full flex justify-between items-center mb-3">
        <h3 class="font-serif font-semibold text-white/95 text-base">
          手机扫码或分享房间
        </h3>
        <button 
          @click="$emit('close')"
          class="p-1.5 rounded-lg text-white/40 hover:text-white/90 hover:bg-white/8 transition-colors duration-200"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- QR Code Canvas / Image -->
      <div class="p-2.5 bg-white rounded-lg border border-white/15 mb-4 flex items-center justify-center">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="Room QR Code" class="w-44 h-44 rounded-md" />
        <div v-else class="w-44 h-44 flex items-center justify-center text-xs text-black/50">
          生成二维码中...
        </div>
      </div>

      <p class="text-xs text-white/40 font-sans mb-4 px-1 leading-relaxed">
        使用微信、浏览器或相机扫描二维码，即可让手机与电脑直连互传
      </p>

      <!-- Room Code Switcher -->
      <div class="w-full rounded-lg bg-[#1c1c1e] p-3 border border-white/8 mb-4 text-left">
        <label class="text-[11px] font-mono text-white/60 mb-1.5 block">
          当前房间码 / 自定义房间
        </label>
        <div class="flex items-center space-x-2">
          <input
            v-model="roomInput"
            type="text"
            placeholder="输入房间号(如 6 位数字)"
            class="flex-1 px-3 py-1.5 text-xs font-mono bg-[#2c2c2e] border border-white/10 rounded-lg text-white/90 placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors duration-200"
            @keydown.enter="handleSwitchRoom"
          />
          <button
            @click="handleSwitchRoom"
            class="px-3 py-1.5 bg-[#3a3a3c] hover:bg-white/10 text-white/90 rounded-lg text-xs font-medium border border-white/8 transition-colors duration-200 flex-shrink-0"
          >
            切换
          </button>
        </div>

        <div v-if="!isDefaultRoom" class="mt-2 flex items-center justify-between">
          <span class="text-[10px] font-mono text-[#ff9f0a]">当前处于私密房间</span>
          <button 
            @click="$emit('reset-default')" 
            class="text-[10px] text-[#0a84ff] hover:underline"
          >
            返回局域网广播大厅
          </button>
        </div>
      </div>

      <!-- Copy Link Button -->
      <button
        @click="copyShareLink"
        class="w-full py-2 rounded-lg bg-[#3a3a3c] hover:bg-white/10 text-white/90 border border-white/8 font-medium text-xs transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        <Check v-if="copied" class="w-4 h-4 text-[#30d158]" />
        <Share2 v-else class="w-4 h-4 text-white/70" />
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
        dark: '#1c1c1e',
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

<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
  >
    <div class="w-full max-w-lg bg-[#2c2c2e] rounded-xl border border-white/10 p-5 flex flex-col max-h-[85vh] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3.5 border-b border-white/8">
        <div class="flex items-center space-x-2.5">
          <div class="p-2 rounded-lg bg-[#3a3a3c] border border-white/8 text-white/90">
            <MessageSquare class="w-4 h-4" />
          </div>
          <div>
            <h3 class="font-serif font-semibold text-white/95 text-base">
              剪贴板与文本快传
            </h3>
            <p class="text-xs text-white/40 font-sans">
              {{ targetPeer ? `发送至 ${targetPeer.name}` : '向房间内所有在线设备广播消息' }}
            </p>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="p-1.5 rounded-lg text-white/40 hover:text-white/90 hover:bg-white/8 transition-colors duration-200"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Messages History List -->
      <div class="flex-1 overflow-y-auto py-3.5 space-y-2.5 min-h-[160px] custom-scrollbar">
        <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-white/40 py-8 text-center">
          <Clipboard class="w-8 h-8 stroke-1 text-white/20 mb-2" />
          <p class="text-xs">暂无文本消息，可粘贴网址或文本立即互传</p>
        </div>

        <div 
          v-for="msg in messages" 
          :key="msg.id"
          class="p-3 rounded-lg bg-[#1c1c1e] border border-white/8 transition-colors duration-200"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-serif font-semibold text-xs text-white/95">
              {{ msg.fromPeerName }}
            </span>
            <div class="flex items-center space-x-2">
              <span class="text-[10px] text-white/40 font-mono">
                {{ formatTime(msg.timestamp) }}
              </span>
              <button
                @click="copyText(msg.text, msg.id)"
                class="p-1 rounded-md text-white/40 hover:text-white/90 hover:bg-white/8 transition-colors duration-200 text-xs flex items-center space-x-1"
                title="复制内容"
              >
                <Check v-if="copiedId === msg.id" class="w-3 h-3 text-emerald-400" />
                <Copy v-else class="w-3 h-3" />
                <span class="text-[10px]" v-if="copiedId === msg.id">已复制</span>
              </button>
            </div>
          </div>
          <p class="text-xs text-white/80 font-mono whitespace-pre-wrap break-words select-all leading-relaxed">
            {{ msg.text }}
          </p>
        </div>
      </div>

      <!-- Input Area -->
      <div class="pt-3 border-t border-white/8">
        <div class="relative">
          <textarea
            v-model="inputText"
            rows="3"
            placeholder="输入要发送的文本、代码片段或链接..."
            class="w-full p-3 pr-20 text-xs rounded-lg bg-[#1c1c1e] border border-white/10 text-white/90 placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors duration-200 font-mono resize-none"
            @keydown.enter.exact.prevent="handleSend"
          ></textarea>

          <div class="absolute right-2.5 bottom-3 flex items-center space-x-1.5">
            <button
              type="button"
              @click="pasteClipboard"
              class="p-1.5 rounded-lg bg-[#3a3a3c] hover:bg-white/10 text-white/70 hover:text-white/90 border border-white/8 transition-colors duration-200 text-xs"
              title="粘贴剪贴板"
            >
              <ClipboardPaste class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              @click="handleSend"
              :disabled="!inputText.trim()"
              class="px-3 py-1.5 rounded-lg bg-[#3a3a3c] hover:bg-white/10 disabled:opacity-40 text-white/90 text-xs font-medium border border-white/10 transition-colors duration-200 flex items-center space-x-1"
            >
              <span>发送</span>
              <Send class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MessageSquare, X, Copy, Check, Clipboard, ClipboardPaste, Send } from 'lucide-vue-next'
import type { TextItem } from '@/types/transfer'
import type { PeerInfo } from '@/types/peer'

defineProps<{
  isOpen: boolean
  messages: TextItem[]
  targetPeer?: PeerInfo | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'send', text: string): void
}>()

const inputText = ref('')
const copiedId = ref<string | null>(null)

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const copyText = async (text: string, id: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => {
      if (copiedId.value === id) {
        copiedId.value = null
      }
    }, 2000)
  } catch {
    // fallback
  }
}

const pasteClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      inputText.value = (inputText.value ? inputText.value + '\n' : '') + text
    }
  } catch {
    // permission prompt or unsupported
  }
}

const handleSend = () => {
  if (!inputText.value.trim()) return
  emit('send', inputText.value)
  inputText.value = ''
}
</script>

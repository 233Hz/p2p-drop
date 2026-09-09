<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
  >
    <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[85vh] animate-scale-up">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center space-x-2">
          <div class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <MessageSquare class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
              剪贴板与文本快传
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ targetPeer ? `发送至 ${targetPeer.name}` : '向房间内所有在线设备广播消息' }}
            </p>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Messages History List -->
      <div class="flex-1 overflow-y-auto py-4 space-y-3 min-h-[160px] custom-scrollbar">
        <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400 py-8">
          <Clipboard class="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-600 mb-2" />
          <p class="text-xs">暂无文本消息，可粘贴网址或文本立即互传</p>
        </div>

        <div 
          v-for="msg in messages" 
          :key="msg.id"
          class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 transition group"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {{ msg.fromPeerName }}
            </span>
            <div class="flex items-center space-x-2">
              <span class="text-[10px] text-slate-400 font-mono">
                {{ formatTime(msg.timestamp) }}
              </span>
              <button
                @click="copyText(msg.text, msg.id)"
                class="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition text-xs flex items-center space-x-1"
                title="复制内容"
              >
                <Check v-if="copiedId === msg.id" class="w-3.5 h-3.5 text-emerald-500" />
                <Copy v-else class="w-3.5 h-3.5" />
                <span class="text-[10px]" v-if="copiedId === msg.id">已复制</span>
              </button>
            </div>
          </div>
          <p class="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words select-all">
            {{ msg.text }}
          </p>
        </div>
      </div>

      <!-- Input Area -->
      <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
        <div class="relative">
          <textarea
            v-model="inputText"
            rows="3"
            placeholder="输入要发送的文本、代码片段或链接..."
            class="w-full p-3 pr-20 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition"
            @keydown.enter.exact.prevent="handleSend"
          ></textarea>

          <div class="absolute right-2.5 bottom-3 flex items-center space-x-1.5">
            <button
              type="button"
              @click="pasteClipboard"
              class="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs transition"
              title="粘贴剪贴板"
            >
              <ClipboardPaste class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              @click="handleSend"
              :disabled="!inputText.trim()"
              class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition flex items-center space-x-1 active:scale-95"
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

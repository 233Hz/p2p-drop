<template>
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-12 opacity-0 scale-95"
    enter-to-class="transform translate-y-0 opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100 scale-100"
    leave-to-class="transform translate-y-12 opacity-0 scale-95"
  >
    <div 
      v-if="task"
      class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md sm:max-w-lg"
    >
      <div 
        class="rounded-3xl p-3.5 sm:p-4 shadow-2xl border backdrop-blur-xl transition-all duration-300"
        :class="[
          task.status === 'completed' 
            ? 'bg-emerald-950/90 dark:bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
            : task.status === 'failed'
              ? 'bg-rose-950/90 dark:bg-rose-950/95 border-rose-500/40 text-rose-100'
              : 'bg-slate-900/90 dark:bg-slate-950/95 border-slate-700/60 text-white'
        ]"
      >
        <!-- Transferring or Connecting State -->
        <div v-if="task.status === 'transferring' || task.status === 'connecting' || task.status === 'waiting_auth'">
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center space-x-2.5 truncate">
              <!-- Direction indicator icon -->
              <div 
                class="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                :class="task.direction === 'send' ? 'bg-indigo-600/80 text-white' : 'bg-emerald-600/80 text-white'"
              >
                <ArrowUpRight v-if="task.direction === 'send'" class="w-4 h-4" />
                <ArrowDownLeft v-else class="w-4 h-4" />
              </div>

              <div class="truncate">
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-bold text-white truncate">
                    {{ currentFileName }}
                  </span>
                  <span v-if="task.files.length > 1" class="text-[10px] text-slate-400 font-mono">
                    ({{ task.currentFileIndex + 1 }}/{{ task.files.length }})
                  </span>
                  <span v-if="task.isRelay" class="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/30 flex-shrink-0">
                    云端中继
                  </span>
                </div>
                <p class="text-[11px] text-slate-400">
                  {{ task.direction === 'send' ? `发送至 ${task.peerName}` : `来自 ${task.peerName}` }}
                </p>
              </div>
            </div>

            <!-- Cancel Button -->
            <button
              @click="$emit('cancel')"
              class="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-90 flex-shrink-0"
              title="取消传输"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Status / Progress Bar -->
          <div v-if="task.status === 'waiting_auth'" class="text-xs text-amber-300 py-1 flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>等待对方确认接收...</span>
          </div>

          <div v-else-if="task.status === 'connecting'" class="text-xs text-indigo-300 py-1 flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
            <span>正在进行 P2P 握手与打洞...</span>
          </div>

          <div v-else>
            <!-- Progress Bar -->
            <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
              <div 
                class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 transition-all duration-300 rounded-full"
                :style="{ width: `${task.progress}%` }"
              ></div>
            </div>

            <!-- Metrics -->
            <div class="flex items-center justify-between text-[11px] text-slate-300 mt-2 font-mono">
              <span class="font-bold text-indigo-300">{{ task.progress }}%</span>
              <span>{{ formatBytes(task.bytesTransferred) }} / {{ formatBytes(task.totalBytes) }}</span>
              <span class="text-slate-400">{{ formatSpeed(task.speedBytesPerSec) }}</span>
              <span class="text-slate-400">剩余 {{ formatEta(task.etaSeconds) }}</span>
            </div>
          </div>
        </div>

        <!-- Completed State -->
        <div v-else-if="task.status === 'completed'" class="flex items-center justify-between py-1">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <Check class="w-5 h-5" />
            </div>
            <div>
              <p class="text-xs font-bold text-emerald-200">传输完成！</p>
              <p class="text-[11px] text-emerald-300/80">
                共 {{ task.files.length }} 个文件 ({{ formatBytes(task.totalBytes) }})
              </p>
            </div>
          </div>
          <button
            @click="$emit('dismiss')"
            class="px-3 py-1.5 rounded-xl bg-emerald-800/60 hover:bg-emerald-800 text-xs font-medium text-emerald-100 transition active:scale-95"
          >
            关闭
          </button>
        </div>

        <!-- Failed or Cancelled State -->
        <div v-else class="flex items-center justify-between py-1">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center">
              <AlertCircle class="w-5 h-5" />
            </div>
            <div>
              <p class="text-xs font-bold text-rose-200">
                {{ task.status === 'cancelled' ? '传输已取消' : '传输中断 / 失败' }}
              </p>
              <p class="text-[11px] text-rose-300/80 max-w-xs truncate">
                {{ task.errorMessage || '请检查两端网络或刷新重试' }}
              </p>
            </div>
          </div>
          <button
            @click="$emit('dismiss')"
            class="px-3 py-1.5 rounded-xl bg-rose-800/60 hover:bg-rose-800 text-xs font-medium text-rose-100 transition active:scale-95"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, ArrowDownLeft, X, Check, AlertCircle } from 'lucide-vue-next'
import type { TransferTask } from '@/types/transfer'
import { formatBytes, formatSpeed, formatEta } from '@/utils/format'

const props = defineProps<{
  task: TransferTask | null
}>()

defineEmits<{
  (e: 'cancel'): void
  (e: 'dismiss'): void
}>()

const currentFileName = computed(() => {
  if (!props.task || props.task.files.length === 0) return '未知文件'
  const file = props.task.files[props.task.currentFileIndex]
  return file ? file.name : props.task.files[0].name
})
</script>

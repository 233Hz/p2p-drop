<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform translate-y-6 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-6 opacity-0"
  >
    <div 
      v-if="task"
      class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md sm:max-w-lg"
    >
      <div 
        class="rounded-xl p-3.5 sm:p-4 border backdrop-blur-xl transition-colors duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
        :class="[
          task.status === 'completed' 
            ? 'bg-white/95 border-emerald-500/40 text-[#1d1d1f] dark:bg-[#2c2c2e]/95 dark:border-emerald-500/30 dark:text-white/95'
            : task.status === 'failed'
              ? 'bg-white/95 border-rose-500/40 text-[#1d1d1f] dark:bg-[#2c2c2e]/95 dark:border-rose-500/30 dark:text-white/95'
              : 'bg-white/95 border-black/8 text-[#1d1d1f] dark:bg-[#2c2c2e]/95 dark:border-white/10 dark:text-white/95'
        ]"
      >
        <!-- Transferring or Connecting State -->
        <div v-if="task.status === 'transferring' || task.status === 'connecting' || task.status === 'waiting_auth'">
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center space-x-2.5 truncate">
              <!-- Direction indicator icon -->
              <div 
                class="w-7 h-7 rounded-lg bg-[#e5e5ea] dark:bg-[#3a3a3c] border border-black/8 dark:border-white/8 text-[#1d1d1f] dark:text-white/90 flex items-center justify-center flex-shrink-0"
              >
                <ArrowUpRight v-if="task.direction === 'send'" class="w-3.5 h-3.5 text-[#0a84ff]" />
                <ArrowDownLeft v-else class="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              </div>

              <div class="truncate">
                <div class="flex items-center space-x-2">
                  <span class="font-serif font-semibold text-xs text-[#1d1d1f] dark:text-white/95 truncate">
                    {{ currentFileName }}
                  </span>
                  <span v-if="task.files.length > 1" class="text-[10px] text-[#1d1d1f]/40 dark:text-white/40 font-mono">
                    ({{ task.currentFileIndex + 1 }}/{{ task.files.length }})
                  </span>
                </div>
                <p class="text-[11px] text-[#1d1d1f]/40 dark:text-white/40">
                  {{ task.direction === 'send' ? `发送至 ${task.peerName}` : `来自 ${task.peerName}` }}
                </p>
              </div>
            </div>

            <!-- Cancel Button -->
            <button
              @click="$emit('cancel')"
              class="p-1.5 rounded-lg bg-[#e5e5ea] dark:bg-[#3a3a3c] hover:bg-black/10 dark:hover:bg-white/10 text-[#1d1d1f]/70 dark:text-white/70 hover:text-[#1d1d1f] dark:hover:text-white/95 border border-black/8 dark:border-white/8 transition-colors duration-200 flex-shrink-0"
              title="取消传输"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Status / Progress Bar -->
          <div v-if="task.status === 'waiting_auth'" class="text-xs text-amber-500 dark:text-amber-300 py-1 flex items-center space-x-2">
            <span class="w-1.5 h-1.5 rounded-sm bg-amber-400"></span>
            <span>等待对方确认接收...</span>
          </div>

          <div v-else-if="task.status === 'connecting'" class="text-xs text-[#0a84ff] py-1 flex items-center space-x-2">
            <span class="w-1.5 h-1.5 rounded-sm bg-[#0a84ff]"></span>
            <span>正在进行 P2P 握手与打洞...</span>
          </div>

          <div v-else>
            <!-- Progress Bar -->
            <div class="w-full h-1.5 rounded-lg bg-black/10 dark:bg-[#1c1c1e] border border-black/5 dark:border-white/6 overflow-hidden relative">
              <div 
                class="h-full bg-[#0a84ff] transition-all duration-200 rounded-lg"
                :style="{ width: `${task.progress}%` }"
              ></div>
            </div>

            <!-- Metrics -->
            <div class="flex items-center justify-between text-[11px] text-[#1d1d1f]/70 dark:text-white/70 mt-2 font-mono">
              <span class="font-bold text-[#0a84ff]">{{ task.progress }}%</span>
              <span>{{ formatBytes(task.bytesTransferred) }} / {{ formatBytes(task.totalBytes) }}</span>
              <span class="text-[#1d1d1f]/40 dark:text-white/40">{{ formatSpeed(task.speedBytesPerSec) }}</span>
              <span class="text-[#1d1d1f]/40 dark:text-white/40">剩余 {{ formatEta(task.etaSeconds) }}</span>
            </div>
          </div>
        </div>

        <!-- Completed State -->
        <div v-else-if="task.status === 'completed'" class="flex items-center justify-between py-1">
          <div class="flex items-center space-x-3">
            <div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Check class="w-4 h-4" />
            </div>
            <div>
              <p class="font-serif font-semibold text-xs text-emerald-700 dark:text-emerald-200">传输完成！</p>
              <p class="text-[11px] text-[#1d1d1f]/70 dark:text-white/70">
                {{ task.direction === 'send' ? '已成功发送' : '已成功接收' }} {{ task.files.length }} 个文件 ({{ formatBytes(task.totalBytes) }})
              </p>
            </div>
          </div>
          <button
            @click="$emit('dismiss')"
            class="px-3 py-1.5 rounded-lg bg-[#e5e5ea] dark:bg-[#3a3a3c] hover:bg-black/10 dark:hover:bg-white/10 text-xs text-[#1d1d1f]/90 dark:text-white/90 border border-black/8 dark:border-white/10 transition-colors duration-200"
          >
            关闭
          </button>
        </div>

        <!-- Failed or Cancelled State -->
        <div v-else class="flex items-center justify-between py-1">
          <div class="flex items-center space-x-3">
            <div class="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertCircle class="w-4 h-4" />
            </div>
            <div>
              <p class="font-serif font-semibold text-xs text-rose-700 dark:text-rose-200">
                {{ task.status === 'cancelled' ? '传输已取消' : '传输中断 / 失败' }}
              </p>
              <p class="text-[11px] text-[#1d1d1f]/70 dark:text-white/70 max-w-xs truncate">
                {{ task.errorMessage || '请检查两端网络或刷新重试' }}
              </p>
            </div>
          </div>
          <button
            @click="$emit('dismiss')"
            class="px-3 py-1.5 rounded-lg bg-[#e5e5ea] dark:bg-[#3a3a3c] hover:bg-black/10 dark:hover:bg-white/10 text-xs text-[#1d1d1f]/90 dark:text-white/90 border border-black/8 dark:border-white/10 transition-colors duration-200"
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

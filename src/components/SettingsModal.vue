<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md"
  >
    <div class="w-full max-w-lg bg-white dark:bg-[#2c2c2e] rounded-xl border border-black/8 dark:border-white/10 p-5 sm:p-6 flex flex-col max-h-[90vh] shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-black/8 dark:border-white/8">
        <div class="flex items-center space-x-2.5">
          <div class="p-2 rounded-lg bg-[#e5e5ea] dark:bg-[#3a3a3c] border border-black/8 dark:border-white/8 text-[#1d1d1f] dark:text-white/90">
            <Settings class="w-4 h-4" />
          </div>
          <div>
            <h3 class="font-serif font-semibold text-[#1d1d1f] dark:text-white/95 text-base">
              系统与网络设置
            </h3>
            <p class="text-xs text-[#1d1d1f]/40 dark:text-white/40 font-sans">
              个性化网络穿透与交互偏好
            </p>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="p-1.5 rounded-lg text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#1d1d1f] dark:hover:text-white/90 hover:bg-black/5 dark:hover:bg-white/8 transition-colors duration-200"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Settings Content -->
      <div class="flex-1 overflow-y-auto py-4 space-y-5 custom-scrollbar pr-1">
        <!-- Appearance Theme -->
        <div>
          <label class="font-serif font-semibold text-xs text-[#1d1d1f] dark:text-white/90 block mb-1">
            外观与主题模式
          </label>
          <p class="text-xs text-[#1d1d1f]/60 dark:text-white/40 leading-relaxed mb-2.5">
            选择你偏好的界面明暗风格，支持跟随系统自动变色。
          </p>

          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="form.theme = 'auto'"
              class="py-2 px-3 rounded-lg text-xs font-medium border transition-colors duration-200"
              :class="[
                form.theme === 'auto'
                  ? 'bg-[#0a84ff] text-white border-transparent'
                  : 'bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f]/70 dark:text-white/70 border-black/8 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
              ]"
            >
              跟随系统
            </button>
            <button
              type="button"
              @click="form.theme = 'light'"
              class="py-2 px-3 rounded-lg text-xs font-medium border transition-colors duration-200"
              :class="[
                form.theme === 'light'
                  ? 'bg-[#0a84ff] text-white border-transparent'
                  : 'bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f]/70 dark:text-white/70 border-black/8 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
              ]"
            >
              浅色模式
            </button>
            <button
              type="button"
              @click="form.theme = 'dark'"
              class="py-2 px-3 rounded-lg text-xs font-medium border transition-colors duration-200"
              :class="[
                form.theme === 'dark'
                  ? 'bg-[#0a84ff] text-white border-transparent'
                  : 'bg-[#f5f5f7] dark:bg-[#1c1c1e] text-[#1d1d1f]/70 dark:text-white/70 border-black/8 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
              ]"
            >
              暗黑模式
            </button>
          </div>
        </div>

        <!-- WebRTC ICE / STUN / TURN -->
        <div class="pt-4 border-t border-black/8 dark:border-white/8">
          <div class="flex items-center justify-between mb-1.5">
            <label class="font-serif font-semibold text-xs text-[#1d1d1f] dark:text-white/90">
              内网传输与中继设置
            </label>
          </div>
          <p class="text-xs text-[#1d1d1f]/60 dark:text-white/40 leading-relaxed mb-3">
            默认已开启局域网内网直连传输模式，文件数据仅在同一 Wi-Fi / 局域网内的两台设备之间直接传输，不经过任何外部服务器，保护隐私且高速。如确实需要跨外网中继，可在此配置专属私有 TURN 服务器。
          </p>

          <div class="space-y-2.5">
            <div>
              <label class="text-[11px] font-mono text-[#1d1d1f]/60 dark:text-white/60 block mb-1">
                TURN Server URL (选填)
              </label>
              <input
                v-model="form.turnUrls"
                type="text"
                placeholder="turn:turn.example.com:3478"
                class="w-full px-3 py-2 text-xs font-mono bg-[#f5f5f7] dark:bg-[#1c1c1e] border border-black/10 dark:border-white/10 rounded-lg text-[#1d1d1f] dark:text-white/90 placeholder-[#1d1d1f]/30 dark:placeholder-white/30 focus:outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors duration-200"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[11px] font-mono text-[#1d1d1f]/60 dark:text-white/60 block mb-1">
                  TURN 用户名 (选填)
                </label>
                <input
                  v-model="form.turnUsername"
                  type="text"
                  placeholder="username"
                  class="w-full px-3 py-2 text-xs font-mono bg-[#f5f5f7] dark:bg-[#1c1c1e] border border-black/10 dark:border-white/10 rounded-lg text-[#1d1d1f] dark:text-white/90 placeholder-[#1d1d1f]/30 dark:placeholder-white/30 focus:outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors duration-200"
                />
              </div>
              <div>
                <label class="text-[11px] font-mono text-[#1d1d1f]/60 dark:text-white/60 block mb-1">
                  TURN 凭据/密码 (选填)
                </label>
                <input
                  v-model="form.turnCredential"
                  type="password"
                  placeholder="credential"
                  class="w-full px-3 py-2 text-xs font-mono bg-[#f5f5f7] dark:bg-[#1c1c1e] border border-black/10 dark:border-white/10 rounded-lg text-[#1d1d1f] dark:text-white/90 placeholder-[#1d1d1f]/30 dark:placeholder-white/30 focus:outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors duration-200"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Feedback & Sound toggles -->
        <div class="pt-4 border-t border-black/8 dark:border-white/8 space-y-3">
          <label class="font-serif font-semibold text-xs text-[#1d1d1f] dark:text-white/90 block">
            交互与提示音
          </label>

          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-xs font-medium text-[#1d1d1f] dark:text-white/90">传输提示音效</p>
              <p class="text-[11px] text-[#1d1d1f]/60 dark:text-white/40">请求到达、传输成功或失败时播放 Web Audio 合成音</p>
            </div>
            <input
              v-model="form.soundEnabled"
              type="checkbox"
              class="w-4 h-4 rounded bg-[#f5f5f7] dark:bg-[#1c1c1e] border border-black/20 dark:border-white/20 text-[#0a84ff] accent-[#0a84ff] focus:outline-none"
            />
          </div>

          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-xs font-medium text-[#1d1d1f] dark:text-white/90">触觉振动反馈</p>
              <p class="text-[11px] text-[#1d1d1f]/60 dark:text-white/40">移动端设备收到传输请求或完成时触发轻微振动</p>
            </div>
            <input
              v-model="form.vibrationEnabled"
              type="checkbox"
              class="w-4 h-4 rounded bg-[#f5f5f7] dark:bg-[#1c1c1e] border border-black/20 dark:border-white/20 text-[#0a84ff] accent-[#0a84ff] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="pt-4 border-t border-black/8 dark:border-white/8 flex items-center justify-between">
        <span v-if="savedToast" class="text-xs text-emerald-600 dark:text-[#30d158] font-mono">设置已成功保存！</span>
        <span v-else></span>

        <div class="flex items-center space-x-2">
          <button
            @click="$emit('close')"
            class="px-4 py-2 rounded-lg text-xs font-medium text-[#1d1d1f]/70 dark:text-white/70 hover:text-[#1d1d1f] dark:hover:text-white/90 hover:bg-black/5 dark:hover:bg-white/8 border border-black/8 dark:border-white/8 transition-colors duration-200"
          >
            取消
          </button>
          <button
            @click="handleSave"
            class="px-5 py-2 rounded-lg bg-[#0a84ff] hover:bg-[#0071e3] text-white text-xs font-medium transition-colors duration-200"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Settings, X } from 'lucide-vue-next'
import type { AppSettings } from '@/types/config'

const props = defineProps<{
  isOpen: boolean
  settings: AppSettings
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', newSettings: Partial<AppSettings>): void
}>()

const form = reactive({
  theme: props.settings.theme || 'auto',
  turnUrls: props.settings.turnServer?.urls || '',
  turnUsername: props.settings.turnServer?.username || '',
  turnCredential: props.settings.turnServer?.credential || '',
  soundEnabled: props.settings.soundEnabled,
  vibrationEnabled: props.settings.vibrationEnabled,
})

const savedToast = ref(false)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      form.theme = props.settings.theme || 'auto'
      form.turnUrls = props.settings.turnServer?.urls || ''
      form.turnUsername = props.settings.turnServer?.username || ''
      form.turnCredential = props.settings.turnServer?.credential || ''
      form.soundEnabled = props.settings.soundEnabled
      form.vibrationEnabled = props.settings.vibrationEnabled
    }
  }
)

const handleSave = () => {
  emit('save', {
    theme: form.theme as 'auto' | 'light' | 'dark',
    turnServer: form.turnUrls.trim()
      ? {
          urls: form.turnUrls.trim(),
          username: form.turnUsername.trim() || undefined,
          credential: form.turnCredential.trim() || undefined,
        }
      : undefined,
    soundEnabled: form.soundEnabled,
    vibrationEnabled: form.vibrationEnabled,
  })

  savedToast.value = true
  setTimeout(() => {
    savedToast.value = false
    emit('close')
  }, 1000)
}
</script>

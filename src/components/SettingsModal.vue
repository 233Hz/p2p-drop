<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
  >
    <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[90vh] animate-scale-up">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center space-x-2">
          <div class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Settings class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
              系统与网络设置
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              个性化信令与 WebRTC NAT 穿透参数
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

      <!-- Settings Content -->
      <div class="flex-1 overflow-y-auto py-4 space-y-5 custom-scrollbar pr-1">
        <!-- Supabase Realtime Credentials -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <span>Supabase 信令凭据 (Realtime)</span>
            </label>
            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">仅作信令握手，零数据存储</span>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
            用于设备 Presence 发现与 SDP/ICE 交换。保存在本地浏览器 localStorage 中，支持私有部署。
          </p>

          <div class="space-y-2">
            <div>
              <label class="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Supabase Project URL
              </label>
              <input
                v-model="form.supabaseUrl"
                type="text"
                placeholder="https://your-project.supabase.co"
                class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label class="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Supabase Anon Key
              </label>
              <input
                v-model="form.supabaseAnonKey"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <!-- WebRTC ICE / STUN / TURN -->
        <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold text-slate-900 dark:text-slate-100">
              WebRTC NAT 穿透与中继 (STUN / TURN)
            </label>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
            默认已内置 Google 与 Cloudflare 免费公共 STUN 节点。如处在对称型 NAT 或企业级高防网络，可配置自定义 TURN 服务器。
          </p>

          <div class="space-y-2">
            <div>
              <label class="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                TURN Server URL (选填)
              </label>
              <input
                v-model="form.turnUrls"
                type="text"
                placeholder="turn:turn.example.com:3478"
                class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  TURN 用户名 (选填)
                </label>
                <input
                  v-model="form.turnUsername"
                  type="text"
                  placeholder="username"
                  class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label class="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  TURN 凭据/密码 (选填)
                </label>
                <input
                  v-model="form.turnCredential"
                  type="password"
                  placeholder="credential"
                  class="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Feedback & Sound toggles -->
        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <label class="text-xs font-bold text-slate-900 dark:text-slate-100 block">
            交互与提示音
          </label>

          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-slate-800 dark:text-slate-200">传输提示音效</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">请求到达、传输成功或失败时播放 Web Audio 合成音</p>
            </div>
            <input
              v-model="form.soundEnabled"
              type="checkbox"
              class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
            />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-slate-800 dark:text-slate-200">触觉振动反馈</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">移动端设备收到传输请求或完成时触发轻微振动</p>
            </div>
            <input
              v-model="form.vibrationEnabled"
              type="checkbox"
              class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
            />
          </div>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span v-if="savedToast" class="text-xs text-emerald-600 font-medium">设置已成功保存！</span>
        <span v-else></span>

        <div class="flex items-center space-x-2">
          <button
            @click="$emit('close')"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            取消
          </button>
          <button
            @click="handleSave"
            class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition active:scale-95"
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
  supabaseUrl: props.settings.supabaseUrl,
  supabaseAnonKey: props.settings.supabaseAnonKey,
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
      form.supabaseUrl = props.settings.supabaseUrl
      form.supabaseAnonKey = props.settings.supabaseAnonKey
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
    supabaseUrl: form.supabaseUrl.trim(),
    supabaseAnonKey: form.supabaseAnonKey.trim(),
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

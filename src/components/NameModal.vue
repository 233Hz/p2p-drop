<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
  >
    <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center animate-scale-up">
      <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
        <Edit3 class="w-6 h-6" />
      </div>

      <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
        修改本设备名称
      </h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 mb-4 text-center">
        名称将在局域网雷达中展示给其他设备
      </p>

      <div class="w-full mb-4">
        <div class="flex items-center space-x-2">
          <input
            v-model="nameInput"
            type="text"
            maxlength="20"
            placeholder="输入你的设备昵称"
            class="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @keydown.enter="handleSave"
          />
          <button
            @click="randomizeName"
            type="button"
            class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            title="随机生成"
          >
            <Shuffle class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="w-full grid grid-cols-2 gap-2">
        <button
          @click="$emit('close')"
          class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          取消
        </button>
        <button
          @click="handleSave"
          :disabled="!nameInput.trim()"
          class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition active:scale-95"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Edit3, Shuffle } from 'lucide-vue-next'
import { generateRandomName } from '@/utils/names'

const props = defineProps<{
  isOpen: boolean
  currentName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', name: string): void
}>()

const nameInput = ref(props.currentName)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      nameInput.value = props.currentName
    }
  }
)

const randomizeName = () => {
  nameInput.value = generateRandomName()
}

const handleSave = () => {
  if (!nameInput.value.trim()) return
  emit('save', nameInput.value.trim())
  emit('close')
}
</script>

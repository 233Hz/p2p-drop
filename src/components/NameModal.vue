<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
  >
    <div class="w-full max-w-sm bg-[#2c2c2e] rounded-xl border border-white/10 p-5 sm:p-6 flex flex-col items-center shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <div class="w-10 h-10 rounded-lg bg-[#3a3a3c] border border-white/8 text-white/90 flex items-center justify-center mb-3">
        <Edit3 class="w-5 h-5 text-white/90" />
      </div>

      <h3 class="font-serif font-semibold text-white/95 text-base mb-1">
        修改本设备名称
      </h3>
      <p class="text-xs text-white/40 font-sans mb-4 text-center">
        名称将在局域网雷达中展示给其他设备
      </p>

      <div class="w-full mb-4">
        <div class="flex items-center space-x-2">
          <input
            v-model="nameInput"
            type="text"
            maxlength="20"
            placeholder="输入你的设备昵称"
            class="flex-1 px-3.5 py-2 text-xs font-mono bg-[#1c1c1e] border border-white/10 rounded-lg text-white/90 placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors duration-200"
            @keydown.enter="handleSave"
          />
          <button
            @click="randomizeName"
            type="button"
            class="p-2 rounded-lg bg-[#3a3a3c] hover:bg-white/10 text-white/70 hover:text-white/90 border border-white/8 transition-colors duration-200 flex-shrink-0"
            title="随机生成"
          >
            <Shuffle class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="w-full grid grid-cols-2 gap-2">
        <button
          @click="$emit('close')"
          class="w-full py-2 rounded-lg bg-[#3a3a3c] hover:bg-white/10 text-white/70 hover:text-white/90 border border-white/8 text-xs font-medium transition-colors duration-200"
        >
          取消
        </button>
        <button
          @click="handleSave"
          :disabled="!nameInput.trim()"
          class="w-full py-2 rounded-lg bg-[#0a84ff] hover:bg-[#0071e3] disabled:opacity-40 text-white text-xs font-medium transition-colors duration-200"
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

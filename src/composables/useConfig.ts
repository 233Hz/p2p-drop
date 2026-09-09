import { ref, reactive, watch } from 'vue'
import type { AppSettings } from '@/types/config'
import { DEFAULT_STUN_SERVERS } from '@/types/config'

const STORAGE_KEY = 'p2p_drop_settings'

export function useConfig() {
  const defaultSettings: AppSettings = {
    stunServers: [...DEFAULT_STUN_SERVERS],
    turnServer: {
      urls: '',
      username: '',
      credential: '',
    },
    theme: 'auto',
    soundEnabled: true,
    vibrationEnabled: true,
  }

  // Load from localStorage
  const saved = localStorage.getItem(STORAGE_KEY)
  let initial = defaultSettings
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      initial = { ...defaultSettings, ...parsed }
      // If user had old defaults without domestic STUN servers, upgrade them
      if (
        Array.isArray(initial.stunServers) &&
        !initial.stunServers.some((s: string) => s.includes('stun.qq.com'))
      ) {
        // Merge without duplicates, placing DEFAULT_STUN_SERVERS first
        initial.stunServers = Array.from(new Set([...DEFAULT_STUN_SERVERS, ...initial.stunServers]))
      }
    } catch {
      // ignore
    }
  }

  const settings = reactive<AppSettings>(initial)
  const isDark = ref(false)

  const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const effectiveDark = theme === 'dark' || (theme === 'auto' && prefersDark)
    isDark.value = effectiveDark
    if (effectiveDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Initialize theme
  applyTheme(settings.theme)

  // Watch theme changes
  watch(
    () => settings.theme,
    (newTheme) => {
      applyTheme(newTheme)
      saveSettings()
    }
  )

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }

  const toggleTheme = () => {
    settings.theme = isDark.value ? 'light' : 'dark'
    applyTheme(settings.theme)
  }

  return {
    settings,
    isDark,
    saveSettings,
    toggleTheme,
    applyTheme,
  }
}

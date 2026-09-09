import { ref, reactive, watch } from 'vue'
import type { AppSettings } from '@/types/config'
import { DEFAULT_STUN_SERVERS } from '@/types/config'

const STORAGE_KEY = 'p2p_drop_settings'

export function useConfig() {
  const defaultSettings: AppSettings = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('p2p_drop_supabase_url') || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('p2p_drop_supabase_anon_key') || '',
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
      initial = { ...defaultSettings, ...JSON.parse(saved) }
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
    // Also save supabase credentials directly for easy access
    if (settings.supabaseUrl) {
      localStorage.setItem('p2p_drop_supabase_url', settings.supabaseUrl)
    }
    if (settings.supabaseAnonKey) {
      localStorage.setItem('p2p_drop_supabase_anon_key', settings.supabaseAnonKey)
    }
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

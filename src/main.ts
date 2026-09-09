import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Service Worker registration for PWA offline & Web Share Target
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('SW registration skipped:', err)
    })
  })
}

createApp(App).mount('#app')

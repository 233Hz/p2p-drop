class SoundManager {
  private ctx: AudioContext | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
          if (AudioCtx) {
            this.ctx = new AudioCtx()
          }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {})
        }
        window.removeEventListener('click', unlock)
        window.removeEventListener('touchstart', unlock)
        window.removeEventListener('keydown', unlock)
      }
      window.addEventListener('click', unlock, { passive: true, once: true })
      window.addEventListener('touchstart', unlock, { passive: true, once: true })
      window.addEventListener('keydown', unlock, { passive: true, once: true })
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    try {
      // If user hasn't interacted with page, do not initialize AudioContext to avoid browser warning
      if ((navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
        return null
      }
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          this.ctx = new AudioCtx()
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        if ((navigator as any).userActivation?.hasBeenActive) {
          this.ctx.resume().catch(() => {})
        } else {
          return null
        }
      }
      return this.ctx && this.ctx.state === 'running' ? this.ctx : null
    } catch {
      return null
    }
  }

  playSuccess() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc2.type = 'triangle'

      // Chord: C5 (523.25) -> G5 (783.99) -> C6 (1046.50)
      osc1.frequency.setValueAtTime(523.25, now)
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18)

      osc2.frequency.setValueAtTime(659.25, now)
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22)

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.5)
      osc2.stop(now + 0.5)
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  playNotification() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.setValueAtTime(880.0, now + 0.08) // A5

      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.35)
    } catch {
      // ignore
    }
  }

  playError() {
    try {
      const ctx = this.getContext()
      if (!ctx) return
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.linearRampToValueAtTime(150, now + 0.25)

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.3)
    } catch {
      // ignore
    }
  }

  vibrate(pattern: number[] = [80, 40, 80]) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if ((navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
        return
      }
      try {
        navigator.vibrate(pattern)
      } catch {
        // ignore
      }
    }
  }
}

export const sound = new SoundManager()

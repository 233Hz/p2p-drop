import type { DeviceType, OsType, BrowserType } from '@/types/peer'

const ADJECTIVES = [
  '敏捷的', '聪慧的', '沉稳的', '神秘的', '欢快的', 
  '星际的', '极速的', '可爱的', '冷静的', '勇敢的',
  '闪耀的', '机智的', '温暖的', '酷炫的', '优雅的'
]

const NOUNS = [
  '海豚', '雪豹', '企鹅', '猎鹰', '柴犬', 
  '熊猫', '考拉', '金丝猴', '蓝鲸', '赤狐', 
  '变色龙', '松鼠', '猫头鹰', '海獭', '飞燕'
]

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-teal-500 to-cyan-600',
  'from-indigo-500 to-fuchsia-600',
]

export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj}${noun}`
}

export function getAvatarGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export function detectDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase()
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

export function detectOs(): OsType {
  const ua = navigator.userAgent.toLowerCase()
  if (/windows/i.test(ua)) return 'windows'
  if (/macintosh|mac os x/i.test(ua)) return 'macos'
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/linux/i.test(ua)) return 'linux'
  return 'unknown'
}

export function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase()
  if (/edg/i.test(ua)) return 'edge'
  if (/opr|opera/i.test(ua)) return 'opera'
  if (/chrome|crios/i.test(ua)) return 'chrome'
  if (/firefox|fxios/i.test(ua)) return 'firefox'
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'safari'
  return 'browser'
}

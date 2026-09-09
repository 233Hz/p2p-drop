/**
 * Get public IP hash or fallback channel name
 */
export async function getPublicIpHash(): Promise<string> {
  const fetchers = [
    async () => {
      const res = await fetch('https://myip.ipip.net/json', { signal: AbortSignal.timeout(3000) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data && data.data && data.data.ip) return String(data.data.ip).trim()
      throw new Error()
    },
    async () => {
      const res = await fetch('https://api.ip.sb/geoip', { signal: AbortSignal.timeout(3000) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data && data.ip) return String(data.ip).trim()
      throw new Error()
    },
    async () => {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3500) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data && data.ip) return String(data.ip).trim()
      throw new Error()
    },
  ]

  try {
    const ip = await promiseAny(fetchers.map((f) => f()))
    if (ip) {
      return await hashString(ip)
    }
  } catch {
    // all failed
  }

  return 'lobby-global'
}

function promiseAny<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let rejections = 0
    if (promises.length === 0) {
      reject(new Error('No promises'))
      return
    }
    promises.forEach((p) => {
      p.then(resolve).catch(() => {
        rejections++
        if (rejections === promises.length) {
          reject(new Error('All failed'))
        }
      })
    })
  })
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str + '_p2p_salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return 'lan-' + hashArray.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('')
}

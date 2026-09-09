/**
 * Get public IP hash or fallback channel name
 */
export async function getPublicIpHash(): Promise<string> {
  const apis = [
    { url: 'https://api.ip.sb/jsonip', key: 'ip' },
    { url: 'https://myip.ipip.net/json', key: 'data.ip' },
    { url: 'https://api.ipify.org?format=json', key: 'ip' },
  ]

  for (const api of apis) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500)
      const res = await fetch(api.url, { signal: controller.signal }).catch(() => null)
      clearTimeout(timeoutId)

      if (res && res.ok) {
        const json = await res.json()
        const ip = api.key === 'data.ip' ? json?.data?.ip : json?.ip
        if (ip && typeof ip === 'string' && ip.trim()) {
          return await hashString(ip.trim())
        }
      }
    } catch {
      // next api
    }
  }

  return 'lobby-global'
}


async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str + '_p2p_salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return 'lan-' + hashArray.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('')
}

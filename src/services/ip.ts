/**
 * Get public IP hash or fallback channel name
 */
export async function getPublicIpHash(): Promise<string> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    }).catch(() => null)

    clearTimeout(timeoutId)

    if (response && response.ok) {
      const data = await response.json()
      if (data.ip) {
        return await hashString(data.ip)
      }
    }
  } catch {
    // ignore
  }

  // Secondary fallback
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)
    const res = await fetch('https://api.infoip.io/', { signal: controller.signal }).catch(() => null)
    clearTimeout(timeoutId)
    if (res && res.ok) {
      const data = await res.json()
      if (data.ip) {
        return await hashString(data.ip)
      }
    }
  } catch {
    // ignore
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

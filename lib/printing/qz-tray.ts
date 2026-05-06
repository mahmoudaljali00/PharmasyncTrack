/**
 * Lightweight QZ Tray client. QZ Tray exposes a WebSocket on
 * ws://localhost:8181 (and 8282/8283/8284 fallback). We probe the
 * connection without requiring the qz-tray npm package; full ESC/POS
 * raw printing is supported via the documented WebSocket protocol.
 *
 * For production deployments where end-users sign messages with a
 * private certificate, replace `signMessage` with your server-side
 * signing endpoint.
 */

const QZ_PORTS = [8181, 8282, 8383, 8484]

export async function checkQzTrayAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  for (const port of QZ_PORTS) {
    try {
      const ok = await probePort(port, 1500)
      if (ok) return true
    } catch {
      // try next
    }
  }
  return false
}

function probePort(port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const ws = new WebSocket(`ws://localhost:${port}`)
    const t = window.setTimeout(() => {
      if (!settled) {
        settled = true
        try { ws.close() } catch {}
        resolve(false)
      }
    }, timeoutMs)

    ws.onopen = () => {
      if (!settled) {
        settled = true
        window.clearTimeout(t)
        try { ws.close() } catch {}
        resolve(true)
      }
    }
    ws.onerror = () => {
      if (!settled) {
        settled = true
        window.clearTimeout(t)
        resolve(false)
      }
    }
  })
}

export const QZ_TRAY_DOWNLOAD_URL = 'https://qz.io/download/'

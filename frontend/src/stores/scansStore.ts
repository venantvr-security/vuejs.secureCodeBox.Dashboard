import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ScanInfo {
  name: string
  namespace: string
  scanType: string
  status: string
  parameters: string[]
  findings: number
  startTime: string
  finishedTime?: string
  duration: string
}

const API_BASE = import.meta.env.VITE_API_URL || ''
const WS_BASE = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080`

export const useScansStore = defineStore('scans', () => {
  const scans = ref<ScanInfo[]>([])
  const scanTypes = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let ws: WebSocket | null = null

  // Getters
  const runningScans = computed(() => scans.value.filter(s => s.status === 'Running' || s.status === 'Scanning'))
  const completedScans = computed(() => scans.value.filter(s => s.status === 'Done' || s.status === 'Completed'))
  const failedScans = computed(() => scans.value.filter(s => s.status === 'Failed' || s.status === 'Errored'))
  const pendingScans = computed(() => scans.value.filter(s => s.status === 'Pending'))

  // Actions
  async function fetchScans() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE}/api/scans`)
      if (!response.ok) throw new Error('Failed to fetch scans')
      scans.value = await response.json()
    } catch (e) {
      error.value = (e as Error).message
      console.error('[ScansStore] Error fetching scans:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchScanTypes() {
    try {
      const response = await fetch(`${API_BASE}/api/scantypes`)
      if (!response.ok) throw new Error('Failed to fetch scan types')
      scanTypes.value = await response.json()
    } catch (e) {
      console.error('[ScansStore] Error fetching scan types:', e)
    }
  }

  async function getScan(name: string): Promise<ScanInfo | null> {
    try {
      const response = await fetch(`${API_BASE}/api/scans/${name}`)
      if (!response.ok) return null
      return await response.json()
    } catch (e) {
      console.error('[ScansStore] Error getting scan:', e)
      return null
    }
  }

  async function createScan(name: string, scanType: string, parameters: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scanType, parameters })
      })
      if (!response.ok) throw new Error('Failed to create scan')
      await fetchScans() // Refresh the list
      return true
    } catch (e) {
      console.error('[ScansStore] Error creating scan:', e)
      return false
    }
  }

  async function deleteScan(name: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/scans/${name}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete scan')
      scans.value = scans.value.filter(s => s.name !== name)
      return true
    } catch (e) {
      console.error('[ScansStore] Error deleting scan:', e)
      return false
    }
  }

  function connectWebSocket() {
    if (ws?.readyState === WebSocket.OPEN) return

    ws = new WebSocket(`${WS_BASE}/ws`)

    ws.onopen = () => {
      console.log('[ScansStore] WebSocket connected')
      ws?.send(JSON.stringify({ type: 'subscribe', resource: 'scans' }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'scans_initial' || data.type === 'scans') {
          scans.value = data.data
        } else if (data.type === 'scan_added') {
          const existing = scans.value.findIndex(s => s.name === data.scan.name)
          if (existing === -1) {
            scans.value.push(data.scan)
          }
        } else if (data.type === 'scan_modified') {
          const index = scans.value.findIndex(s => s.name === data.scan.name)
          if (index !== -1) {
            scans.value[index] = data.scan
          }
        } else if (data.type === 'scan_deleted') {
          scans.value = scans.value.filter(s => s.name !== data.name)
        }
      } catch (e) {
        console.error('[ScansStore] Error parsing WebSocket message:', e)
      }
    }

    ws.onerror = (error) => {
      console.error('[ScansStore] WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('[ScansStore] WebSocket disconnected')
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (ws?.readyState !== WebSocket.OPEN) {
          connectWebSocket()
        }
      }, 3000)
    }
  }

  function disconnectWebSocket() {
    if (ws) {
      ws.send(JSON.stringify({ type: 'unsubscribe', resource: 'scans' }))
      ws.close()
      ws = null
    }
  }

  return {
    scans,
    scanTypes,
    loading,
    error,
    runningScans,
    completedScans,
    failedScans,
    pendingScans,
    fetchScans,
    fetchScanTypes,
    getScan,
    createScan,
    deleteScan,
    connectWebSocket,
    disconnectWebSocket
  }
})

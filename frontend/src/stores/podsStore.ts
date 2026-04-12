import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''
const WS_BASE = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080`

export interface PodInfo {
  name: string
  namespace: string
  status: string
  ready: string
  restarts: number
  age: string
  ip: string
  node: string
  containers: ContainerInfo[]
}

export interface ContainerInfo {
  name: string
  image: string
  ready: boolean
  restarts: number
  ports: { name?: string; containerPort: number; protocol: string }[]
  env: { name: string; value: string }[]
}

export interface PodMetrics {
  name: string
  cpu: number
  cpuLimit: number
  memory: number
  memoryLimit: number
}

export const usePodsStore = defineStore('pods', () => {
  // State
  const pods = ref<PodInfo[]>([])
  const metrics = ref<Map<string, PodMetrics>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const connected = ref(false)
  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  // Computed
  const runningPods = computed(() => pods.value.filter(p => p.status === 'Running'))
  const completedPods = computed(() => pods.value.filter(p => p.status === 'Succeeded'))
  const failedPods = computed(() => pods.value.filter(p => p.status === 'Failed'))

  // Actions
  async function fetchPods() {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/pods`, {
        signal: AbortSignal.timeout(10000)
      })
      if (!response.ok) throw new Error('Failed to fetch pods')
      pods.value = await response.json()
    } catch (e) {
      error.value = (e as Error).message
      console.error('[PodsStore] Error fetching pods:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchPodMetrics(name: string): Promise<PodMetrics | null> {
    try {
      const response = await fetch(`${API_BASE}/api/pods/${name}/metrics`)
      if (!response.ok) return null
      const data = await response.json()
      metrics.value.set(name, data)
      return data
    } catch {
      return null
    }
  }

  async function fetchPodLogs(name: string, container?: string, tailLines = 100): Promise<string> {
    const params = new URLSearchParams({ tailLines: tailLines.toString() })
    if (container) params.set('container', container)

    const response = await fetch(`${API_BASE}/api/pods/${name}/logs?${params}`)
    if (!response.ok) throw new Error('Failed to fetch logs')
    const data = await response.json()
    return data.logs
  }

  async function deletePod(name: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/api/pods/${name}`, { method: 'DELETE' })
    if (response.ok) {
      pods.value = pods.value.filter(p => p.name !== name)
      return true
    }
    return false
  }

  // WebSocket connection
  function connectWebSocket() {
    if (ws?.readyState === WebSocket.OPEN) return

    ws = new WebSocket(`${WS_BASE}/ws`)

    ws.onopen = () => {
      console.log('[PodsStore] WebSocket connected')
      connected.value = true
      error.value = null
      // Subscribe to pods and metrics
      ws?.send(JSON.stringify({ type: 'subscribe', resource: 'pods' }))
      ws?.send(JSON.stringify({ type: 'subscribe', resource: 'metrics' }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'pods_initial') {
          pods.value = data.data
        } else if (data.type === 'pod_added') {
          const index = pods.value.findIndex(p => p.name === data.pod.name)
          if (index === -1) {
            pods.value.push(data.pod)
          }
        } else if (data.type === 'pod_modified') {
          const index = pods.value.findIndex(p => p.name === data.pod.name)
          if (index !== -1) {
            pods.value[index] = data.pod
          }
        } else if (data.type === 'pod_deleted') {
          pods.value = pods.value.filter(p => p.name !== data.name)
        } else if (data.type === 'metrics') {
          for (const m of data.data) {
            metrics.value.set(m.name, m)
          }
        }
      } catch (e) {
        console.error('[PodsStore] Error parsing message:', e)
      }
    }

    ws.onclose = () => {
      console.log('[PodsStore] WebSocket disconnected, reconnecting in 3s...')
      connected.value = false
      reconnectTimeout = setTimeout(connectWebSocket, 3000)
    }

    ws.onerror = (e) => {
      console.error('[PodsStore] WebSocket error:', e)
      error.value = 'Erreur de connexion WebSocket'
    }
  }

  function disconnectWebSocket() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
  }

  return {
    // State
    pods,
    metrics,
    loading,
    error,
    connected,
    // Computed
    runningPods,
    completedPods,
    failedPods,
    // Actions
    fetchPods,
    fetchPodMetrics,
    fetchPodLogs,
    deletePod,
    connectWebSocket,
    disconnectWebSocket
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

const API_BASE = import.meta.env.VITE_API_URL || ''
const WS_BASE = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080`

export const useConnectionStore = defineStore('connection', () => {
  // État
  const status = ref<ConnectionStatus>('disconnected')
  const lastError = ref<string | null>(null)
  const clusterAvailable = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 10

  let ws: WebSocket | null = null
  let healthCheckInterval: ReturnType<typeof setInterval> | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  // Getters
  const isConnected = computed(() => status.value === 'connected')
  const isConnecting = computed(() => status.value === 'connecting')
  const hasError = computed(() => status.value === 'error')
  const statusMessage = computed(() => {
    switch (status.value) {
      case 'disconnected':
        return 'Déconnecté'
      case 'connecting':
        return reconnectAttempts.value > 0
          ? `Reconnexion... (${reconnectAttempts.value}/${maxReconnectAttempts})`
          : 'Connexion en cours...'
      case 'connected':
        return clusterAvailable.value ? 'Connecté au cluster' : 'Backend connecté, en attente du cluster...'
      case 'error':
        return lastError.value || 'Erreur de connexion'
    }
  })

  const statusSeverity = computed(() => {
    switch (status.value) {
      case 'connected':
        return clusterAvailable.value ? 'success' : 'warning'
      case 'connecting':
        return 'info'
      case 'error':
      case 'disconnected':
        return 'danger'
    }
  })

  // Actions
  async function checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/health`, {
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function checkClusterStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/cluster/status`, {
        signal: AbortSignal.timeout(10000)
      })
      if (!response.ok) return false
      const data = await response.json()
      return data.operator === true
    } catch {
      return false
    }
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return
    if (status.value === 'connecting') return

    status.value = 'connecting'
    lastError.value = null

    // D'abord vérifier que le backend est accessible
    checkHealth().then(healthy => {
      if (!healthy) {
        handleConnectionError('Backend non accessible')
        return
      }

      // Ensuite établir la connexion WebSocket
      ws = new WebSocket(`${WS_BASE}/ws`)

      ws.onopen = async () => {
        console.log('[Connection] WebSocket connected')
        status.value = 'connected'
        reconnectAttempts.value = 0
        lastError.value = null

        // Vérifier si le cluster K8s est disponible
        clusterAvailable.value = await checkClusterStatus()

        // Lancer la vérification périodique du cluster
        startClusterHealthCheck()
      }

      ws.onclose = () => {
        console.log('[Connection] WebSocket disconnected')
        stopClusterHealthCheck()
        handleConnectionError('Connexion perdue')
      }

      ws.onerror = (error) => {
        console.error('[Connection] WebSocket error:', error)
      }

      ws.onmessage = () => {
        // Les messages sont gérés par les stores individuels
      }
    })
  }

  function handleConnectionError(errorMessage: string) {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      status.value = 'error'
      lastError.value = `${errorMessage} - Tentatives épuisées`
      return
    }

    status.value = 'connecting'
    lastError.value = errorMessage
    reconnectAttempts.value++

    // Backoff exponentiel: 1s, 2s, 4s, 8s... max 30s
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value - 1), 30000)
    console.log(`[Connection] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value})`)

    reconnectTimeout = setTimeout(() => {
      connect()
    }, delay)
  }

  function startClusterHealthCheck() {
    stopClusterHealthCheck()

    // Vérifier le cluster toutes les 10 secondes
    healthCheckInterval = setInterval(async () => {
      const wasAvailable = clusterAvailable.value
      clusterAvailable.value = await checkClusterStatus()

      if (!wasAvailable && clusterAvailable.value) {
        console.log('[Connection] Cluster became available')
      } else if (wasAvailable && !clusterAvailable.value) {
        console.log('[Connection] Cluster became unavailable')
      }
    }, 10000)
  }

  function stopClusterHealthCheck() {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      healthCheckInterval = null
    }
  }

  function disconnect() {
    stopClusterHealthCheck()

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (ws) {
      ws.close()
      ws = null
    }

    status.value = 'disconnected'
    clusterAvailable.value = false
    reconnectAttempts.value = 0
  }

  function resetAndReconnect() {
    disconnect()
    reconnectAttempts.value = 0
    connect()
  }

  return {
    // State
    status,
    lastError,
    clusterAvailable,
    reconnectAttempts,
    // Computed
    isConnected,
    isConnecting,
    hasError,
    statusMessage,
    statusSeverity,
    // Actions
    connect,
    disconnect,
    resetAndReconnect,
    checkHealth,
    checkClusterStatus
  }
})

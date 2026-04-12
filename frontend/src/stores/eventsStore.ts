import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface K8sEvent {
  time: string
  type: string
  reason: string
  object: string
  message: string
  count: number
}

const API_BASE = import.meta.env.VITE_API_URL || ''
const WS_BASE = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080`

export const useEventsStore = defineStore('events', () => {
  const events = ref<K8sEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let ws: WebSocket | null = null

  // Getters
  const warningEvents = computed(() => events.value.filter(e => e.type === 'Warning'))
  const normalEvents = computed(() => events.value.filter(e => e.type === 'Normal'))
  const recentEvents = computed(() => events.value.slice(0, 10))

  // Actions
  async function fetchEvents(limit: number = 50) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE}/api/events?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch events')
      events.value = await response.json()
    } catch (e) {
      error.value = (e as Error).message
      console.error('[EventsStore] Error fetching events:', e)
    } finally {
      loading.value = false
    }
  }

  function connectWebSocket() {
    if (ws?.readyState === WebSocket.OPEN) return

    ws = new WebSocket(`${WS_BASE}/ws`)

    ws.onopen = () => {
      console.log('[EventsStore] WebSocket connected')
      ws?.send(JSON.stringify({ type: 'subscribe', resource: 'events' }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'events_initial' || data.type === 'events') {
          events.value = data.data
        } else if (data.type === 'event') {
          // Ajouter le nouvel événement au début
          events.value.unshift(data.data)
          // Garder seulement les 100 derniers événements
          if (events.value.length > 100) {
            events.value = events.value.slice(0, 100)
          }
        }
      } catch (e) {
        console.error('[EventsStore] Error parsing WebSocket message:', e)
      }
    }

    ws.onerror = (error) => {
      console.error('[EventsStore] WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('[EventsStore] WebSocket disconnected')
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
      ws.send(JSON.stringify({ type: 'unsubscribe', resource: 'events' }))
      ws.close()
      ws = null
    }
  }

  function clearEvents() {
    events.value = []
  }

  return {
    events,
    loading,
    error,
    warningEvents,
    normalEvents,
    recentEvents,
    fetchEvents,
    connectWebSocket,
    disconnectWebSocket,
    clearEvents
  }
})

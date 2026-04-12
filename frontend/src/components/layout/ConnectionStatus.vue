<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useConnectionStore } from '@/stores/connectionStore'

const connectionStore = useConnectionStore()
const isReconnecting = ref(false)

onMounted(() => {
  connectionStore.connect()
})

onUnmounted(() => {
  connectionStore.disconnect()
})

const getIcon = () => {
  switch (connectionStore.status) {
    case 'connected':
      return connectionStore.clusterAvailable ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'
    case 'connecting':
      return 'pi pi-spin pi-spinner'
    case 'error':
    case 'disconnected':
      return 'pi pi-times-circle'
  }
}

const getColor = () => {
  switch (connectionStore.statusSeverity) {
    case 'success': return 'text-green-500'
    case 'warning': return 'text-yellow-500'
    case 'info': return 'text-blue-500'
    case 'danger': return 'text-red-500'
  }
}

const handleReconnect = async () => {
  isReconnecting.value = true
  try {
    await connectionStore.reconnectToCluster()
  } finally {
    isReconnecting.value = false
  }
}
</script>

<template>
  <div class="connection-status flex align-items-center gap-2">
    <i :class="[getIcon(), getColor()]"></i>
    <span class="status-text text-sm" :class="getColor()">
      {{ connectionStore.statusMessage }}
    </span>
    <Button
      :icon="isReconnecting ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"
      text
      rounded
      size="small"
      :disabled="isReconnecting || connectionStore.isConnecting"
      @click="handleReconnect"
      v-tooltip.bottom="'Reconnecter au cluster'"
      class="reconnect-btn"
    />
  </div>
</template>

<style scoped>
.connection-status {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  background: var(--surface-ground);
}

.status-text {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reconnect-btn {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.reconnect-btn:hover:not(:disabled) {
  opacity: 1;
}

@media (max-width: 768px) {
  .status-text {
    display: none;
  }
}
</style>

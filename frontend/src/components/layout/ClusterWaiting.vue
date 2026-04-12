<script setup lang="ts">
import { computed } from 'vue'
import { useConnectionStore } from '@/stores/connectionStore'

const connectionStore = useConnectionStore()

const showOverlay = computed(() => {
  return !connectionStore.isConnected || !connectionStore.clusterAvailable
})

const message = computed(() => {
  if (connectionStore.status === 'disconnected') {
    return 'Connexion au backend...'
  }
  if (connectionStore.status === 'connecting') {
    return connectionStore.reconnectAttempts > 0
      ? `Reconnexion en cours... (tentative ${connectionStore.reconnectAttempts})`
      : 'Connexion au backend...'
  }
  if (connectionStore.status === 'error') {
    return 'Impossible de se connecter au backend'
  }
  if (connectionStore.isConnected && !connectionStore.clusterAvailable) {
    return 'En attente du cluster Kubernetes...'
  }
  return ''
})

const subMessage = computed(() => {
  if (connectionStore.status === 'error') {
    return 'Vérifiez que le backend est démarré (make dev)'
  }
  if (connectionStore.isConnected && !connectionStore.clusterAvailable) {
    return 'Le cluster Kind n\'est pas encore disponible. Lancez-le avec: kind create cluster --name securecodebox'
  }
  return 'Veuillez patienter...'
})
</script>

<template>
  <div v-if="showOverlay" class="cluster-waiting-overlay">
    <div class="waiting-content">
      <div class="waiting-icon mb-4">
        <i
          v-if="connectionStore.status === 'error'"
          class="pi pi-exclamation-triangle text-6xl text-red-400"
        ></i>
        <i
          v-else
          class="pi pi-spin pi-spinner text-6xl text-primary"
        ></i>
      </div>

      <h2 class="text-2xl font-semibold mb-2">{{ message }}</h2>
      <p class="text-color-secondary mb-4">{{ subMessage }}</p>

      <div v-if="connectionStore.status === 'error'" class="flex gap-2">
        <Button
          label="Réessayer"
          icon="pi pi-refresh"
          @click="connectionStore.resetAndReconnect()"
        />
        <Button
          label="Onboarding"
          icon="pi pi-play"
          severity="secondary"
          @click="$router.push('/onboarding')"
        />
      </div>

      <div v-else class="progress-container">
        <ProgressBar mode="indeterminate" style="height: 4px" />
      </div>

      <div class="mt-4 text-sm text-color-secondary">
        <div class="flex align-items-center gap-2 mb-2">
          <i :class="connectionStore.isConnected ? 'pi pi-check text-green-500' : 'pi pi-spin pi-spinner text-blue-400'"></i>
          <span>Backend API</span>
        </div>
        <div class="flex align-items-center gap-2">
          <i :class="connectionStore.clusterAvailable ? 'pi pi-check text-green-500' : 'pi pi-spin pi-spinner text-blue-400'"></i>
          <span>Cluster Kubernetes</span>
        </div>
      </div>
    </div>
  </div>

  <slot v-else />
</template>

<style scoped>
.cluster-waiting-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.waiting-content {
  text-align: center;
  max-width: 500px;
  padding: 2rem;
}

.waiting-icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.progress-container {
  width: 300px;
  margin: 0 auto;
}
</style>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { usePodsStore } from '@/stores/podsStore'
import { useConnectionStore } from '@/stores/connectionStore'
import ClusterOverview from '@/components/dashboard/ClusterOverview.vue'
import PodsLiveView from '@/components/dashboard/PodsLiveView.vue'
import ActivityStream from '@/components/dashboard/ActivityStream.vue'

const podsStore = usePodsStore()
const connectionStore = useConnectionStore()

onMounted(() => {
  podsStore.fetchPods()
  podsStore.connectWebSocket()
})

onUnmounted(() => {
  podsStore.disconnectWebSocket()
})

const stats = computed(() => ({
  total: podsStore.pods.length,
  running: podsStore.runningPods.length,
  completed: podsStore.completedPods.length,
  failed: podsStore.failedPods.length
}))

const showWaiting = computed(() => !connectionStore.isConnected || !connectionStore.clusterAvailable)
</script>

<template>
  <div class="dashboard">
    <!-- Waiting state -->
    <div v-if="showWaiting" class="waiting-card mb-4">
      <Card>
        <template #content>
          <div class="flex flex-column align-items-center py-5">
            <i
              v-if="connectionStore.hasError"
              class="pi pi-exclamation-triangle text-5xl text-red-400 mb-4"
            ></i>
            <i
              v-else
              class="pi pi-spin pi-spinner text-5xl text-primary mb-4"
            ></i>

            <h3 class="text-xl font-semibold mb-2">
              <template v-if="!connectionStore.isConnected">
                Connexion au backend...
              </template>
              <template v-else-if="!connectionStore.clusterAvailable">
                En attente du cluster Kubernetes...
              </template>
              <template v-else-if="connectionStore.hasError">
                Erreur de connexion
              </template>
            </h3>

            <p class="text-color-secondary text-center mb-4" style="max-width: 400px">
              <template v-if="connectionStore.hasError">
                Impossible de se connecter au backend. Vérifiez qu'il est démarré.
              </template>
              <template v-else-if="!connectionStore.clusterAvailable">
                Le cluster n'est pas encore disponible. Les données s'afficheront automatiquement dès qu'il sera prêt.
              </template>
              <template v-else>
                Veuillez patienter...
              </template>
            </p>

            <ProgressBar
              v-if="!connectionStore.hasError"
              mode="indeterminate"
              style="width: 300px; height: 4px"
              class="mb-4"
            />

            <div class="flex gap-2">
              <Button
                v-if="connectionStore.hasError"
                label="Réessayer"
                icon="pi pi-refresh"
                @click="connectionStore.resetAndReconnect()"
              />
              <Button
                label="Voir l'onboarding"
                icon="pi pi-play"
                :severity="connectionStore.hasError ? 'secondary' : 'primary'"
                outlined
                @click="$router.push('/onboarding')"
              />
            </div>

            <div class="mt-5 text-sm">
              <div class="flex align-items-center gap-2 mb-2">
                <i :class="connectionStore.isConnected ? 'pi pi-check text-green-500' : 'pi pi-spin pi-spinner text-blue-400'"></i>
                <span :class="connectionStore.isConnected ? 'text-green-500' : ''">Backend API</span>
              </div>
              <div class="flex align-items-center gap-2">
                <i :class="connectionStore.clusterAvailable ? 'pi pi-check text-green-500' : 'pi pi-spin pi-spinner text-blue-400'"></i>
                <span :class="connectionStore.clusterAvailable ? 'text-green-500' : ''">Cluster Kubernetes</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Normal dashboard content -->
    <template v-else>
      <!-- Cluster Overview -->
      <section class="mb-4">
        <h3 class="text-lg font-semibold mb-3">
          <i class="pi pi-server mr-2"></i>
          Cluster Overview
        </h3>
        <ClusterOverview :stats="stats" />
      </section>

      <!-- Pods Live View -->
      <section class="mb-4">
        <div class="flex justify-content-between align-items-center mb-3">
          <h3 class="text-lg font-semibold m-0">
            <i class="pi pi-box mr-2"></i>
            Pods Live View
          </h3>
          <Button
            label="Voir tous"
            icon="pi pi-arrow-right"
            text
            size="small"
            @click="$router.push('/pods')"
          />
        </div>
        <PodsLiveView :pods="podsStore.pods" :metrics="podsStore.metrics" :loading="podsStore.loading" />
      </section>

      <!-- Activity Stream -->
      <section>
        <h3 class="text-lg font-semibold mb-3">
          <i class="pi pi-clock mr-2"></i>
          Activity Stream
        </h3>
        <ActivityStream />
      </section>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1400px;
}

.waiting-card {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

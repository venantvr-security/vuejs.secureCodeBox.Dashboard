<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { usePodsStore } from '@/stores/podsStore'
import PodCard from '@/components/pods/PodCard.vue'

const podsStore = usePodsStore()

onMounted(() => {
  podsStore.fetchPods()
  podsStore.connectWebSocket()
})

onUnmounted(() => {
  podsStore.disconnectWebSocket()
})
</script>

<template>
  <div class="pods-view">
    <Toolbar class="mb-4">
      <template #start>
        <h2 class="m-0">Pods</h2>
      </template>
      <template #end>
        <Button
          icon="pi pi-refresh"
          label="Rafraîchir"
          text
          @click="podsStore.fetchPods()"
          :loading="podsStore.loading"
        />
      </template>
    </Toolbar>

    <!-- Stats summary -->
    <div class="stats-bar mb-4">
      <Tag severity="success" :value="`${podsStore.runningPods.length} Running`" />
      <Tag severity="warning" :value="`${podsStore.pods.filter(p => p.status === 'Pending').length} Pending`" />
      <Tag severity="info" :value="`${podsStore.completedPods.length} Completed`" />
      <Tag severity="danger" :value="`${podsStore.failedPods.length} Failed`" />
    </div>

    <!-- Pods grid -->
    <div class="pods-grid">
      <template v-if="podsStore.loading && podsStore.pods.length === 0">
        <Skeleton v-for="i in 6" :key="i" height="180px" borderRadius="8px" />
      </template>

      <PodCard
        v-for="pod in podsStore.pods"
        :key="pod.name"
        :pod="pod"
        :metrics="podsStore.metrics.get(pod.name)"
      />
    </div>

    <!-- Empty state -->
    <div v-if="!podsStore.loading && podsStore.pods.length === 0" class="empty-state">
      <i class="pi pi-inbox text-6xl text-color-secondary mb-4"></i>
      <h3>Aucun pod trouvé</h3>
      <p class="text-color-secondary">
        Lancez un scan pour voir les pods apparaître ici.
      </p>
    </div>
  </div>
</template>

<style scoped>
.stats-bar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stats-bar :deep(.p-tag) {
  padding: 0.6rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
}

.pods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .pods-grid {
    grid-template-columns: 1fr;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 2rem;
  text-align: center;
}
</style>

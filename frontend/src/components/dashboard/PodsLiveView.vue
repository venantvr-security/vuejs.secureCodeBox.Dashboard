<script setup lang="ts">
import { computed } from 'vue'
import type { PodInfo, PodMetrics } from '@/stores/podsStore'
import PodCard from '@/components/pods/PodCard.vue'

const props = defineProps<{
  pods: PodInfo[]
  metrics: Map<string, PodMetrics>
  loading: boolean
}>()

// Afficher les 6 premiers pods, prioriser les Running
const displayedPods = computed(() => {
  return [...props.pods]
    .sort((a, b) => {
      const order = ['Running', 'Pending', 'Failed', 'Succeeded', 'Unknown']
      return order.indexOf(a.status) - order.indexOf(b.status)
    })
    .slice(0, 6)
})
</script>

<template>
  <div class="pods-grid">
    <!-- Loading skeletons -->
    <template v-if="loading && pods.length === 0">
      <Skeleton v-for="i in 4" :key="i" height="180px" borderRadius="8px" />
    </template>

    <!-- Pod cards -->
    <template v-else>
      <PodCard
        v-for="pod in displayedPods"
        :key="pod.name"
        :pod="pod"
        :metrics="metrics.get(pod.name)"
      />
    </template>

    <!-- Empty state -->
    <div v-if="!loading && pods.length === 0" class="empty-state">
      <i class="pi pi-inbox text-4xl text-color-secondary mb-3"></i>
      <p class="text-color-secondary">Aucun pod trouvé</p>
    </div>
  </div>
</template>

<style scoped>
.pods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
}
</style>

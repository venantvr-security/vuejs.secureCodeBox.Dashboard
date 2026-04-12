<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useEventsStore } from '@/stores/eventsStore'

const eventsStore = useEventsStore()

onMounted(() => {
  eventsStore.fetchEvents(20)
  eventsStore.connectWebSocket()
})

onUnmounted(() => {
  eventsStore.disconnectWebSocket()
})

const activities = computed(() => {
  return eventsStore.recentEvents.map(event => ({
    time: event.time,
    message: `${event.reason}: ${event.object} - ${event.message}`,
    type: event.type === 'Warning' ? 'warning' : (
      event.reason === 'Completed' || event.reason === 'Started' ? 'success' : 'info'
    )
  }))
})

const typeIcon = (type: string) => {
  switch (type) {
    case 'success': return 'pi pi-check-circle text-green-500'
    case 'warning': return 'pi pi-exclamation-triangle text-yellow-500'
    case 'error': return 'pi pi-times-circle text-red-500'
    default: return 'pi pi-info-circle text-blue-500'
  }
}
</script>

<template>
  <Card class="activity-card">
    <template #content>
      <ScrollPanel style="height: 300px">
        <div
          v-for="(activity, index) in activities"
          :key="index"
          class="activity-item"
        >
          <span class="activity-time">{{ activity.time }}</span>
          <i :class="typeIcon(activity.type)"></i>
          <span class="activity-message">{{ activity.message }}</span>
        </div>

        <div v-if="activities.length === 0" class="text-center text-color-secondary py-4">
          <i class="pi pi-clock text-3xl mb-2"></i>
          <p class="m-0">Aucune activité récente</p>
        </div>
      </ScrollPanel>
    </template>
  </Card>
</template>

<style scoped>
.activity-card :deep(.p-card-content) {
  padding: 0;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
  transition: background 0.15s ease;
}

.activity-item:hover {
  background: var(--surface-hover);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-time {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  min-width: 80px;
  flex-shrink: 0;
}

.activity-message {
  flex: 1;
  font-size: 0.95rem;
  word-break: break-word;
  line-height: 1.4;
}
</style>

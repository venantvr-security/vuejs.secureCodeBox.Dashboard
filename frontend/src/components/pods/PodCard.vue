<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { PodInfo, PodMetrics } from '@/stores/podsStore'

const props = defineProps<{
  pod: PodInfo
  metrics?: PodMetrics
}>()

const router = useRouter()

const statusClass = computed(() => {
  switch (props.pod.status) {
    case 'Running': return 'running'
    case 'Pending': return 'pending'
    case 'Failed': return 'failed'
    case 'Succeeded': return 'succeeded'
    default: return ''
  }
})

const cpuPercent = computed(() => {
  if (!props.metrics) return 0
  return Math.min(100, Math.round((props.metrics.cpu / props.metrics.cpuLimit) * 100))
})

const memPercent = computed(() => {
  if (!props.metrics) return 0
  return Math.min(100, Math.round((props.metrics.memory / props.metrics.memoryLimit) * 100))
})

const formatMemory = (bytes: number) => {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}Gi`
  if (bytes > 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}Mi`
  if (bytes > 1024) return `${Math.round(bytes / 1024)}Ki`
  return `${bytes}B`
}

const ports = computed(() => {
  return props.pod.containers
    .flatMap(c => c.ports)
    .map(p => `${p.containerPort}/${p.protocol}`)
    .join(', ')
})

function viewLogs() {
  router.push(`/pods/${props.pod.name}?tab=logs`)
}

function viewDetails() {
  router.push(`/pods/${props.pod.name}`)
}
</script>

<template>
  <div class="pod-card" @click="viewDetails">
    <!-- Header -->
    <div class="pod-header">
      <span class="pod-status" :class="statusClass"></span>
      <span class="pod-name" :title="pod.name">{{ pod.name }}</span>
      <Tag :value="pod.status" :severity="statusClass === 'running' ? 'success' : statusClass === 'failed' ? 'danger' : 'warning'" size="small" />
    </div>

    <!-- Metrics -->
    <div class="pod-metrics" v-if="metrics">
      <div class="metric-item">
        <span class="metric-label">CPU: {{ cpuPercent }}%</span>
        <div class="metric-bar">
          <div class="metric-fill cpu" :style="{ width: `${cpuPercent}%` }"></div>
        </div>
      </div>
      <div class="metric-item">
        <span class="metric-label">MEM: {{ formatMemory(metrics.memory) }}</span>
        <div class="metric-bar">
          <div class="metric-fill memory" :style="{ width: `${memPercent}%` }"></div>
        </div>
      </div>
    </div>

    <!-- No metrics placeholder -->
    <div class="pod-metrics" v-else>
      <div class="metric-item">
        <span class="metric-label">CPU: --</span>
        <div class="metric-bar">
          <div class="metric-fill cpu" style="width: 0%"></div>
        </div>
      </div>
      <div class="metric-item">
        <span class="metric-label">MEM: --</span>
        <div class="metric-bar">
          <div class="metric-fill memory" style="width: 0%"></div>
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="pod-info">
      <span><i class="pi pi-refresh mr-1"></i>{{ pod.restarts }}</span>
      <span><i class="pi pi-clock mr-1"></i>{{ pod.age }}</span>
      <span v-if="pod.ip"><i class="pi pi-globe mr-1"></i>{{ pod.ip }}</span>
    </div>

    <!-- Ports -->
    <div class="pod-info" v-if="ports">
      <span><i class="pi pi-link mr-1"></i>{{ ports }}</span>
    </div>

    <!-- Actions -->
    <div class="pod-actions" @click.stop>
      <Button
        icon="pi pi-file"
        text
        rounded
        size="small"
        v-tooltip="'Logs'"
        @click="viewLogs"
      />
      <Button
        icon="pi pi-info-circle"
        text
        rounded
        size="small"
        v-tooltip="'Détails'"
        @click="viewDetails"
      />
    </div>
  </div>
</template>

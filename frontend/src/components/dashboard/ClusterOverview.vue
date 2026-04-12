<script setup lang="ts">
defineProps<{
  stats: {
    total: number
    running: number
    completed: number
    failed: number
  }
}>()
</script>

<template>
  <div class="overview-grid">
    <!-- Pods Running -->
    <div class="stat-card">
      <Knob
        :modelValue="stats.total > 0 ? Math.round((stats.running / stats.total) * 100) : 0"
        :size="80"
        :strokeWidth="8"
        valueColor="#22c55e"
        rangeColor="var(--surface-border)"
        readonly
      />
      <div class="stat-value text-green-500">{{ stats.running }}</div>
      <div class="stat-label">Running</div>
    </div>

    <!-- Pods Completed -->
    <div class="stat-card">
      <Knob
        :modelValue="stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0"
        :size="80"
        :strokeWidth="8"
        valueColor="#6b7280"
        rangeColor="var(--surface-border)"
        readonly
      />
      <div class="stat-value text-gray-500">{{ stats.completed }}</div>
      <div class="stat-label">Completed</div>
    </div>

    <!-- Pods Failed -->
    <div class="stat-card">
      <Knob
        :modelValue="stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0"
        :size="80"
        :strokeWidth="8"
        valueColor="#ef4444"
        rangeColor="var(--surface-border)"
        readonly
      />
      <div class="stat-value text-red-500">{{ stats.failed }}</div>
      <div class="stat-label">Failed</div>
    </div>

    <!-- Total -->
    <div class="stat-card">
      <Knob
        :modelValue="100"
        :size="80"
        :strokeWidth="8"
        valueColor="var(--primary-color)"
        rangeColor="var(--surface-border)"
        readonly
      />
      <div class="stat-value text-primary">{{ stats.total }}</div>
      <div class="stat-label">Total Pods</div>
    </div>
  </div>
</template>

<style scoped>
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}
</style>

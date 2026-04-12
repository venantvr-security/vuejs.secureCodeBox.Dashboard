<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useEventsStore } from '@/stores/eventsStore'

const eventsStore = useEventsStore()
const autoRefresh = ref(true)

onMounted(() => {
  eventsStore.fetchEvents()
  if (autoRefresh.value) {
    eventsStore.connectWebSocket()
  }
})

onUnmounted(() => {
  eventsStore.disconnectWebSocket()
})

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    eventsStore.connectWebSocket()
  } else {
    eventsStore.disconnectWebSocket()
  }
}

const typeSeverity = (type: string) => type === 'Warning' ? 'warning' : 'info'
</script>

<template>
  <div class="events-view">
    <Toolbar class="mb-4">
      <template #start>
        <h2 class="m-0">
          <i class="pi pi-history mr-2"></i>
          Events
        </h2>
      </template>
      <template #end>
        <div class="flex align-items-center gap-3">
          <div class="flex align-items-center gap-2">
            <InputSwitch v-model="autoRefresh" @change="toggleAutoRefresh" />
            <span class="text-sm text-color-secondary">Auto-refresh</span>
          </div>
          <Button
            icon="pi pi-refresh"
            label="Rafraîchir"
            text
            @click="eventsStore.fetchEvents()"
            :loading="eventsStore.loading"
          />
        </div>
      </template>
    </Toolbar>

    <!-- Stats -->
    <div class="events-stats-grid mb-4">
      <Card class="stat-card-item">
        <template #content>
          <div class="flex align-items-center gap-4">
            <div class="stat-icon stat-icon-primary">
              <i class="pi pi-list"></i>
            </div>
            <div>
              <div class="stat-number">{{ eventsStore.events.length }}</div>
              <div class="stat-label">Total</div>
            </div>
          </div>
        </template>
      </Card>
      <Card class="stat-card-item">
        <template #content>
          <div class="flex align-items-center gap-4">
            <div class="stat-icon stat-icon-blue">
              <i class="pi pi-info-circle"></i>
            </div>
            <div>
              <div class="stat-number">{{ eventsStore.normalEvents.length }}</div>
              <div class="stat-label">Normal</div>
            </div>
          </div>
        </template>
      </Card>
      <Card class="stat-card-item">
        <template #content>
          <div class="flex align-items-center gap-4">
            <div class="stat-icon" style="background: rgba(234, 179, 8, 0.15); color: #eab308;">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <div>
              <div class="stat-number">{{ eventsStore.warningEvents.length }}</div>
              <div class="stat-label">Warning</div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Table -->
    <Card>
      <template #content>
        <DataTable
          :value="eventsStore.events"
          :loading="eventsStore.loading"
          stripedRows
          paginator
          :rows="20"
          :rowsPerPageOptions="[10, 20, 50, 100]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          emptyMessage="Aucun événement"
        >
          <Column field="time" header="Time" style="min-width: 110px">
            <template #body="{ data }">
              <span class="font-mono">{{ data.time }}</span>
            </template>
          </Column>
          <Column field="type" header="Type" style="min-width: 110px">
            <template #body="{ data }">
              <Tag :value="data.type" :severity="typeSeverity(data.type)" />
            </template>
          </Column>
          <Column field="reason" header="Reason" style="min-width: 140px">
            <template #body="{ data }">
              <span class="font-semibold">{{ data.reason }}</span>
            </template>
          </Column>
          <Column field="object" header="Object" style="min-width: 280px">
            <template #body="{ data }">
              <code class="object-code">{{ data.object }}</code>
            </template>
          </Column>
          <Column field="message" header="Message">
            <template #body="{ data }">
              <span class="text-color-secondary">{{ data.message }}</span>
            </template>
          </Column>
          <Column field="count" header="Count" style="min-width: 90px">
            <template #body="{ data }">
              <Badge :value="data.count" severity="secondary" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.events-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .events-stats-grid {
    grid-template-columns: 1fr;
  }
}

.font-mono {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9rem;
}

.object-code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9rem;
  background: var(--surface-ground);
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  display: inline-block;
  word-break: break-word;
}
</style>

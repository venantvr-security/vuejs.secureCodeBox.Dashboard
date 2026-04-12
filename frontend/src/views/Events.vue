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
    <div class="grid mb-4">
      <div class="col-4">
        <Card>
          <template #content>
            <div class="flex align-items-center">
              <i class="pi pi-list text-2xl text-primary mr-3"></i>
              <div>
                <div class="text-2xl font-bold">{{ eventsStore.events.length }}</div>
                <div class="text-color-secondary">Total</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-4">
        <Card>
          <template #content>
            <div class="flex align-items-center">
              <i class="pi pi-info-circle text-2xl text-blue-500 mr-3"></i>
              <div>
                <div class="text-2xl font-bold">{{ eventsStore.normalEvents.length }}</div>
                <div class="text-color-secondary">Normal</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-4">
        <Card>
          <template #content>
            <div class="flex align-items-center">
              <i class="pi pi-exclamation-triangle text-2xl text-yellow-500 mr-3"></i>
              <div>
                <div class="text-2xl font-bold">{{ eventsStore.warningEvents.length }}</div>
                <div class="text-color-secondary">Warning</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
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
          emptyMessage="Aucun événement"
        >
          <Column field="time" header="Time" style="width: 100px">
            <template #body="{ data }">
              <span class="font-mono text-sm">{{ data.time }}</span>
            </template>
          </Column>
          <Column field="type" header="Type" style="width: 100px">
            <template #body="{ data }">
              <Tag :value="data.type" :severity="typeSeverity(data.type)" size="small" />
            </template>
          </Column>
          <Column field="reason" header="Reason" style="width: 120px">
            <template #body="{ data }">
              <span class="font-semibold">{{ data.reason }}</span>
            </template>
          </Column>
          <Column field="object" header="Object" style="width: 250px">
            <template #body="{ data }">
              <code class="text-sm surface-ground px-2 py-1 border-round">{{ data.object }}</code>
            </template>
          </Column>
          <Column field="message" header="Message">
            <template #body="{ data }">
              <span class="text-color-secondary">{{ data.message }}</span>
            </template>
          </Column>
          <Column field="count" header="Count" style="width: 80px">
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
.font-mono {
  font-family: 'Fira Code', 'Consolas', monospace;
}
</style>

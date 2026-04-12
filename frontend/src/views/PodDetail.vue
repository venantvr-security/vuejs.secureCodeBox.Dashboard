<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePodsStore, type PodInfo } from '@/stores/podsStore'

const route = useRoute()
const router = useRouter()
const podsStore = usePodsStore()

const pod = ref<PodInfo | null>(null)
const logs = ref<string>('')
const logsLoading = ref(false)
const activeTab = ref(0)

const podName = computed(() => route.params.name as string)

onMounted(async () => {
  await podsStore.fetchPods()
  pod.value = podsStore.pods.find(p => p.name === podName.value) || null

  // Si ?tab=logs, ouvrir l'onglet logs
  if (route.query.tab === 'logs') {
    activeTab.value = 1
    await loadLogs()
  }
})

async function loadLogs() {
  if (!pod.value) return
  logsLoading.value = true
  try {
    logs.value = await podsStore.fetchPodLogs(pod.value.name)
  } catch (e) {
    logs.value = `Erreur: ${(e as Error).message}`
  } finally {
    logsLoading.value = false
  }
}

async function deletePod() {
  if (!pod.value || !confirm(`Supprimer le pod ${pod.value.name} ?`)) return
  const success = await podsStore.deletePod(pod.value.name)
  if (success) {
    router.push('/pods')
  }
}

const statusSeverity = computed(() => {
  switch (pod.value?.status) {
    case 'Running': return 'success'
    case 'Pending': return 'warning'
    case 'Failed': return 'danger'
    default: return 'info'
  }
})
</script>

<template>
  <div class="pod-detail">
    <!-- Back button -->
    <Button
      icon="pi pi-arrow-left"
      label="Retour"
      text
      class="mb-3"
      @click="router.push('/pods')"
    />

    <div v-if="pod">
      <!-- Header -->
      <Card class="mb-4">
        <template #content>
          <div class="flex align-items-center justify-content-between">
            <div class="flex align-items-center gap-3">
              <Tag :value="pod.status" :severity="statusSeverity" />
              <h2 class="m-0">{{ pod.name }}</h2>
            </div>
            <div class="flex gap-2">
              <Button
                icon="pi pi-refresh"
                label="Refresh Logs"
                text
                @click="loadLogs"
                :loading="logsLoading"
              />
              <Button
                icon="pi pi-trash"
                label="Delete"
                severity="danger"
                text
                @click="deletePod"
              />
            </div>
          </div>

          <div class="grid mt-4">
            <div class="col-6 md:col-3">
              <span class="text-color-secondary">Ready</span>
              <p class="font-semibold">{{ pod.ready }}</p>
            </div>
            <div class="col-6 md:col-3">
              <span class="text-color-secondary">Restarts</span>
              <p class="font-semibold">{{ pod.restarts }}</p>
            </div>
            <div class="col-6 md:col-3">
              <span class="text-color-secondary">Age</span>
              <p class="font-semibold">{{ pod.age }}</p>
            </div>
            <div class="col-6 md:col-3">
              <span class="text-color-secondary">IP</span>
              <p class="font-semibold">{{ pod.ip || '-' }}</p>
            </div>
          </div>
        </template>
      </Card>

      <!-- Tabs -->
      <TabView v-model:activeIndex="activeTab" @tab-change="(e) => e.index === 1 && loadLogs()">
        <!-- Containers Tab -->
        <TabPanel header="Containers">
          <div class="containers-list">
            <Card v-for="container in pod.containers" :key="container.name" class="mb-3">
              <template #title>
                <div class="flex align-items-center gap-2">
                  <i class="pi pi-box"></i>
                  {{ container.name }}
                  <Tag v-if="container.ready" value="Ready" severity="success" size="small" />
                  <Tag v-else value="Not Ready" severity="warning" size="small" />
                </div>
              </template>
              <template #content>
                <p><strong>Image:</strong> {{ container.image }}</p>
                <p><strong>Restarts:</strong> {{ container.restarts }}</p>

                <div v-if="container.ports.length > 0" class="mt-2">
                  <strong>Ports:</strong>
                  <Tag
                    v-for="port in container.ports"
                    :key="port.containerPort"
                    :value="`${port.containerPort}/${port.protocol}`"
                    class="ml-2"
                    severity="info"
                    size="small"
                  />
                </div>

                <div v-if="container.env.length > 0" class="mt-3">
                  <strong>Environment:</strong>
                  <DataTable :value="container.env" size="small" class="mt-2">
                    <Column field="name" header="Name" />
                    <Column field="value" header="Value" />
                  </DataTable>
                </div>
              </template>
            </Card>
          </div>
        </TabPanel>

        <!-- Logs Tab -->
        <TabPanel header="Logs">
          <div class="logs-toolbar mb-2">
            <Button icon="pi pi-refresh" label="Refresh" text size="small" @click="loadLogs" :loading="logsLoading" />
            <Button icon="pi pi-download" label="Download" text size="small" />
          </div>
          <div class="terminal-container">
            <pre v-if="logs">{{ logs }}</pre>
            <p v-else-if="logsLoading" class="text-color-secondary p-3">Chargement...</p>
            <p v-else class="text-color-secondary p-3">Aucun log disponible</p>
          </div>
        </TabPanel>

        <!-- YAML Tab -->
        <TabPanel header="YAML">
          <p class="text-color-secondary">YAML export à implémenter</p>
        </TabPanel>
      </TabView>
    </div>

    <!-- Not found -->
    <Card v-else>
      <template #content>
        <div class="text-center py-4">
          <i class="pi pi-exclamation-triangle text-4xl text-yellow-500 mb-3"></i>
          <h3>Pod non trouvé</h3>
          <p class="text-color-secondary">Le pod "{{ podName }}" n'existe pas ou a été supprimé.</p>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.terminal-container {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 1rem;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85rem;
  height: 400px;
  overflow: auto;
}

.terminal-container pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #d4d4d4;
}
</style>

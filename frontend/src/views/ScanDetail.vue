<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const scanName = computed(() => route.params.name as string)

const scan = ref<any>(null)
const findingsData = ref<any>(null)
const loading = ref(true)
const loadingFindings = ref(false)
const error = ref('')

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081'

const findings = computed(() => findingsData.value?.findings || [])

async function loadScan() {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/api/scans/${scanName.value}`)
    if (res.ok) {
      scan.value = await res.json()
      // Charger les findings si scan terminé
      if (scan.value.status === 'Done') {
        await loadFindings()
      }
    } else {
      error.value = 'Scan non trouvé'
    }
  } catch (e) {
    error.value = 'Erreur de connexion'
  } finally {
    loading.value = false
  }
}

async function loadFindings() {
  loadingFindings.value = true
  try {
    const res = await fetch(`${API_URL}/api/scans/${scanName.value}/findings`)
    if (res.ok) {
      findingsData.value = await res.json()
    }
  } catch (e) {
    console.error('Erreur chargement findings:', e)
  } finally {
    loadingFindings.value = false
  }
}

const statusSeverity = (status: string) => {
  switch (status) {
    case 'Done': return 'success'
    case 'Running': case 'Scanning': return 'info'
    case 'Failed': case 'Errored': return 'danger'
    default: return 'warning'
  }
}

const findingSeverity = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'info'
    default: return 'secondary'
  }
}

const getRefSource = (url: string): string => {
  try {
    const host = new URL(url).hostname
    if (host.includes('patchstack')) return 'Patchstack'
    if (host.includes('wordfence')) return 'Wordfence'
    if (host.includes('wpscan')) return 'WPScan'
    if (host.includes('cve.org') || host.includes('nvd.nist')) return 'CVE'
    if (host.includes('wpvulnerability')) return 'WPVuln'
    return host.replace('www.', '').split('.')[0]
  } catch {
    return 'Lien'
  }
}

onMounted(loadScan)
</script>

<template>
  <div class="scan-detail">
    <!-- Header -->
    <Toolbar class="mb-4">
      <template #start>
        <Button
          icon="pi pi-arrow-left"
          text
          rounded
          @click="router.push('/scans')"
          class="mr-2"
        />
        <h2 class="m-0">
          <i class="pi pi-search mr-2"></i>
          {{ scanName }}
        </h2>
      </template>
      <template #end>
        <Button
          icon="pi pi-refresh"
          text
          rounded
          @click="loadScan"
          :loading="loading"
        />
      </template>
    </Toolbar>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <!-- Error -->
    <Card v-else-if="error">
      <template #content>
        <div class="text-center py-4">
          <i class="pi pi-exclamation-triangle text-4xl text-yellow-500 mb-3"></i>
          <p>{{ error }}</p>
          <Button label="Retour aux scans" @click="router.push('/scans')" />
        </div>
      </template>
    </Card>

    <!-- Scan Info -->
    <template v-else-if="scan">
      <Card class="mb-4">
        <template #content>
          <div class="flex align-items-center justify-content-between mb-4">
            <div class="flex align-items-center gap-3">
              <Tag :value="scan.status" :severity="statusSeverity(scan.status)" class="text-lg" />
              <span class="text-xl font-semibold">{{ scan.scanType }}</span>
            </div>
            <div class="text-color-secondary">
              <i class="pi pi-clock mr-1"></i>
              {{ scan.duration }}
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="label">Findings</span>
              <span class="value">{{ scan.findings }}</span>
            </div>
            <div class="info-item">
              <span class="label">Démarré</span>
              <span class="value">{{ scan.startTime }}</span>
            </div>
            <div class="info-item">
              <span class="label">Terminé</span>
              <span class="value">{{ scan.finishedTime || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Namespace</span>
              <span class="value">{{ scan.namespace }}</span>
            </div>
          </div>

          <!-- Parameters -->
          <div class="mt-4">
            <strong>Paramètres:</strong>
            <code class="ml-2 p-2 surface-ground border-round">
              {{ scan.parameters?.join(' ') || '-' }}
            </code>
          </div>
        </template>
      </Card>

      <!-- Findings -->
      <Card>
        <template #title>
          <div class="flex align-items-center justify-content-between">
            <span>
              <i class="pi pi-list mr-2"></i>
              Findings ({{ findingsData?.total || scan.findings }})
            </span>
            <div v-if="findingsData?.severities" class="flex gap-2">
              <Tag
                v-for="(count, sev) in findingsData.severities"
                :key="sev"
                :value="`${sev}: ${count}`"
                :severity="findingSeverity(sev as string)"
              />
            </div>
          </div>
        </template>
        <template #content>
          <div v-if="loadingFindings" class="text-center py-4">
            <ProgressSpinner />
          </div>

          <div v-else-if="findings.length > 0">
            <DataTable :value="findings" stripedRows>
              <Column field="name" header="Nom" style="min-width: 200px">
                <template #body="{ data }">
                  <span class="font-semibold">{{ data.name }}</span>
                </template>
              </Column>
              <Column field="severity" header="Sévérité" style="min-width: 120px">
                <template #body="{ data }">
                  <Tag :value="data.severity" :severity="findingSeverity(data.severity)" />
                </template>
              </Column>
              <Column field="category" header="Catégorie" style="min-width: 150px" />
              <Column field="description" header="Description">
                <template #body="{ data }">
                  <span class="text-color-secondary">{{ data.description }}</span>
                </template>
              </Column>
              <Column header="Références" style="min-width: 120px">
                <template #body="{ data }">
                  <div v-if="data.attributes?.references?.length" class="flex flex-column gap-1">
                    <a
                      v-for="(ref, idx) in data.attributes.references"
                      :key="idx"
                      :href="ref"
                      target="_blank"
                      rel="noopener"
                      class="reference-link"
                    >
                      <i class="pi pi-external-link mr-1"></i>
                      {{ getRefSource(ref) }}
                    </a>
                  </div>
                  <span v-else class="text-color-secondary">-</span>
                </template>
              </Column>
            </DataTable>
          </div>

          <div v-else class="text-center py-4 text-color-secondary">
            <i class="pi pi-info-circle text-2xl mb-2"></i>
            <p v-if="scan.status !== 'Done'">
              Le scan est en cours...
            </p>
            <p v-else>
              Aucun finding détecté.
            </p>
          </div>
        </template>
      </Card>
    </template>
  </div>
</template>

<style scoped>
.scan-detail {
  max-width: 1200px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.info-item .value {
  font-size: 1.25rem;
  font-weight: 600;
}

.reference-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface-100);
  transition: background 0.2s;
}

.reference-link:hover {
  background: var(--primary-100);
  text-decoration: underline;
}
</style>

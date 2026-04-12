<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useScansStore } from '@/stores/scansStore'
import { useToast } from 'primevue/usetoast'

const scansStore = useScansStore()
const toast = useToast()
const showNewScanDialog = ref(false)
const showUploadDialog = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const applyingTemplate = ref<string | null>(null)

// Formulaire nouveau scan
const newScan = ref({
  name: '',
  scanType: 'wpscan',
  url: '',
  enumerate: 'p'
})

const showHistory = ref(false)

onMounted(() => {
  scansStore.fetchScans()
  scansStore.fetchScanTypes()
  scansStore.fetchTemplates()
  scansStore.fetchHistory()
  scansStore.connectWebSocket()
})

onUnmounted(() => {
  scansStore.disconnectWebSocket()
})

const statusSeverity = (status: string) => {
  switch (status) {
    case 'Done':
    case 'Completed':
      return 'success'
    case 'Running':
    case 'Scanning':
      return 'info'
    case 'Failed':
    case 'Errored':
      return 'danger'
    default:
      return 'warning'
  }
}

async function handleDeleteScan(name: string) {
  if (confirm(`Supprimer le scan "${name}" ?`)) {
    const success = await scansStore.deleteScan(name)
    if (success) {
      toast.add({
        severity: 'success',
        summary: 'Scan supprimé',
        detail: `Le scan ${name} a été supprimé`,
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de supprimer le scan',
        life: 3000
      })
    }
  }
}

async function handleCreateScan() {
  const scanName = newScan.value.name || `wpscan-${Date.now()}`
  const parameters = [
    '--url', newScan.value.url,
    '--enumerate', newScan.value.enumerate
  ]

  const success = await scansStore.createScan(scanName, newScan.value.scanType, parameters)

  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Scan créé',
      detail: `Le scan ${scanName} a été lancé`,
      life: 3000
    })
    showNewScanDialog.value = false
    // Reset form
    newScan.value = { name: '', scanType: 'wpscan', url: '', enumerate: 'p' }
  } else {
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Impossible de créer le scan',
      life: 3000
    })
  }
}

// ============================================================================
// TEMPLATES
// ============================================================================

function triggerFileUpload() {
  fileInput.value?.click()
}

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const content = await file.text()
    await scansStore.uploadTemplate(file.name, content)
    toast.add({
      severity: 'success',
      summary: 'Template uploadé',
      detail: `${file.name} a été ajouté`,
      life: 3000
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: (e as Error).message,
      life: 5000
    })
  }

  // Reset input
  input.value = ''
}

async function handleApplyTemplate(filename: string) {
  applyingTemplate.value = filename
  const result = await scansStore.applyTemplate(filename)
  applyingTemplate.value = null

  if (result.success) {
    toast.add({
      severity: 'success',
      summary: 'Scan lancé',
      detail: result.output || 'Template appliqué avec succès',
      life: 3000
    })
  } else {
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: result.error || 'Impossible d\'appliquer le template',
      life: 5000
    })
  }
}

async function handleDeleteTemplate(filename: string) {
  if (confirm(`Supprimer le template "${filename}" ?`)) {
    const success = await scansStore.deleteTemplate(filename)
    if (success) {
      toast.add({
        severity: 'success',
        summary: 'Template supprimé',
        detail: `${filename} a été supprimé`,
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de supprimer le template',
        life: 3000
      })
    }
  }
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ============================================================================
// HISTORY
// ============================================================================

async function handleDeleteHistoryEntry(id: string) {
  const success = await scansStore.deleteHistoryEntry(id)
  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Entrée supprimée',
      detail: 'Entrée supprimée de l\'historique',
      life: 2000
    })
  }
}

async function handleClearHistory() {
  if (confirm('Vider tout l\'historique des scans ?')) {
    const success = await scansStore.clearHistory()
    if (success) {
      toast.add({
        severity: 'success',
        summary: 'Historique vidé',
        detail: 'L\'historique a été effacé',
        life: 2000
      })
    }
  }
}
</script>

<template>
  <div class="scans-view">
    <Toast />

    <Toolbar class="mb-4">
      <template #start>
        <h2 class="m-0">
          <i class="pi pi-search mr-2"></i>
          Scans
        </h2>
      </template>
      <template #end>
        <Button
          icon="pi pi-refresh"
          text
          rounded
          @click="scansStore.fetchScans"
          :loading="scansStore.loading"
          class="mr-2"
        />
        <Button
          icon="pi pi-plus"
          label="Nouveau Scan"
          @click="showNewScanDialog = true"
        />
      </template>
    </Toolbar>

    <!-- Stats -->
    <div class="stats-grid mb-4">
      <Card class="stat-card-item">
        <template #content>
          <div class="flex align-items-center gap-4">
            <div class="stat-icon stat-icon-primary">
              <i class="pi pi-list"></i>
            </div>
            <div>
              <div class="stat-number">{{ scansStore.scans.length }}</div>
              <div class="stat-label">Total</div>
            </div>
          </div>
        </template>
      </Card>
      <Card class="stat-card-item">
        <template #content>
          <div class="flex align-items-center gap-4">
            <div class="stat-icon stat-icon-blue">
              <i class="pi pi-spin pi-spinner"></i>
            </div>
            <div>
              <div class="stat-number">{{ scansStore.runningScans.length }}</div>
              <div class="stat-label">En cours</div>
            </div>
          </div>
        </template>
      </Card>
      <Card class="stat-card-item">
        <template #content>
          <div class="flex align-items-center gap-4">
            <div class="stat-icon stat-icon-green">
              <i class="pi pi-check-circle"></i>
            </div>
            <div>
              <div class="stat-number">{{ scansStore.completedScans.length }}</div>
              <div class="stat-label">Terminés</div>
            </div>
          </div>
        </template>
      </Card>
      <Card class="stat-card-item">
        <template #content>
          <div class="flex align-items-center gap-4">
            <div class="stat-icon stat-icon-red">
              <i class="pi pi-times-circle"></i>
            </div>
            <div>
              <div class="stat-number">{{ scansStore.failedScans.length }}</div>
              <div class="stat-label">Échoués</div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Templates Section -->
    <Card class="mb-4">
      <template #title>
        <div class="flex align-items-center justify-content-between">
          <span>
            <i class="pi pi-file mr-2"></i>
            Templates de scan
          </span>
          <div class="flex gap-2">
            <Button
              icon="pi pi-refresh"
              text
              rounded
              size="small"
              @click="scansStore.fetchTemplates"
              :loading="scansStore.templatesLoading"
              v-tooltip.top="'Rafraîchir'"
            />
            <Button
              icon="pi pi-upload"
              label="Uploader"
              size="small"
              @click="triggerFileUpload"
            />
            <input
              ref="fileInput"
              type="file"
              accept=".yaml,.yml"
              class="hidden"
              @change="handleFileUpload"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div v-if="scansStore.templates.length === 0" class="text-center text-color-secondary py-4">
          <i class="pi pi-inbox text-4xl mb-3" style="display: block;"></i>
          <p>Aucun template uploadé</p>
          <p class="text-sm">Uploadez un fichier YAML de scan pour commencer</p>
        </div>
        <div v-else class="templates-grid">
          <div
            v-for="template in scansStore.templates"
            :key="template.filename"
            class="template-card surface-card border-round border-1 surface-border p-3"
          >
            <div class="flex align-items-start justify-content-between mb-2">
              <div>
                <div class="font-semibold text-lg">{{ template.name }}</div>
                <div class="text-sm text-color-secondary">{{ template.filename }}</div>
              </div>
              <Tag :value="template.scanType" severity="info" />
            </div>
            <div class="text-sm text-color-secondary mb-3">
              <i class="pi pi-clock mr-1"></i>
              {{ formatDate(template.uploadedAt) }}
            </div>
            <div class="flex gap-2">
              <Button
                icon="pi pi-play"
                label="Lancer"
                size="small"
                @click="handleApplyTemplate(template.filename)"
                :loading="applyingTemplate === template.filename"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                @click="handleDeleteTemplate(template.filename)"
                v-tooltip.top="'Supprimer'"
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Table -->
    <Card>
      <template #content>
        <DataTable
          :value="scansStore.scans"
          :loading="scansStore.loading"
          stripedRows
          paginator
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          emptyMessage="Aucun scan trouvé"
        >
          <Column field="name" header="Nom" sortable>
            <template #body="{ data }">
              <router-link :to="`/scans/${data.name}`" class="text-primary font-semibold no-underline hover:underline">
                {{ data.name }}
              </router-link>
            </template>
          </Column>
          <Column field="status" header="Status" sortable style="min-width: 130px">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="statusSeverity(data.status)" />
            </template>
          </Column>
          <Column field="scanType" header="Type" sortable style="min-width: 120px" />
          <Column field="findings" header="Findings" sortable style="min-width: 120px">
            <template #body="{ data }">
              <Badge :value="data.findings" :severity="data.findings > 0 ? 'warning' : 'secondary'" />
            </template>
          </Column>
          <Column field="startTime" header="Démarré" style="min-width: 140px" />
          <Column field="duration" header="Durée" style="min-width: 100px" />
          <Column header="Actions" style="min-width: 160px">
            <template #body="{ data }">
              <Button
                icon="pi pi-eye"
                text
                rounded
                size="small"
                @click="$router.push(`/scans/${data.name}`)"
                v-tooltip.top="'Voir détails'"
              />
              <Button
                icon="pi pi-refresh"
                text
                rounded
                size="small"
                v-tooltip.top="'Relancer'"
              />
              <Button
                icon="pi pi-trash"
                text
                rounded
                size="small"
                severity="danger"
                @click="handleDeleteScan(data.name)"
                v-tooltip.top="'Supprimer'"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- History Section -->
    <Card class="mt-4">
      <template #title>
        <div class="flex align-items-center justify-content-between">
          <span class="cursor-pointer" @click="showHistory = !showHistory">
            <i :class="['pi mr-2', showHistory ? 'pi-chevron-down' : 'pi-chevron-right']"></i>
            <i class="pi pi-history mr-2"></i>
            Historique des scans ({{ scansStore.history.length }})
          </span>
          <div class="flex gap-2">
            <Button
              icon="pi pi-refresh"
              text
              rounded
              size="small"
              @click="scansStore.fetchHistory"
              :loading="scansStore.historyLoading"
              v-tooltip.top="'Rafraîchir'"
            />
            <Button
              v-if="scansStore.history.length > 0"
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              @click="handleClearHistory"
              v-tooltip.top="'Vider l\'historique'"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div v-show="showHistory">
          <div v-if="scansStore.history.length === 0" class="text-center text-color-secondary py-4">
            <i class="pi pi-inbox text-4xl mb-3" style="display: block;"></i>
            <p>Aucun historique</p>
            <p class="text-sm">Les scans terminés seront automatiquement archivés ici</p>
          </div>
          <DataTable
            v-else
            :value="scansStore.history"
            :loading="scansStore.historyLoading"
            stripedRows
            paginator
            :rows="5"
            :rowsPerPageOptions="[5, 10, 20]"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          >
            <Column field="name" header="Nom" sortable />
            <Column field="scanType" header="Type" sortable style="min-width: 100px" />
            <Column field="target" header="Cible" style="min-width: 200px">
              <template #body="{ data }">
                <span class="text-sm">{{ data.target || '-' }}</span>
              </template>
            </Column>
            <Column field="status" header="Status" sortable style="min-width: 100px">
              <template #body="{ data }">
                <Tag :value="data.status" :severity="statusSeverity(data.status)" />
              </template>
            </Column>
            <Column field="findings" header="Findings" sortable style="min-width: 80px">
              <template #body="{ data }">
                <Badge :value="data.findings" :severity="data.findings > 0 ? 'warning' : 'secondary'" />
              </template>
            </Column>
            <Column field="archivedAt" header="Archivé" sortable style="min-width: 140px">
              <template #body="{ data }">
                {{ formatDate(data.archivedAt) }}
              </template>
            </Column>
            <Column header="" style="min-width: 60px">
              <template #body="{ data }">
                <Button
                  icon="pi pi-times"
                  text
                  rounded
                  size="small"
                  severity="secondary"
                  @click="handleDeleteHistoryEntry(data.id)"
                  v-tooltip.top="'Supprimer'"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </Card>

    <!-- Dialog nouveau scan -->
    <Dialog
      v-model:visible="showNewScanDialog"
      header="Nouveau Scan"
      :style="{ width: '500px' }"
      modal
    >
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="scanName">Nom du scan (optionnel)</label>
          <InputText
            id="scanName"
            v-model="newScan.name"
            placeholder="wpscan-mon-site"
          />
        </div>

        <div class="flex flex-column gap-2">
          <label for="scanType">Type de scan</label>
          <Dropdown
            id="scanType"
            v-model="newScan.scanType"
            :options="scansStore.scanTypes.length ? scansStore.scanTypes : ['wpscan']"
            placeholder="Sélectionner un type"
          />
        </div>

        <div class="flex flex-column gap-2">
          <label for="url">URL cible</label>
          <InputText
            id="url"
            v-model="newScan.url"
            placeholder="https://example.com"
          />
        </div>

        <div class="flex flex-column gap-2">
          <label for="enumerate">Énumération</label>
          <Dropdown
            id="enumerate"
            v-model="newScan.enumerate"
            :options="[
              { label: 'Plugins populaires', value: 'p' },
              { label: 'Tous les plugins', value: 'ap' },
              { label: 'Thèmes', value: 't' },
              { label: 'Utilisateurs', value: 'u' },
              { label: 'Plugins vulnérables', value: 'vp' }
            ]"
            optionLabel="label"
            optionValue="value"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Annuler"
          text
          @click="showNewScanDialog = false"
        />
        <Button
          label="Lancer le scan"
          icon="pi pi-play"
          @click="handleCreateScan"
          :disabled="!newScan.url"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.template-card {
  transition: box-shadow 0.2s;
}

.template-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
}

.hidden {
  display: none;
}
</style>

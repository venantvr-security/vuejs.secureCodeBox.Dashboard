<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useScansStore } from '@/stores/scansStore'
import { useToast } from 'primevue/usetoast'

const scansStore = useScansStore()
const toast = useToast()
const showNewScanDialog = ref(false)

// Formulaire nouveau scan
const newScan = ref({
  name: '',
  scanType: 'wpscan',
  url: '',
  enumerate: 'p'
})

onMounted(() => {
  scansStore.fetchScans()
  scansStore.fetchScanTypes()
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

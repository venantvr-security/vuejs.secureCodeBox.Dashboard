<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const toast = useToast()

const API_BASE = import.meta.env.VITE_API_URL || ''

const activeStep = ref(0)
const diagnosticRunning = ref(false)

interface CheckResult {
  status: 'pending' | 'checking' | 'ok' | 'error' | 'warning'
  message: string
  version?: string
}

const checks = ref<Record<string, CheckResult>>({
  docker: { status: 'pending', message: '' },
  kubectl: { status: 'pending', message: '' },
  kind: { status: 'pending', message: '' },
  helm: { status: 'pending', message: '' },
  cluster: { status: 'pending', message: '' },
  iptables: { status: 'pending', message: '' }
})

const networkInfo = ref({
  kindSubnet: '',
  hostIP: '',
  gateway: ''
})

const steps = [
  { label: 'Diagnostic' },
  { label: 'Réseau' },
  { label: 'Cluster' },
  { label: 'Scanner' }
]

onMounted(async () => {
  // Charger les infos réseau en arrière-plan
  try {
    const response = await fetch(`${API_BASE}/api/system/network`)
    if (response.ok) {
      const data = await response.json()
      networkInfo.value = {
        kindSubnet: data.kindSubnet || '172.19.0.0/16',
        hostIP: data.hostIP || 'Détection en cours...',
        gateway: data.gateway || '172.19.0.1'
      }
    }
  } catch (e) {
    console.error('[Onboarding] Error fetching network info:', e)
  }
})

async function runDiagnostic() {
  diagnosticRunning.value = true

  // Marquer tous comme "checking"
  Object.keys(checks.value).forEach(key => {
    checks.value[key].status = 'checking'
    checks.value[key].message = 'Vérification...'
  })

  try {
    const response = await fetch(`${API_BASE}/api/system/diagnostic`)
    if (!response.ok) {
      throw new Error('Diagnostic failed')
    }

    const result = await response.json()

    // Mapper les résultats
    Object.keys(result).forEach(key => {
      if (checks.value[key]) {
        checks.value[key] = {
          status: result[key].status,
          message: result[key].message,
          version: result[key].version
        }
      }
    })

    // Afficher un toast de succès
    const allOk = Object.values(result).every((r: any) => r.status === 'ok')
    if (allOk) {
      toast.add({
        severity: 'success',
        summary: 'Diagnostic terminé',
        detail: 'Tous les outils sont disponibles',
        life: 3000
      })
    } else {
      toast.add({
        severity: 'warn',
        summary: 'Diagnostic terminé',
        detail: 'Certains outils nécessitent attention',
        life: 5000
      })
    }
  } catch (error) {
    console.error('[Onboarding] Diagnostic error:', error)

    // En cas d'erreur, marquer tous comme erreur
    Object.keys(checks.value).forEach(key => {
      checks.value[key].status = 'error'
      checks.value[key].message = 'Erreur de connexion'
    })

    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Impossible de contacter le backend',
      life: 5000
    })
  } finally {
    diagnosticRunning.value = false
  }
}

function nextStep() {
  if (activeStep.value < steps.length - 1) {
    activeStep.value++
  }
}

function prevStep() {
  if (activeStep.value > 0) {
    activeStep.value--
  }
}

function finish() {
  toast.add({
    severity: 'success',
    summary: 'Configuration terminée',
    detail: 'Vous pouvez maintenant lancer des scans',
    life: 3000
  })
  router.push('/')
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'ok': return 'pi pi-check-circle text-green-500'
    case 'error': return 'pi pi-times-circle text-red-500'
    case 'warning': return 'pi pi-exclamation-triangle text-yellow-500'
    case 'checking': return 'pi pi-spin pi-spinner text-blue-500'
    default: return 'pi pi-circle text-gray-400'
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  toast.add({
    severity: 'info',
    summary: 'Copié',
    detail: 'Commande copiée dans le presse-papier',
    life: 2000
  })
}

const iptablesCommands = `sudo iptables -I INPUT -s ${networkInfo.value.kindSubnet || '172.19.0.0/16'} -j ACCEPT
sudo iptables -I FORWARD -s ${networkInfo.value.kindSubnet || '172.19.0.0/16'} -j ACCEPT
sudo iptables -I FORWARD -d ${networkInfo.value.kindSubnet || '172.19.0.0/16'} -j ACCEPT`
</script>

<template>
  <div class="onboarding-view">
    <Toast />

    <Card class="mb-4">
      <template #title>
        <div class="flex align-items-center">
          <i class="pi pi-play text-primary mr-2"></i>
          Assistant de configuration
        </div>
      </template>
      <template #content>
        <p class="text-color-secondary m-0">
          Cet assistant vous guide pour configurer secureCodeBox correctement.
          Suivez les étapes pour vérifier votre environnement et configurer le réseau.
        </p>
      </template>
    </Card>

    <!-- Steps indicator -->
    <div class="steps-indicator mb-4">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="step-item"
        :class="{ active: index === activeStep, completed: index < activeStep }"
      >
        <span class="step-number">{{ index + 1 }}</span>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <!-- Step content -->
    <Card>
      <template #content>
        <!-- Step 1: Diagnostic -->
        <div v-if="activeStep === 0">
          <h3 class="flex align-items-center gap-2 mt-0">
            <i class="pi pi-search-plus"></i>
            Diagnostic système
          </h3>
          <p class="text-color-secondary mb-4">
            Vérification des outils nécessaires au fonctionnement de secureCodeBox.
          </p>

          <Button
            label="Lancer le diagnostic"
            icon="pi pi-play"
            @click="runDiagnostic"
            :loading="diagnosticRunning"
            class="mb-4"
          />

          <div class="checks-list">
            <div v-for="(check, key) in checks" :key="key" class="check-item surface-ground border-round p-3 mb-2">
              <div class="flex align-items-center gap-3">
                <i :class="statusIcon(check.status)" class="text-xl"></i>
                <div class="flex-1">
                  <div class="font-semibold">{{ key }}</div>
                  <div class="text-color-secondary text-sm">{{ check.message }}</div>
                </div>
                <Tag v-if="check.version" :value="check.version" severity="secondary" />
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Network -->
        <div v-if="activeStep === 1">
          <h3 class="flex align-items-center gap-2 mt-0">
            <i class="pi pi-sitemap"></i>
            Configuration réseau
          </h3>
          <p class="text-color-secondary mb-4">
            Les pods Kind doivent pouvoir accéder à Internet et aux services locaux.
          </p>

          <!-- Network info -->
          <div class="grid mb-4">
            <div class="col-4">
              <div class="surface-ground p-3 border-round">
                <div class="text-color-secondary text-sm mb-1">Subnet Kind</div>
                <div class="font-mono font-bold">{{ networkInfo.kindSubnet || '172.19.0.0/16' }}</div>
              </div>
            </div>
            <div class="col-4">
              <div class="surface-ground p-3 border-round">
                <div class="text-color-secondary text-sm mb-1">IP Hôte</div>
                <div class="font-mono font-bold">{{ networkInfo.hostIP || 'Non détectée' }}</div>
              </div>
            </div>
            <div class="col-4">
              <div class="surface-ground p-3 border-round">
                <div class="text-color-secondary text-sm mb-1">Gateway Docker</div>
                <div class="font-mono font-bold">{{ networkInfo.gateway || '172.19.0.1' }}</div>
              </div>
            </div>
          </div>

          <Panel header="Règles iptables à appliquer" toggleable>
            <pre class="code-block m-0">{{ iptablesCommands }}</pre>
            <div class="flex gap-2 mt-3">
              <Button
                icon="pi pi-copy"
                label="Copier"
                text
                @click="copyToClipboard(iptablesCommands)"
              />
            </div>
          </Panel>

          <Message severity="info" class="mt-4" :closable="false">
            <div class="flex align-items-center gap-2">
              <i class="pi pi-info-circle"></i>
              <span>Ces règles permettent aux pods Kind d'accéder au réseau local et à Internet.</span>
            </div>
          </Message>
        </div>

        <!-- Step 3: Cluster -->
        <div v-if="activeStep === 2">
          <h3 class="flex align-items-center gap-2 mt-0">
            <i class="pi pi-server"></i>
            Cluster Kind
          </h3>
          <p class="text-color-secondary mb-4">
            Création ou vérification du cluster Kubernetes Kind.
          </p>

          <div class="surface-ground p-4 border-round mb-4">
            <h4 class="mt-0 mb-3">Créer un cluster</h4>
            <pre class="code-block m-0 mb-3">kind create cluster --name securecodebox</pre>
            <Button
              icon="pi pi-copy"
              label="Copier"
              text
              size="small"
              @click="copyToClipboard('kind create cluster --name securecodebox')"
            />
          </div>

          <div class="surface-ground p-4 border-round">
            <h4 class="mt-0 mb-3">Vérifier le cluster existant</h4>
            <pre class="code-block m-0 mb-3">kubectl cluster-info</pre>
            <Button
              icon="pi pi-copy"
              label="Copier"
              text
              size="small"
              @click="copyToClipboard('kubectl cluster-info')"
            />
          </div>
        </div>

        <!-- Step 4: Scanner -->
        <div v-if="activeStep === 3">
          <h3 class="flex align-items-center gap-2 mt-0">
            <i class="pi pi-shield"></i>
            Installation WPScan
          </h3>
          <p class="text-color-secondary mb-4">
            Déploiement de l'opérateur secureCodeBox et du scanner WPScan.
          </p>

          <Timeline>
            <template #content="slotProps">
              <div>{{ slotProps.item }}</div>
            </template>
          </Timeline>

          <div class="surface-ground p-4 border-round mb-4">
            <h4 class="mt-0 mb-3">1. Installer l'opérateur</h4>
            <pre class="code-block m-0 mb-3">helm install securecodebox-operator oci://ghcr.io/securecodebox/helm/operator -n securecodebox --create-namespace</pre>
            <Button
              icon="pi pi-copy"
              label="Copier"
              text
              size="small"
              @click="copyToClipboard('helm install securecodebox-operator oci://ghcr.io/securecodebox/helm/operator -n securecodebox --create-namespace')"
            />
          </div>

          <div class="surface-ground p-4 border-round mb-4">
            <h4 class="mt-0 mb-3">2. Installer WPScan</h4>
            <pre class="code-block m-0 mb-3">helm install wpscan oci://ghcr.io/securecodebox/helm/wpscan -n securecodebox</pre>
            <Button
              icon="pi pi-copy"
              label="Copier"
              text
              size="small"
              @click="copyToClipboard('helm install wpscan oci://ghcr.io/securecodebox/helm/wpscan -n securecodebox')"
            />
          </div>

          <Message severity="success" :closable="false">
            <div class="flex align-items-center gap-2">
              <i class="pi pi-check-circle"></i>
              <span>Une fois ces commandes exécutées, vous pouvez lancer des scans depuis l'interface.</span>
            </div>
          </Message>
        </div>

        <!-- Navigation -->
        <div class="flex justify-content-between mt-4 pt-4 border-top-1 border-gray-700">
          <Button
            label="Précédent"
            icon="pi pi-arrow-left"
            text
            :disabled="activeStep === 0"
            @click="prevStep"
          />
          <Button
            v-if="activeStep < steps.length - 1"
            label="Suivant"
            icon="pi pi-arrow-right"
            iconPos="right"
            @click="nextStep"
          />
          <Button
            v-else
            label="Terminer"
            icon="pi pi-check"
            severity="success"
            @click="finish"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.steps-indicator {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.steps-indicator::before {
  content: '';
  position: absolute;
  top: 15px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--surface-border);
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--surface-card);
  border: 2px solid var(--surface-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.step-item.active .step-number {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

.step-item.completed .step-number {
  border-color: #22c55e;
  background: #22c55e;
  color: white;
}

.step-label {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.step-item.active .step-label {
  color: var(--text-color);
  font-weight: 600;
}

.code-block {
  background: #1e1e1e;
  padding: 1rem;
  border-radius: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.font-mono {
  font-family: 'Fira Code', 'Consolas', monospace;
}
</style>

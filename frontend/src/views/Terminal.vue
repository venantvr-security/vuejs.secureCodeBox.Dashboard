<script setup lang="ts">
import { ref } from 'vue'

const command = ref('')
const output = ref('')
const loading = ref(false)

const quickCommands = [
  { label: 'Pods', cmd: 'kubectl get pods -n securecodebox' },
  { label: 'Scans', cmd: 'kubectl get scans -n securecodebox' },
  { label: 'Events', cmd: 'kubectl get events -n securecodebox --sort-by=.lastTimestamp' },
  { label: 'Hooks', cmd: 'kubectl get scancompletionhooks -n securecodebox' },
  { label: 'ScanTypes', cmd: 'kubectl get scantypes -n securecodebox' }
]

function runQuickCommand(cmd: string) {
  command.value = cmd
  runCommand()
}

async function runCommand() {
  if (!command.value.trim()) return

  loading.value = true
  output.value = `$ ${command.value}\n\n`

  try {
    // Simuler l'exécution (à connecter au backend)
    await new Promise(resolve => setTimeout(resolve, 500))
    output.value += `Commande non connectée au backend.\nÀ implémenter: exécution via WebSocket.`
  } catch (e) {
    output.value += `Erreur: ${(e as Error).message}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="terminal-view">
    <Toolbar class="mb-4">
      <template #start>
        <h2 class="m-0">
          <i class="pi pi-desktop mr-2"></i>
          Debug Terminal
        </h2>
      </template>
    </Toolbar>

    <!-- Quick commands -->
    <div class="quick-commands mb-4">
      <span class="text-color-secondary mr-3">Commandes rapides:</span>
      <Button
        v-for="qc in quickCommands"
        :key="qc.label"
        :label="qc.label"
        severity="secondary"
        class="mr-2"
        @click="runQuickCommand(qc.cmd)"
      />
    </div>

    <!-- Terminal output -->
    <Card class="terminal-card mb-4">
      <template #content>
        <div class="terminal-output">
          <pre v-if="output">{{ output }}</pre>
          <p v-else class="text-color-secondary">Exécutez une commande pour voir le résultat ici.</p>
        </div>
      </template>
    </Card>

    <!-- Command input -->
    <div class="command-input flex gap-2">
      <span class="p-input-icon-left flex-1">
        <i class="pi pi-chevron-right"></i>
        <InputText
          v-model="command"
          placeholder="kubectl get pods -n securecodebox"
          class="w-full font-mono"
          @keyup.enter="runCommand"
        />
      </span>
      <Button
        icon="pi pi-play"
        label="Exécuter"
        @click="runCommand"
        :loading="loading"
      />
    </div>
  </div>
</template>

<style scoped>
.terminal-card :deep(.p-card-content) {
  padding: 0;
}

.terminal-output {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 1rem;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85rem;
  min-height: 300px;
  max-height: 500px;
  overflow: auto;
  color: #d4d4d4;
}

.terminal-output pre {
  margin: 0;
  white-space: pre-wrap;
}

.font-mono {
  font-family: 'Fira Code', 'Consolas', monospace;
}
</style>

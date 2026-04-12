<script setup lang="ts">
import { ref } from 'vue'

const defectdojoUrl = ref('')
const defectdojoToken = ref('')
const namespace = ref('securecodebox')
</script>

<template>
  <div class="settings-view">
    <h2 class="mb-4">Paramètres</h2>

    <!-- Kubernetes -->
    <Card class="mb-4">
      <template #title>
        <i class="pi pi-server mr-2"></i>
        Kubernetes
      </template>
      <template #content>
        <div class="field">
          <label for="namespace">Namespace</label>
          <InputText id="namespace" v-model="namespace" class="w-full" />
        </div>
      </template>
    </Card>

    <!-- DefectDojo -->
    <Card class="mb-4">
      <template #title>
        <i class="pi pi-shield mr-2"></i>
        DefectDojo
      </template>
      <template #content>
        <div class="field">
          <label for="dd-url">URL</label>
          <InputText id="dd-url" v-model="defectdojoUrl" placeholder="https://defectdojo.example.com" class="w-full" />
        </div>
        <div class="field">
          <label for="dd-token">API Token</label>
          <InputText id="dd-token" v-model="defectdojoToken" type="password" class="w-full" />
        </div>
        <Button label="Tester la connexion" icon="pi pi-check" text />
      </template>
    </Card>

    <Button label="Sauvegarder" icon="pi pi-save" />
  </div>
</template>

<style scoped>
.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
</style>

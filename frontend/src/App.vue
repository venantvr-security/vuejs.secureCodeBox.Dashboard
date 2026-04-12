<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import ConnectionStatus from '@/components/layout/ConnectionStatus.vue'

const route = useRoute()
const sidebarOpen = ref(true)

const menuItems = [
  { icon: 'pi pi-chart-bar', label: 'Overview', route: '/' },
  { icon: 'pi pi-box', label: 'Pods', route: '/pods' },
  { icon: 'pi pi-search', label: 'Scans', route: '/scans' },
  { icon: 'pi pi-list', label: 'Events', route: '/events' },
  { icon: 'pi pi-desktop', label: 'Terminal', route: '/terminal' },
  { divider: true },
  { icon: 'pi pi-play', label: 'Onboarding', route: '/onboarding' },
  { icon: 'pi pi-cog', label: 'Settings', route: '/settings' }
]

const currentRoute = computed(() => route.path)
</script>

<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-logo">
        <i class="pi pi-shield"></i>
        <h1>secureCodeBox</h1>
      </div>

      <nav class="sidebar-menu">
        <template v-for="(item, index) in menuItems" :key="index">
          <div v-if="item.divider" class="menu-divider"></div>
          <router-link
            v-else
            :to="item.route"
            class="menu-item"
            :class="{ active: currentRoute === item.route }"
          >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
          </router-link>
        </template>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Topbar -->
      <header class="topbar">
        <div class="flex align-items-center gap-3">
          <Button
            icon="pi pi-bars"
            text
            rounded
            @click="sidebarOpen = !sidebarOpen"
            class="lg:hidden"
          />
          <h2 class="text-xl font-semibold m-0">{{ route.meta.title || 'Dashboard' }}</h2>
        </div>

        <div class="flex align-items-center gap-3">
          <ConnectionStatus />
          <Button icon="pi pi-bell" text rounded v-tooltip="'Notifications'" />
        </div>
      </header>

      <!-- Content Area -->
      <div class="content-area">
        <router-view />
      </div>
    </main>
  </div>

  <Toast position="bottom-right" />
</template>

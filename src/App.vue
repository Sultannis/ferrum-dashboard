<script setup lang="ts">
import { useRoute } from 'vue-router'
import Toast from 'primevue/toast'

const route = useRoute()

const navItems = [
  { label: 'Channels', icon: 'pi pi-wifi', route: '/channels' },
  { label: 'Jobs', icon: 'pi pi-briefcase', route: '/jobs' },
]
</script>

<template>
  <Toast />
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-brand">F</div>
      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.route"
          :to="item.route"
          class="nav-item"
          :class="{ active: route.path === item.route }"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 220px;
  background: #0f0f0f;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  gap: 2rem;
  flex-shrink: 0;
}

.sidebar-brand {
  width: 36px;
  height: 36px;
  background: #fff;
  color: #0f0f0f;
  font-weight: 800;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  margin-left: 0.25rem;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  text-decoration: none;
  color: #888;
  font-size: 0.9rem;
  font-weight: 500;
  transition:
    background 0.15s,
    color 0.15s;
}

.nav-item:hover {
  background: #1a1a1a;
  color: #fff;
}

.nav-item.active {
  background: #1a1a1a;
  color: #fff;
}

.nav-item i {
  font-size: 0.95rem;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background: #1c1c1c;
}
</style>

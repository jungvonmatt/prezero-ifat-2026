<template>
  <div class="site-shell">
    <header v-if="isAdminRoute || hasTouchedGate" class="site-header">
      <NuxtLink to="/" class="brand-logo" aria-label="Zur Startseite">
        <img src="/logo.svg" alt="Logo" />
      </NuxtLink>
    </header>

    <main class="page-wrap">
      <slot />
      <footer class="footer">
        <nav>
          <NuxtLink v-if="isAdminRoute" to="/">Back to game</NuxtLink>
          <NuxtLink v-else to="/admin">Admin</NuxtLink>
        </nav>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const isAdminRoute = computed(() => route.path === "/admin");
const hasTouchedGate = useState<boolean>("hasTouchedGate", () => false);
</script>

<style scoped lang="scss">
.site-header {
  z-index: 100;
}

.brand-logo {
  position: absolute;
  left: 80px;
  top: 80px;
}

.brand-logo img {
  display: block;
  width: 160px;
  height: auto;
}
</style>

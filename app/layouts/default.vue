<template>
  <div class="site-shell">
    <header class="site-header">
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
</script>

<style scoped lang="scss">
.site-header {
  z-index: 100;
}

.brand-logo {
  position: absolute;
  left: 48px;
  top: 48px;
}

.brand-logo img {
  display: block;
  width: 200px;
  height: auto;
}
</style>

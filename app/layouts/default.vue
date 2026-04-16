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
          <NuxtLink to="/info">How it works</NuxtLink>
          <NuxtLink to="/admin">Admin</NuxtLink>
        </nav>
      </footer>
    </main>
  </div>
</template>

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

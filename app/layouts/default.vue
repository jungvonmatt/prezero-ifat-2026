<template>
  <div class="site-shell">
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

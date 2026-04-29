<template>
  <main>
    <button class="brand-logo" aria-label="App zurücksetzen" @click="handleLogoClick">
      <img src="/logo-with-whitespace.svg" alt="Logo Prezero" />
    </button>
    <slot></slot>
  </main>
</template>

<script setup lang="ts">
import { navigateTo, useRoute, useState } from '#imports';
import { onBeforeUnmount, ref } from 'vue';

const route = useRoute();
const hasTouchedGate = useState<boolean>('hasTouchedGate', () => false);
const appResetSignal = useState<number>('appResetSignal', () => 0);

const logoClickCount = ref(0);
let logoClickResetTimer: ReturnType<typeof setTimeout> | null = null;
let logoClickCooldown = false;
const ADMIN_TAP_COUNT = 20;

function handleLogoClick() {
  if (logoClickCooldown) return;

  if (route.path === '/admin') {
    logoClickCount.value = 0;
    hasTouchedGate.value = false;
    appResetSignal.value += 1;
    void navigateTo('/');
    return;
  }

  logoClickCount.value += 1;

  if (logoClickResetTimer) clearTimeout(logoClickResetTimer);
  logoClickResetTimer = setTimeout(() => {
    logoClickCount.value = 0;
  }, 3000);

  if (logoClickCount.value >= ADMIN_TAP_COUNT) {
    logoClickCount.value = 0;
    logoClickCooldown = true;
    setTimeout(() => {
      logoClickCooldown = false;
    }, 1000);
    void navigateTo('/admin');
    return;
  }

  hasTouchedGate.value = false;
  appResetSignal.value += 1;
  void navigateTo('/');
}

onBeforeUnmount(() => {
  if (logoClickResetTimer) {
    clearTimeout(logoClickResetTimer);
  }
});
</script>

<style src="./default.scss" scoped lang="scss" />

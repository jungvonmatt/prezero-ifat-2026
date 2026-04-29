<template>
  <div class="app-viewport-fit" :class="{ 'app-viewport-fit--scaled': enableViewportFit }">
    <button class="brand-logo" aria-label="App zurücksetzen" @click="handleLogoClick">
      <img src="/logo-with-whitespace.svg" alt="Logo Prezero" />
    </button>
    <div ref="viewportContent" class="app-viewport-content" :style="viewportStyle">
      <div class="site-shell">
        <main class="page-wrap">
          <slot></slot>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo, useRoute, useState } from '#imports';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const enableViewportFit = import.meta.dev;

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

const viewportScale = ref(1);
const viewportOffsetX = ref(0);
const viewportOffsetY = ref(0);

const viewportContent = ref<HTMLElement | null>(null);

function updateViewportScale() {
  if (!enableViewportFit) {
    viewportScale.value = 1;
    viewportOffsetX.value = 0;
    viewportOffsetY.value = 0;
    return;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const scale = Math.min(viewportWidth / BASE_WIDTH, viewportHeight / BASE_HEIGHT);
  viewportScale.value = scale;
  viewportOffsetX.value = (viewportWidth - BASE_WIDTH * scale) / 2;
  viewportOffsetY.value = (viewportHeight - BASE_HEIGHT * scale) / 2;
}

const viewportStyle = computed(() => {
  if (!enableViewportFit) {
    return {
      width: '100%',
      height: '100%',
      transform: 'none',
    };
  }

  return {
    width: `${BASE_WIDTH}px`,
    height: `${BASE_HEIGHT}px`,
    transform: `translate(${viewportOffsetX.value}px, ${viewportOffsetY.value}px) scale(${viewportScale.value})`,
  };
});

onMounted(() => {
  updateViewportScale();

  if (enableViewportFit) {
    window.addEventListener('resize', updateViewportScale, { passive: true });
  }

  setTimeout(() => {
    viewportContent.value?.style.setProperty('opacity', '1');
    viewportContent.value?.style.setProperty('transition', 'opacity 0.6s ease, transform 0.3s ease');
  }, 500);
});

onBeforeUnmount(() => {
  if (enableViewportFit) {
    window.removeEventListener('resize', updateViewportScale);
  }
  if (logoClickResetTimer) clearTimeout(logoClickResetTimer);
});
</script>

<style src="./default.scss" scoped lang="scss" />

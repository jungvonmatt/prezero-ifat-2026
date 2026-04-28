<template>
  <div class="app-viewport-fit" :class="{ 'app-viewport-fit--scaled': enableViewportFit }">
    <div ref="viewportContent" class="app-viewport-content" :style="viewportStyle">
      <div class="site-shell">
        <header class="site-header">
          <button class="brand-logo" aria-label="App zurücksetzen" @click="resetApp">
            <img src="/logo.svg" alt="Logo Prezero" />
          </button>
        </header>

        <main class="page-wrap">
          <slot />
          <footer class="footer">
            <nav>
              <!-- <button v-if="isAdminRoute" type="button" @click="resetApp">Back to game</button> -->
              <NuxtLink v-if="!isAdminRoute" to="/admin">Admin</NuxtLink>
            </nav>
          </footer>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const enableViewportFit = import.meta.dev;

const route = useRoute();
const isAdminRoute = computed(() => route.path === "/admin");
const hasTouchedGate = useState<boolean>("hasTouchedGate", () => false);
const appResetSignal = useState<number>("appResetSignal", () => 0);

function resetApp() {
  hasTouchedGate.value = false;
  appResetSignal.value += 1;
  navigateTo("/");
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
      width: "100%",
      height: "100%",
      transform: "none",
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
    window.addEventListener("resize", updateViewportScale, { passive: true });
  }


  setTimeout(() => {
    viewportContent.value?.style.setProperty("opacity", "1");
    viewportContent.value?.style.setProperty("transition", "opacity 0.6s ease, transform 0.3s ease");
  }, 500);


});

onBeforeUnmount(() => {
  if (enableViewportFit) {
    window.removeEventListener("resize", updateViewportScale);
  }
});
</script>

<style scoped lang="scss">
.app-viewport-fit {
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}

.app-viewport-fit--scaled {
  position: fixed;
  inset: 0;
}

.app-viewport-content {
  opacity: 0;
  width: 100%;
  height: 100%;
}

.app-viewport-fit--scaled .app-viewport-content {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: top left;
  will-change: transform;
}

.site-shell {
  width: 100%;
  height: 100%;
}

.site-header {
  z-index: 300;
}

.brand-logo {
  position: absolute;
  left: 80px;
  top: 80px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  appearance: none;
}

.brand-logo img {
  display: block;
  width: 160px;
  height: auto;
}
</style>

<template>
  <article class="card info-page">
    <div class="info-head">
      <div>
        <h1>Info panel</h1>
      </div>
      <NuxtLink class="btn" to="/">Back to game</NuxtLink>
    </div>

    <ContentRenderer v-if="page" :value="page" />
  </article>
</template>

<script setup lang="ts">
const { data: page } = await useAsyncData("rules-content", async () => {
  return queryCollection("content").where("path", "=", "/rules").first();
});
</script>

<style scoped>
.info-page {
  padding: clamp(18px, 3vw, 30px);
  display: flex;
  flex-direction: column;
  gap: 48px;
  height: 100%;
  margin-bottom: 32px;
}

.info-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
</style>

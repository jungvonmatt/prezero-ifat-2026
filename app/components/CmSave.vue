<template>
  <article>
    <form class="save-form" @submit.prevent="emit('submit')">
      <input :value="playerName" placeholder="Your name" maxlength="24" :disabled="!canSubmit || isSaving" @input="onInput" />
      <button class="btn secondary" :disabled="!canSubmit || isSaving">
        {{ isSaving ? "Saving..." : "Save score" }}
      </button>
    </form>
  </article>
</template>

<script setup lang="ts">
const props = defineProps<{
  playerName: string;
  canSubmit: boolean;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  (event: "update:playerName", value: string): void;
  (event: "submit"): void;
}>();

function onInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  emit("update:playerName", target?.value ?? "");
}
</script>

<style scoped lang="scss">
@use "~/assets/styles/colors" as variables;

.save-form {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  margin-top: 10px;

  color: #fff;
}

.save-form input {
  width: 100%;

  padding: 12px 16px;

  color: #fff;
  font-family: Goldman;
  font-size: 40px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;

  background-color: transparent;

  border-radius: 10px 0 10px 10px;
  border: 1px solid rgba(255, 255, 255, 1);
}

@media (max-width: 860px) {
  .save-form {
    flex-direction: column;
  }
}
</style>

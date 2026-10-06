<script setup lang="ts">
defineProps<{ name: string, photoUrl: string | null }>()
const failed = ref(false)
</script>

<template>
  <span
    class="member-photo"
    aria-hidden="true"
  >
    <img
      v-if="photoUrl && !failed"
      :src="photoUrl"
      alt=""
      loading="lazy"
      @error="failed = true"
    >
    <span v-else>{{ name.split(' ').slice(0, 2).map(part => part[0]).join('') }}</span>
  </span>
</template>

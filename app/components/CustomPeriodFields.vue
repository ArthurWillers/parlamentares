<script setup lang="ts">
const props = defineProps<{ years: number[] }>()
const start = defineModel<string>('start', { required: true })
const end = defineModel<string>('end', { required: true })
const minimum = computed(() => `${props.years[0] ?? 2008}-01`)
const maximum = computed(() => `${props.years.at(-1) ?? new Date().getFullYear()}-12`)
</script>

<template>
  <fieldset class="custom-period-fields">
    <legend>Intervalo personalizado</legend>
    <label class="filter-field">
      <span>Mês inicial</span>
      <UInput
        v-model.lazy="start"
        type="month"
        :min="minimum"
        :max="end || maximum"
        class="w-full"
        :ui="{ base: 'bg-white text-slate-800' }"
      />
    </label>
    <label class="filter-field">
      <span>Mês final</span>
      <UInput
        v-model.lazy="end"
        type="month"
        :min="start || minimum"
        :max="maximum"
        class="w-full"
        :ui="{ base: 'bg-white text-slate-800' }"
      />
    </label>
    <p>Meses inicial e final incluídos. O filtro usa a competência da despesa.</p>
  </fieldset>
</template>

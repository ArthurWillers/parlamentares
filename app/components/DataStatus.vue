<script setup lang="ts">
import type { Manifest } from '~/types/financial'
import { formatCollectionDate } from '~/utils/financial'

defineProps<{ pending: boolean, failed: boolean, manifest: Manifest | null | undefined }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <UAlert
    v-if="failed"
    color="error"
    title="Não foi possível ler os dados publicados"
    description="Tente carregar os arquivos novamente. Uma falha de leitura não significa gasto zero."
    :actions="[{ label: 'Tentar novamente', onClick: () => $emit('retry') }]"
  />
  <p
    v-else-if="pending"
    role="status"
    class="data-status"
  >
    Carregando dados publicados…
  </p>
  <div
    v-else-if="manifest"
    class="demo-notice data-notice"
    role="status"
  >
    <UIcon
      name="i-lucide-database"
      aria-hidden="true"
    />
    <p><strong>Dados oficiais.</strong> Processado em {{ formatCollectionDate(manifest.generatedAt) }} (Brasília). Anos disponíveis: {{ manifest.years.join(', ') }}. O ano corrente tem cobertura parcial.</p>
    <NuxtLink to="/fontes">Cobertura e método</NuxtLink>
  </div>
</template>

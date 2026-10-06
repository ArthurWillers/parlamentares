<script setup lang="ts">
import { previewParliamentarians } from '~/data/preview-expenses'
import { useExpenseFilters } from '~/composables/useExpenseFilters'

const { filters } = useExpenseFilters()
const reverseRanking = ref(false)

const members = computed(() => {
  const query = filters.search.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim()
  return previewParliamentarians
    .filter(member => member.chamber === filters.chamber)
    .filter((member) => {
      const searchable = `${member.name} ${member.party} ${member.state}`.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR')
      return !query || searchable.includes(query)
    })
    .map(member => ({
      ...member,
      cents: filters.period.startsWith('q')
        ? member.monthlyCents.slice((Number(filters.period.slice(1)) - 1) * 3, Number(filters.period.slice(1)) * 3).reduce((sum, cents) => sum + cents, 0)
        : member.monthlyCents.reduce((sum, cents) => sum + cents, 0)
    }))
    .sort((a, b) => reverseRanking.value ? a.cents - b.cents : b.cents - a.cents)
})

const periodLabel = computed(() => filters.period === 'mandato'
  ? 'Amostra parcial do mandato; somente dados demonstrativos de 2025'
  : filters.period.startsWith('q')
    ? `${Number(filters.period.slice(1))}º trimestre de 2025`
    : 'Ano de 2025')

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(cents / 100)
}

function profileRoute(id: string) {
  return `/parlamentares/${id}?periodo=${filters.period}`
}

useSeoMeta({
  title: 'Parlamentares | Gastos da cota',
  description: 'Busque perfis e compare despesas demonstrativas de deputados federais e senadores.'
})
</script>

<template>
  <main class="directory-page">
    <p class="breadcrumbs">
      <NuxtLink to="/">Visão geral</NuxtLink><span aria-hidden="true">/</span> Parlamentares
    </p>

    <div
      class="demo-notice"
      aria-label="Aviso sobre os dados desta prévia"
    >
      <span
        class="notice-mark"
        aria-hidden="true"
      ><UIcon name="i-lucide-flask-conical" /></span>
      <p><strong>Prévia de interface.</strong> Os nomes, partidos e valores abaixo são fictícios.</p>
      <span class="notice-tag">Sem dados oficiais</span>
    </div>

    <header class="directory-intro">
      <p class="intro-kicker">
        Consulta individual
      </p>
      <h1>Parlamentares</h1>
      <p>Compare os valores demonstrativos e abra um perfil para ver categorias, fornecedores e cobertura.</p>
    </header>

    <section
      class="directory-filters"
      aria-label="Filtros de parlamentares"
    >
      <fieldset class="chamber-field">
        <legend>Casa legislativa</legend>
        <div class="segmented-control">
          <button
            type="button"
            :aria-pressed="filters.chamber === 'deputados'"
            @click="filters.chamber = 'deputados'"
          >
            Deputados
          </button>
          <button
            type="button"
            :aria-pressed="filters.chamber === 'senadores'"
            @click="filters.chamber = 'senadores'"
          >
            Senadores
          </button>
        </div>
      </fieldset>
      <label class="filter-field">
        <span>Período</span>
        <select
          v-model="filters.period"
          aria-label="Período do ranking"
        >
          <option value="ano">Ano de 2025</option><option value="mandato">Mandato (quando coberto)</option>
          <option value="q1">1º trimestre</option><option value="q2">2º trimestre</option><option value="q3">3º trimestre</option><option value="q4">4º trimestre</option>
        </select>
      </label>
      <label class="directory-search">
        <UIcon
          name="i-lucide-search"
          aria-hidden="true"
        />
        <span class="sr-only">Buscar por parlamentar, partido ou estado</span>
        <input
          v-model="filters.search"
          type="search"
          placeholder="Nome, partido ou estado"
          autocomplete="off"
        >
      </label>
      <div
        class="ranking-switch"
        aria-label="Ordenação dos valores"
      >
        <button
          type="button"
          :aria-pressed="!reverseRanking"
          @click="reverseRanking = false"
        >
          Maior valor
        </button>
        <button
          type="button"
          :aria-pressed="reverseRanking"
          @click="reverseRanking = true"
        >
          Menor valor
        </button>
      </div>
    </section>
    <p
      v-if="filters.period === 'mandato'"
      class="directory-period-note"
    >
      {{ periodLabel }}. O total do mandato completo não está disponível nesta prévia.
    </p>

    <section
      class="directory-results"
      aria-live="polite"
    >
      <header><h2>{{ members.length }} {{ filters.chamber === 'deputados' ? 'deputados' : 'senadores' }}</h2><span>{{ periodLabel }}</span></header>
      <ol v-if="members.length">
        <li
          v-for="(member, index) in members"
          :key="member.id"
        >
          <span class="directory-rank">{{ String(index + 1).padStart(2, '0') }}</span>
          <NuxtLink
            :to="profileRoute(member.id)"
            class="directory-member-link"
          >
            <span
              class="directory-avatar"
              aria-hidden="true"
            >{{ member.name.split(' ').filter(part => !['Deputado', 'Deputada', 'Senador', 'Senadora'].includes(part)).slice(0, 2).map(part => part[0]).join('') }}</span>
            <span><strong>{{ member.name }}</strong><small>{{ member.party }} · {{ member.state }}</small></span>
          </NuxtLink>
          <span class="directory-amount">{{ formatMoney(member.cents) }}</span>
          <UIcon
            class="directory-arrow"
            name="i-lucide-chevron-right"
            aria-hidden="true"
          />
        </li>
      </ol>
      <div
        v-else
        class="empty-state"
      >
        <UIcon
          name="i-lucide-search-x"
          aria-hidden="true"
        /><h3>Nenhum resultado</h3><p>Tente outro nome, partido ou estado.</p>
      </div>
    </section>
  </main>
</template>

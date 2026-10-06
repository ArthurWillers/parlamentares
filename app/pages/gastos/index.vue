<script setup lang="ts">
import { periodQuery } from '~/utils/period'
import { brazilianStates, formatMoney, formatCollectionDate } from '~/utils/financial'

const { manifest, years, filters, resetFilters, error, pending, retry, periodLabel, visibleMembers, partyOptions } = useFinancialData()
const order = ref('maior')
const activeFilters = computed(() => filters.status !== 'em-exercicio' || filters.period !== 'ano' || Boolean(filters.search || filters.party || filters.state))
function selectChamber(chamber: 'deputados' | 'senadores') {
  filters.chamber = chamber
  filters.party = ''
  filters.state = ''
}
const members = computed(() => [...visibleMembers.value].sort((a, b) => {
  if (order.value === 'nome') return a.name.localeCompare(b.name, 'pt-BR')
  if (a.cents === null) return b.cents === null ? a.name.localeCompare(b.name) : 1
  if (b.cents === null) return -1
  return order.value === 'menor' ? a.cents - b.cents : b.cents - a.cents
}))
const resultLabel = computed(() => {
  const count = members.value.length
  const noun = filters.chamber === 'deputados' ? count === 1 ? 'deputado' : 'deputados' : count === 1 ? 'senador' : 'senadores'
  return filters.status === 'todos' ? `${count} ${count === 1 ? 'perfil' : 'perfis'} de ${noun}` : `${count} ${noun} em exercício`
})
function profileRoute(id: string) {
  return { path: `/gastos/${id.replace(':', '-')}`, query: periodQuery(filters) }
}
useSeoMeta({ title: 'Parlamentares | Gastos da cota', description: 'Busque perfis e consulte despesas oficiais de deputados federais e senadores.' })
</script>

<template>
  <div class="directory-page">
    <p class="breadcrumbs">
      <NuxtLink to="/">Visão geral</NuxtLink><span aria-hidden="true">/</span> Parlamentares
    </p>

    <DataStatus
      :pending="pending"
      :failed="Boolean(error)"
      :manifest="manifest"
      @retry="retry"
    />

    <header class="directory-intro">
      <p class="intro-kicker">
        Consulta individual
      </p>
      <h1 id="page-title">
        Parlamentares
      </h1>
      <p>Compare os valores publicados e abra um perfil para ver categorias, fornecedores e cobertura.</p>
    </header>

    <section
      class="directory-filters"
      aria-label="Filtros de parlamentares"
    >
      <div class="directory-filter-primary">
        <fieldset class="chamber-field">
          <legend>Casa legislativa</legend>
          <div class="segmented-control">
            <button
              type="button"
              :aria-pressed="filters.chamber === 'deputados'"
              @click="selectChamber('deputados')"
            >
              Deputados
            </button>
            <button
              type="button"
              :aria-pressed="filters.chamber === 'senadores'"
              @click="selectChamber('senadores')"
            >
              Senadores
            </button>
          </div>
        </fieldset>
        <label class="filter-field">
          <span>Situação atual</span>
          <select v-model="filters.status">
            <option value="em-exercicio">Em exercício</option>
            <option value="todos">Todos os perfis</option>
          </select>
        </label>
        <label
          for="directory-search"
          class="filter-field"
        >
          <span>Buscar parlamentar</span>
          <UInput
            id="directory-search"
            v-model="filters.search"
            icon="i-lucide-search"
            type="search"
            placeholder="Nome, partido ou estado"
            autocomplete="off"
            class="directory-search"
            :ui="{ base: 'bg-[#FFFFFF] text-[#172C3E] placeholder:text-[#768590] dark:bg-[#FFFFFF] dark:text-[#172C3E] dark:placeholder:text-[#768590]' }"
            variant="none"
          />
        </label>
      </div>
      <div class="directory-filter-secondary">
        <label
          v-if="filters.period !== 'historico' && filters.period !== 'personalizado'"
          class="filter-field"
        >
          <span>Ano</span>
          <select v-model="filters.year">
            <option
              v-for="year in years"
              :key="year"
              :value="year"
            >{{ year }}</option>
          </select>
        </label>
        <div
          v-else
          class="filter-field"
        >
          <span>{{ filters.period === 'personalizado' ? 'Cobertura disponível' : 'Anos incluídos' }}</span>
          <span class="filter-static">{{ years[0] }}–{{ years.at(-1) }}</span>
        </div>
        <label class="filter-field">
          <span>Período</span>
          <select
            v-model="filters.period"
            aria-label="Período do ranking"
          >
            <option value="ano">Ano inteiro</option>
            <option value="historico">Histórico disponível</option>
            <option value="personalizado">Período personalizado</option>
            <option value="q1">1º trimestre</option><option value="q2">2º trimestre</option><option value="q3">3º trimestre</option><option value="q4">4º trimestre</option>
          </select>
        </label>
        <label class="filter-field"><span>Partido na despesa</span><select v-model="filters.party"><option value="">Todos</option><option
          v-for="party in partyOptions"
          :key="party"
          :value="party"
        >{{ party }}</option></select></label>
        <label class="filter-field"><span>Estado</span><select v-model="filters.state"><option value="">Todos</option><option
          v-for="[code, name] in brazilianStates"
          :key="code"
          :value="code"
        >{{ name }}</option></select></label>
        <UButton
          v-if="activeFilters"
          variant="ghost"
          color="neutral"
          icon="i-lucide-rotate-ccw"
          size="sm"
          @click="resetFilters"
        >
          Limpar filtros
        </UButton>
        <CustomPeriodFields
          v-if="filters.period === 'personalizado'"
          v-model:start="filters.startMonth"
          v-model:end="filters.endMonth"
          :years="years"
        />
      </div>
      <p
        v-if="manifest"
        class="directory-scope-note"
      >
        {{ filters.status === 'em-exercicio' ? 'Em exercício na última coleta.' : 'Inclui suplentes e ex-parlamentares de todo o histórico coletado.' }}
        Dados processados em {{ formatCollectionDate(manifest.generatedAt) }} (Brasília).
        O ano e o período filtram as despesas, não a situação de exercício.
      </p>
    </section>
    <p class="directory-period-note">
      A ordenação considera somente valores publicados na mesma Casa e período; não mede eficiência. Ausência de registros não é zero. A filiação ao lado do nome vem do cadastro mais recente.
    </p>

    <section
      v-if="!pending && !error"
      class="directory-results"
      aria-live="polite"
    >
      <header>
        <div>
          <h2>{{ resultLabel }}</h2>
          <span>{{ periodLabel }}</span>
        </div>
        <label class="directory-sort">
          <span>Ordenar por</span>
          <select v-model="order">
            <option value="maior">Maior valor</option>
            <option value="menor">Menor valor</option>
            <option value="nome">Nome A–Z</option>
          </select>
        </label>
      </header>
      <ol v-if="members.length">
        <li
          v-for="(member, index) in members"
          :key="member.id"
        >
          <span class="directory-rank">{{ member.cents === null || order === 'nome' ? '—' : String(index + 1).padStart(2, '0') }}</span>
          <NuxtLink
            :to="profileRoute(member.id)"
            class="directory-member-link"
          >
            <MemberAvatar
              class="directory-avatar"
              :name="member.name"
              :photo-url="member.photoUrl"
            />
            <span><strong>{{ member.name }}</strong><small>{{ member.party }} · {{ member.state }}{{ filters.status === 'todos' ? member.current ? ' · Em exercício' : ' · Fora de exercício na coleta' : '' }}</small></span>
          </NuxtLink>
          <span class="directory-amount">{{ member.cents === null ? 'Sem registros no recorte' : formatMoney(member.cents) }}</span>
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
        /><h3>Nenhum resultado</h3><p>Ajuste a busca ou os filtros de situação, partido e estado.</p>
      </div>
    </section>
  </div>
</template>

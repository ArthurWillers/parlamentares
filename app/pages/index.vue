<script setup lang="ts">
import { brazilianStates, expenseCategories, previewParliamentarians } from '~/data/preview-expenses'
import { useExpenseFilters } from '~/composables/useExpenseFilters'

const { filters, resetFilters } = useExpenseFilters()

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const periods = [
  { value: 'ano', label: 'Ano de 2025' },
  { value: 'mandato', label: 'Mandato (quando coberto)' },
  { value: 'q1', label: '1º trimestre' },
  { value: 'q2', label: '2º trimestre' },
  { value: 'q3', label: '3º trimestre' },
  { value: 'q4', label: '4º trimestre' }
] as const
const categoryColors = ['#197A66', '#3458D4', '#71968D', '#8B9CAD'] as const

const periodMonths = computed(() => {
  if (filters.period === 'ano' || filters.period === 'mandato') return Array.from({ length: 12 }, (_, index) => index)
  const quarter = Number(filters.period.slice(1)) - 1
  return [quarter * 3, quarter * 3 + 1, quarter * 3 + 2]
})
const monthlyAmount = (member: typeof previewParliamentarians[number], month: number) => member.monthlyCents[month] ?? 0

const periodLabel = computed(() => filters.period === 'mandato'
  ? 'Amostra parcial do mandato'
  : periods.find(period => period.value === filters.period)?.label ?? 'Ano de 2025')
const stateLabel = (code: string) => brazilianStates.find(state => state[0] === code)?.[1] ?? code

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim()
}

const chamberMembers = computed(() => previewParliamentarians.filter(member => member.chamber === filters.chamber))
const partyOptions = computed(() => [...new Set(chamberMembers.value.map(member => member.party))].sort())
const stateOptions = computed(() => {
  const stateCodes = new Set(chamberMembers.value.map(member => member.state))
  return brazilianStates.filter(([code]) => stateCodes.has(code))
})

const visibleMembers = computed(() => {
  const query = normalizeSearch(filters.search)

  return chamberMembers.value.filter((member) => {
    const matchesState = !filters.state || member.state === filters.state
    const matchesParty = !filters.party || member.party === filters.party
    const searchable = normalizeSearch(`${member.name} ${member.party} ${member.state} ${stateLabel(member.state)}`)
    const matchesQuery = !query || searchable.includes(query)
    return matchesState && matchesParty && matchesQuery
  })
})

const monthlyTotals = computed(() => periodMonths.value.map((month) => {
  return visibleMembers.value.reduce((sum, member) => sum + monthlyAmount(member, month), 0)
}))

const totalCents = computed(() => monthlyTotals.value.reduce((sum, amount) => sum + amount, 0))
const maximumMonthlyTotal = computed(() => Math.max(...monthlyTotals.value, 1))
const averageCents = computed(() => visibleMembers.value.length ? Math.round(totalCents.value / visibleMembers.value.length) : 0)
const stateCount = computed(() => new Set(visibleMembers.value.map(member => member.state)).size)

const categoryTotals = computed(() => {
  const totals = new Map<string, number>(expenseCategories.map(category => [category, 0]))

  for (const member of visibleMembers.value) {
    for (const month of periodMonths.value) {
      const monthlyTotal = monthlyAmount(member, month)
      let allocated = 0

      expenseCategories.forEach((category, index) => {
        const amount = index === expenseCategories.length - 1
          ? monthlyTotal - allocated
          : Math.round(monthlyTotal * member.categoryShares[category] / 100)
        allocated += amount
        totals.set(category, (totals.get(category) ?? 0) + amount)
      })
    }
  }

  return expenseCategories
    .map((category, index) => {
      const cents = totals.get(category) ?? 0
      return {
        name: category,
        cents,
        color: categoryColors[index % categoryColors.length],
        share: totalCents.value ? cents / totalCents.value * 100 : 0
      }
    })
    .sort((a, b) => b.cents - a.cents)
})

const rankedMembers = computed(() => visibleMembers.value
  .map(member => ({
    ...member,
    cents: periodMonths.value.reduce((sum, month) => sum + monthlyAmount(member, month), 0)
  }))
  .sort((a, b) => b.cents - a.cents))

const partyRankings = computed(() => {
  const totals = new Map<string, number>()
  for (const member of visibleMembers.value) {
    const cents = periodMonths.value.reduce((sum, month) => sum + monthlyAmount(member, month), 0)
    totals.set(member.party, (totals.get(member.party) ?? 0) + cents)
  }
  return [...totals.entries()]
    .map(([party, cents]) => ({ party, cents }))
    .sort((a, b) => b.cents - a.cents)
})

const rankMaximum = computed(() => Math.max(...rankedMembers.value.map(member => member.cents), 1))
const partyRankMaximum = computed(() => Math.max(...partyRankings.value.map(party => party.cents), 1))
const reversePartyRanking = ref(false)
const displayedPartyRankings = computed(() => reversePartyRanking.value ? [...partyRankings.value].reverse() : partyRankings.value)
const reverseRanking = ref(false)
const displayedMembers = computed(() => reverseRanking.value ? [...rankedMembers.value].reverse() : rankedMembers.value)
const activeFilters = computed(() => filters.period !== 'ano' || Boolean(filters.state || filters.party || filters.search))

function memberRoute(id: string) {
  return `/parlamentares/${id}?periodo=${filters.period}`
}

function selectChamber(chamber: 'deputados' | 'senadores') {
  if (filters.chamber === chamber) return
  filters.chamber = chamber
  filters.party = ''
  filters.state = ''
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(cents / 100)
}

function formatCompactMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 0
  }).format(cents / 100)
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
}

useSeoMeta({
  title: 'Gastos da cota parlamentar | Parlamentares',
  description: 'Consulte e compare despesas da cota parlamentar de deputados federais e senadores.'
})
</script>

<template>
  <div class="dashboard">
    <section
      class="demo-notice"
      aria-label="Aviso sobre os dados desta prévia"
    >
      <span
        class="notice-mark"
        aria-hidden="true"
      ><UIcon name="i-lucide-flask-conical" /></span>
      <p><strong>Prévia de interface.</strong> Todos os nomes, partidos e valores desta página são fictícios.</p>
      <span class="notice-tag">Sem dados oficiais</span>
    </section>

    <section
      class="intro"
      aria-labelledby="page-title"
    >
      <div>
        <p class="intro-kicker">
          Cota para exercício da atividade parlamentar
        </p>
        <h1 id="page-title">
          Gastos do Congresso,<br class="desktop-break"> em detalhe.
        </h1>
        <p class="intro-copy">
          Explore despesas de deputados e senadores por período, partido, estado ou parlamentar.
        </p>
      </div>
      <aside class="scope-note">
        <UIcon
          name="i-lucide-info"
          aria-hidden="true"
        />
        <p>A cota parlamentar cobre parte das despesas do mandato. Não representa seu custo total.</p>
      </aside>
    </section>

    <section
      class="filters"
      aria-label="Filtros de despesas"
    >
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
        <span>Período</span>
        <select
          v-model="filters.period"
          aria-label="Filtrar período"
        >
          <option
            v-for="period in periods"
            :key="period.value"
            :value="period.value"
          >{{ period.label }}</option>
        </select>
      </label>
      <p
        v-if="filters.period === 'mandato'"
        class="filter-explainer"
      >
        A prévia só contém 2025; o total do mandato ainda não pode ser calculado.
      </p>

      <label class="filter-field">
        <span>Estado</span>
        <select
          v-model="filters.state"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos</option>
          <option
            v-for="[code, name] in stateOptions"
            :key="code"
            :value="code"
          >{{ name }}</option>
        </select>
      </label>

      <label class="filter-field">
        <span>Partido</span>
        <select
          v-model="filters.party"
          aria-label="Filtrar por partido"
        >
          <option value="">Todos</option>
          <option
            v-for="party in partyOptions"
            :key="party"
            :value="party"
          >{{ party }}</option>
        </select>
      </label>

      <UButton
        v-if="activeFilters"
        class="clear-filters"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-rotate-ccw"
        @click="resetFilters"
      >
        Limpar
      </UButton>
    </section>

    <label class="search-field">
      <UIcon
        name="i-lucide-search"
        aria-hidden="true"
      />
      <span class="sr-only">Buscar parlamentar, partido ou estado</span>
      <input
        v-model="filters.search"
        type="search"
        placeholder="Buscar parlamentar, partido ou estado"
        autocomplete="off"
      >
    </label>

    <section
      id="resumo"
      class="summary"
      aria-label="Resumo das despesas demonstrativas"
    >
      <article class="summary-item">
        <h2>Despesas de cota na seleção</h2>
        <p>{{ visibleMembers.length ? formatMoney(totalCents) : '—' }}</p>
        <span>{{ filters.period === 'mandato' ? 'somente registros demonstrativos de 2025' : `${periodLabel} · 2025` }}</span>
      </article>
      <article class="summary-item">
        <h2>Parlamentares</h2>
        <p>{{ visibleMembers.length }}</p>
        <span>na seleção atual</span>
      </article>
      <article class="summary-item">
        <h2>Estados</h2>
        <p>{{ visibleMembers.length ? stateCount : '—' }}</p>
        <span>com dados demonstrativos</span>
      </article>
      <article class="summary-item">
        <h2>Média por parlamentar</h2>
        <p>{{ visibleMembers.length ? formatMoney(averageCents) : '—' }}</p>
        <span>no período selecionado</span>
      </article>
    </section>

    <section
      class="analysis-panel"
      aria-label="Análise dos gastos"
    >
      <div class="trend-section">
        <header class="section-heading">
          <div>
            <h2>Evolução mensal</h2>
            <p>{{ filters.period === 'mandato' ? 'Amostra parcial: registros demonstrativos de 2025' : `Despesas demonstrativas em 2025 · ${periodLabel}` }}</p>
          </div>
          <span class="section-total">{{ visibleMembers.length ? formatMoney(totalCents) : '—' }}</span>
        </header>

        <div
          v-if="visibleMembers.length"
          class="chart-scroll"
          role="region"
          tabindex="0"
          aria-label="Gráfico mensal demonstrativo; deslize horizontalmente para ver todos os meses"
        >
          <ol
            class="monthly-chart"
            :class="{ 'quarter-chart': filters.period !== 'ano' }"
          >
            <li
              v-for="(monthIndex, index) in periodMonths"
              :key="monthIndex"
              class="chart-month"
              :aria-label="`${months[monthIndex] ?? ''}: ${formatMoney(monthlyTotals[index] ?? 0)}`"
            >
              <span
                class="bar-value"
                aria-hidden="true"
              >{{ formatCompactMoney(monthlyTotals[index] ?? 0) }}</span>
              <div
                class="bar-track"
                aria-hidden="true"
              >
                <div
                  class="bar-fill"
                  :style="{ height: `${Math.max((monthlyTotals[index] ?? 0) / maximumMonthlyTotal * 100, 2)}%` }"
                />
              </div>
              <span
                class="month-label"
                aria-hidden="true"
              >{{ months[monthIndex] ?? '' }}</span>
            </li>
          </ol>
        </div>
        <div
          v-else
          class="empty-state"
        >
          <UIcon
            name="i-lucide-search-x"
            aria-hidden="true"
          />
          <h3>Nenhum resultado nesta combinação</h3>
          <p>Experimente trocar a busca ou remover algum filtro.</p>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            @click="resetFilters"
          >
            Limpar filtros
          </UButton>
        </div>
        <p class="chart-caption">
          Valores fictícios para demonstrar a leitura mensal. Esta série cobre apenas 2025.
        </p>
      </div>

      <aside
        class="category-section"
        aria-labelledby="categories-title"
      >
        <header class="section-heading category-heading">
          <div>
            <h2 id="categories-title">
              Por categoria
            </h2>
            <p>Participação no período</p>
          </div>
        </header>
        <ul
          v-if="visibleMembers.length"
          class="category-list"
        >
          <li
            v-for="category in categoryTotals"
            :key="category.name"
          >
            <div class="category-label">
              <span>{{ category.name }}</span>
              <strong>{{ formatPercent(category.share) }}%</strong>
            </div>
            <div
              class="category-track"
              aria-hidden="true"
            >
              <span
                class="category-fill"
                :style="{ width: `${category.share}%`, backgroundColor: category.color }"
              />
            </div>
            <span class="category-value">{{ formatMoney(category.cents) }}</span>
          </li>
        </ul>
        <p
          v-else
          class="category-empty"
        >
          Não há registros demonstrativos para esta combinação.
        </p>
        <p class="category-caption">
          Categorias ilustrativas. A classificação oficial ainda será definida.
        </p>
      </aside>
    </section>

    <section
      id="parlamentares"
      class="ranking-section"
      aria-labelledby="ranking-title"
    >
      <header class="ranking-heading">
        <div>
          <h2 id="ranking-title">
            Gastos por parlamentar
          </h2>
          <p>Compare o total demonstrativo no recorte atual</p>
        </div>
        <span class="ranking-period">{{ filters.chamber === 'deputados' ? 'Câmara' : 'Senado' }} · {{ periodLabel }}</span>
      </header>

      <div class="rankings-board">
        <section
          class="ranking-card"
          aria-labelledby="party-ranking-title"
        >
          <div class="ranking-card-heading">
            <h3 id="party-ranking-title">
              Partidos
            </h3>
            <div
              class="ranking-switch"
              aria-label="Ordenar partidos"
            >
              <button
                type="button"
                :aria-pressed="!reversePartyRanking"
                @click="reversePartyRanking = false"
              >
                Mais
              </button>
              <button
                type="button"
                :aria-pressed="reversePartyRanking"
                @click="reversePartyRanking = true"
              >
                Menos
              </button>
            </div>
          </div>
          <ol
            v-if="partyRankings.length"
            class="compact-ranking-list"
          >
            <li
              v-for="(party, index) in displayedPartyRankings"
              :key="party.party"
            >
              <span
                class="rank-number"
                aria-hidden="true"
              >{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="compact-rank-name">{{ party.party }}</span>
              <span
                class="compact-rank-track"
                aria-hidden="true"
              ><i :style="{ width: `${party.cents / partyRankMaximum * 100}%` }" /></span>
              <strong>{{ formatMoney(party.cents) }}</strong>
            </li>
          </ol>
          <p
            v-else
            class="ranking-empty"
          >
            Sem partidos neste recorte.
          </p>
        </section>

        <section
          class="ranking-card"
          aria-labelledby="member-ranking-title"
        >
          <div class="ranking-card-heading">
            <h3 id="member-ranking-title">
              Parlamentares
            </h3>
            <div
              class="ranking-switch"
              aria-label="Ordenar parlamentares"
            >
              <button
                type="button"
                :aria-pressed="!reverseRanking"
                @click="reverseRanking = false"
              >
                Mais
              </button>
              <button
                type="button"
                :aria-pressed="reverseRanking"
                @click="reverseRanking = true"
              >
                Menos
              </button>
            </div>
          </div>
          <ol
            v-if="displayedMembers.length"
            class="compact-ranking-list"
          >
            <li
              v-for="(member, index) in displayedMembers.slice(0, 5)"
              :key="member.id"
            >
              <span
                class="rank-number"
                aria-hidden="true"
              >{{ String(index + 1).padStart(2, '0') }}</span>
              <NuxtLink
                class="compact-rank-name"
                :to="memberRoute(member.id)"
              >
                <strong>{{ member.name }}</strong>
                <small>{{ member.party }} · {{ member.state }}</small>
              </NuxtLink>
              <span
                class="compact-rank-track"
                aria-hidden="true"
              ><i :style="{ width: `${member.cents / rankMaximum * 100}%` }" /></span>
              <strong>{{ formatMoney(member.cents) }}</strong>
            </li>
          </ol>
          <p
            v-else
            class="ranking-empty"
          >
            Sem parlamentares neste recorte.
          </p>
          <NuxtLink
            class="text-link"
            to="/parlamentares"
          >Ver todos os parlamentares <UIcon
            name="i-lucide-arrow-right"
            aria-hidden="true"
          /></NuxtLink>
        </section>
      </div>
    </section>

    <section
      class="funds-note"
      aria-labelledby="funds-title"
    >
      <div
        class="funds-mark"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-landmark" />
      </div>
      <div>
        <h2 id="funds-title">
          Recursos de partidos e eleições ficam em outra conta
        </h2>
        <p>O Fundo Partidário e o FEFC aparecem em prestações de contas do TSE. Eles não entram no total individual de gastos parlamentares.</p>
      </div>
      <NuxtLink to="/fontes">Entenda as fontes <UIcon
        name="i-lucide-arrow-right"
        aria-hidden="true"
      /></NuxtLink>
    </section>

    <section
      id="metodologia"
      class="methodology-note"
      aria-labelledby="method-title"
    >
      <UIcon
        name="i-lucide-book-open-check"
        aria-hidden="true"
      />
      <div>
        <h2 id="method-title">
          Como ler estes números
        </h2>
        <p>Esta prévia usa apenas exemplos inventados. Quando os dados forem conectados, cada recorte mostrará fonte, cobertura, data de atualização e método de cálculo.</p>
      </div>
      <NuxtLink to="/fontes">Ver fontes e metodologia <UIcon
        name="i-lucide-arrow-right"
        aria-hidden="true"
      /></NuxtLink>
    </section>
  </div>
</template>

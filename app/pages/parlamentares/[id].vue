<script setup lang="ts">
import { expenseCategories, previewParliamentarians } from '~/data/preview-expenses'
import { useExpenseFilters } from '~/composables/useExpenseFilters'

const route = useRoute()
const { filters } = useExpenseFilters()
const member = computed(() => previewParliamentarians.find(item => item.id === route.params.id))
const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const categoryColors = ['#197A66', '#3458D4', '#71968D', '#8B9CAD'] as const

const periodMonths = computed(() => {
  if (filters.period === 'ano' || filters.period === 'mandato') return Array.from({ length: 12 }, (_, index) => index)
  const quarter = Number(filters.period.slice(1)) - 1
  return [quarter * 3, quarter * 3 + 1, quarter * 3 + 2]
})

const periodLabel = computed(() => filters.period === 'mandato'
  ? 'Amostra parcial do mandato · dados de 2025'
  : filters.period === 'ano'
    ? 'Ano de 2025'
    : `${Number(filters.period.slice(1))}º trimestre de 2025`)

const totalCents = computed(() => member.value
  ? periodMonths.value.reduce((total, month) => total + (member.value?.monthlyCents[month] ?? 0), 0)
  : 0)

const categories = computed(() => {
  const currentMember = member.value
  if (!currentMember) return []
  let allocatedCents = 0
  return expenseCategories.map((name, index) => {
    const cents = index === expenseCategories.length - 1
      ? totalCents.value - allocatedCents
      : Math.round(totalCents.value * currentMember.categoryShares[name] / 100)
    allocatedCents += cents
    return {
      name,
      cents,
      share: currentMember.categoryShares[name],
      color: categoryColors[index] ?? categoryColors[0]
    }
  }).sort((a, b) => b.cents - a.cents)
})

const monthlyAmounts = computed(() => periodMonths.value.map(month => member.value?.monthlyCents[month] ?? 0))
const monthlyMaximum = computed(() => Math.max(...monthlyAmounts.value, 1))
const initials = computed(() => member.value?.name.split(' ').filter(part => !['Deputado', 'Deputada', 'Senador', 'Senadora'].includes(part)).slice(0, 2).map(part => part[0]).join('') ?? '')

const suppliers = computed(() => {
  const shares = [42, 26, 18, 14]
  const amountsByMonth = periodMonths.value.map((month) => {
    const monthTotal = member.value?.monthlyCents[month] ?? 0
    let allocatedCents = 0
    return shares.map((share, index) => {
      const cents = index === shares.length - 1
        ? monthTotal - allocatedCents
        : Math.round(monthTotal * share / 100)
      allocatedCents += cents
      return cents
    })
  })

  return shares.map((share, index) => {
    const monthlyValues = amountsByMonth.map(values => values[index] ?? 0)
    const peakIndex = monthlyValues.indexOf(Math.max(...monthlyValues))
    return {
      name: `Fornecedor demonstrativo ${String.fromCharCode(65 + index)}`,
      share,
      cents: monthlyValues.reduce((sum, cents) => sum + cents, 0),
      averageMonthlyCents: monthlyValues.length ? Math.round(monthlyValues.reduce((sum, cents) => sum + cents, 0) / monthlyValues.length) : 0,
      peakMonthlyCents: monthlyValues[peakIndex] ?? 0,
      peakMonth: months[periodMonths.value[peakIndex] ?? 0] ?? ''
    }
  })
})

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(cents / 100)
}

useSeoMeta({
  title: () => member.value ? `${member.value.name} | Parlamentares` : 'Parlamentar não encontrado | Parlamentares',
  description: () => member.value ? `Prévia demonstrativa de despesas da cota parlamentar de ${member.value.name}.` : 'Perfil parlamentar não encontrado.'
})
</script>

<template>
  <main
    v-if="member"
    class="profile-page"
  >
    <p class="breadcrumbs">
      <NuxtLink to="/">Visão geral</NuxtLink><span aria-hidden="true">/</span> Perfil parlamentar
    </p>

    <div
      class="demo-notice profile-demo-notice"
      aria-label="Aviso sobre os dados desta prévia"
    >
      <span
        class="notice-mark"
        aria-hidden="true"
      ><UIcon name="i-lucide-flask-conical" /></span>
      <p><strong>Perfil demonstrativo.</strong> Nome, partido e valores são fictícios; nenhum dado oficial foi conectado.</p>
    </div>

    <header class="profile-header">
      <div
        class="profile-avatar"
        aria-hidden="true"
      >
        {{ initials }}
      </div>
      <div class="profile-identity">
        <p class="profile-kicker">
          {{ member.name.startsWith('Deputada') ? 'Deputada federal' : member.name.startsWith('Deputado') ? 'Deputado federal' : member.name.startsWith('Senadora') ? 'Senadora' : 'Senador' }} · {{ member.state }}
        </p>
        <h1>{{ member.name }}</h1>
        <p>{{ member.party }} <span aria-hidden="true">·</span> {{ member.state }}</p>
      </div>
      <label class="filter-field profile-period">
        <span>Período</span>
        <select
          v-model="filters.period"
          aria-label="Período das despesas"
        >
          <option value="ano">Ano de 2025</option>
          <option value="mandato">Mandato (quando coberto)</option>
          <option value="q1">1º trimestre de 2025</option>
          <option value="q2">2º trimestre de 2025</option>
          <option value="q3">3º trimestre de 2025</option>
          <option value="q4">4º trimestre de 2025</option>
        </select>
      </label>
    </header>

    <p
      v-if="filters.period === 'mandato'"
      class="mandate-warning"
    >
      Este protótipo só tem valores de 2025. O número abaixo é uma amostra parcial e não representa o total do mandato.
    </p>

    <section
      class="profile-total"
      aria-label="Resumo da cota parlamentar"
    >
      <div>
        <span>Despesas demonstrativas da cota</span>
        <strong>{{ formatMoney(totalCents) }}</strong>
        <small>{{ periodLabel }} · valores inventados</small>
      </div>
      <p>A Cota para o Exercício da Atividade Parlamentar cobre itens definidos por cada Casa. Ela não representa todo o custo do mandato.</p>
    </section>

    <section class="profile-content-grid">
      <article
        class="profile-panel"
        aria-labelledby="profile-categories-title"
      >
        <header class="profile-panel-heading">
          <div>
            <h2 id="profile-categories-title">
              Em que gastou
            </h2>
            <p>Distribuição demonstrativa por categoria</p>
          </div>
          <span>{{ periodLabel }}</span>
        </header>
        <ul class="profile-category-list">
          <li
            v-for="category in categories"
            :key="category.name"
          >
            <div class="category-label">
              <span>{{ category.name }}</span><strong>{{ category.share }}%</strong>
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
      </article>

      <article
        class="profile-panel profile-monthly-panel"
        aria-labelledby="profile-monthly-title"
      >
        <header class="profile-panel-heading">
          <div>
            <h2 id="profile-monthly-title">
              Ao longo do tempo
            </h2>
            <p>Valores mensais de 2025</p>
          </div>
        </header>
        <ol
          class="profile-monthly-chart"
          :class="{ 'quarter-chart': filters.period.startsWith('q') }"
        >
          <li
            v-for="(month, index) in periodMonths"
            :key="month"
            :aria-label="`${months[month]}: ${formatMoney(monthlyAmounts[index] ?? 0)}`"
          >
            <span
              class="profile-month-bar"
              aria-hidden="true"
            ><i :style="{ height: `${Math.max((monthlyAmounts[index] ?? 0) / monthlyMaximum * 100, 2)}%` }" /></span>
            <span>{{ months[month] }}</span>
          </li>
        </ol>
      </article>
    </section>

    <section
      class="suppliers-panel"
      aria-labelledby="suppliers-title"
    >
      <header class="profile-panel-heading">
        <div>
          <h2 id="suppliers-title">
            Fornecedores
          </h2>
          <p>Concentração por fornecedor e variação mensal na amostra</p>
        </div>
        <span>Identificação fictícia</span>
      </header>
      <div class="supplier-table-wrap">
        <table class="supplier-table">
          <thead>
            <tr>
              <th scope="col">
                Fornecedor
              </th><th scope="col">
                CPF/CNPJ
              </th><th scope="col">
                Participação
              </th><th scope="col">
                Total no período
              </th><th scope="col">
                Média mensal
              </th><th scope="col">
                Maior mês
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="supplier in suppliers"
              :key="supplier.name"
            >
              <td><strong>{{ supplier.name }}</strong><small>Categoria ilustrativa</small></td>
              <td><span class="not-in-sample">Não disponível na prévia</span></td>
              <td>{{ supplier.share }}%</td>
              <td class="supplier-money">
                {{ formatMoney(supplier.cents) }}
              </td><td class="supplier-money">
                {{ formatMoney(supplier.averageMonthlyCents) }}
              </td><td class="supplier-money supplier-peak">
                {{ formatMoney(supplier.peakMonthlyCents) }}<small>{{ supplier.peakMonth }}</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="supplier-footnote">
        Quando houver um identificador publicado pela fonte, ele poderá ser ligado a informações cadastrais complementares. Esse enriquecimento será opcional e não alterará o registro oficial da despesa.
      </p>
    </section>

    <section
      class="disclosure-panel"
      aria-labelledby="other-disclosures-title"
    >
      <div
        class="disclosure-icon"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-layers-3" />
      </div>
      <div>
        <h2 id="other-disclosures-title">
          Outros valores públicos, em seções separadas
        </h2>
        <p>Subsídio, assistência à saúde, diárias, passagens fora da cota e benefícios dependem de conjuntos diferentes. Esta prévia não os soma nem os apresenta como zero.</p>
        <NuxtLink to="/fontes">Ver o que cada fonte publica <UIcon
          name="i-lucide-arrow-right"
          aria-hidden="true"
        /></NuxtLink>
      </div>
      <span class="source-status">Ainda sem integração</span>
    </section>
  </main>

  <main
    v-else
    class="not-found-page"
  >
    <p class="breadcrumbs">
      <NuxtLink to="/">Visão geral</NuxtLink><span aria-hidden="true">/</span> Parlamentar
    </p>
    <UIcon
      name="i-lucide-user-round-search"
      aria-hidden="true"
    />
    <h1>Perfil não encontrado</h1>
    <p>Este endereço não corresponde a um perfil disponível nesta prévia.</p>
    <UButton
      to="/"
      color="primary"
      icon="i-lucide-arrow-left"
    >
      Voltar à visão geral
    </UButton>
  </main>
</template>

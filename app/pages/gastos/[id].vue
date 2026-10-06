<script setup lang="ts">
import { categoryColors, formatMoney, formatCompactMoney, formatDate, formatPercentage, months } from '~/utils/financial'
import { officialMemberProfileUrl } from '~/utils/member'
import type { Expense } from '~/types/financial'

const { manifest, years, filters, member, pending, error, retry, expenses, periodLabel, totalCents } = useParliamentarianData()
const officialProfileUrl = computed(() => member.value ? officialMemberProfileUrl(member.value) : null)
const categories = computed(() => {
  const totals = new Map<string, number>()
  for (const expense of expenses.value) totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.cents)
  return [...totals].map(([name, cents], index) => ({ name, cents, color: categoryColors[index % categoryColors.length],
    share: totalCents.value ? Number((cents / totalCents.value * 100).toFixed(1)) : 0 })).sort((a, b) => b.cents - a.cents)
})
const monthlyAmounts = computed(() => {
  if (filters.period === 'historico') {
    return years.value.map((year) => {
      const yearExpenses = expenses.value.filter(expense => expense.year === year)
      return { month: String(year), cents: yearExpenses.reduce((sum, expense) => sum + expense.cents, 0), count: yearExpenses.length }
    })
  }
  const totals = new Map<string, { cents: number, count: number }>()
  for (const expense of expenses.value) {
    const key = `${expense.year}-${String(expense.month).padStart(2, '0')}`
    const item = totals.get(key) ?? { cents: 0, count: 0 }
    item.cents += expense.cents
    item.count++
    totals.set(key, item)
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([month, item]) => ({ month, ...item }))
})
const monthlyMaximum = computed(() => Math.max(...monthlyAmounts.value.map(row => Math.abs(row.cents)), 1))
const suppliers = computed(() => {
  const groups = new Map<string, { name: string, identifier: string | null, cents: number, monthly: Map<string, number> }>()
  for (const expense of expenses.value) {
    const digits = (expense.supplierId ?? '').replace(/\D/g, '')
    const key = [11, 14].includes(digits.length) && Number(digits) > 7 ? digits : `record:${expense.id}`
    const item = groups.get(key) ?? { name: expense.supplier || 'Fornecedor não informado', identifier: expense.supplierId, cents: 0, monthly: new Map<string, number>() }
    const month = `${expense.year}-${String(expense.month).padStart(2, '0')}`
    item.cents += expense.cents
    item.monthly.set(month, (item.monthly.get(month) ?? 0) + expense.cents)
    groups.set(key, item)
  }
  return [...groups].map(([key, item]) => {
    const peak = [...item.monthly].sort((a, b) => b[1] - a[1])[0]
    return { key, ...item, share: totalCents.value ? Number((item.cents / totalCents.value * 100).toFixed(1)) : 0,
      averageMonthlyCents: Math.round(item.cents / Math.max(item.monthly.size, 1)), peakMonthlyCents: peak?.[1] ?? 0, peakMonth: peak?.[0] ?? '' }
  }).sort((a, b) => b.cents - a.cents)
})
const otherResources = computed(() => filters.period === 'historico'
  ? member.value?.otherResources ?? []
  : filters.period === 'ano' ? member.value?.otherResources?.filter(resource => resource.year === filters.year) ?? [] : [])
const unavailableResourceYears = computed(() => member.value?.otherResourcesCoverage
  ?.filter(row => row.status === 'unavailable' && (filters.period === 'historico' || row.year === filters.year))
  .map(row => row.year) ?? [])
const categoryFilter = ref('')
const supplierFilter = ref('')
const page = ref(1)
const pageSize = 30
function expenseDateKey(expense: Expense) {
  return expense.issuedAt ?? `${expense.year}-${String(expense.month).padStart(2, '0')}-01`
}
const filteredExpenses = computed(() => expenses.value.filter(row => (!categoryFilter.value || row.category === categoryFilter.value)
  && (!supplierFilter.value || `${row.supplier} ${row.supplierId ?? ''}`.toLocaleLowerCase('pt-BR').includes(supplierFilter.value.toLocaleLowerCase('pt-BR'))))
  .sort((a, b) => expenseDateKey(b).localeCompare(expenseDateKey(a)) || b.id.localeCompare(a.id)))
const visibleExpenses = computed(() => filteredExpenses.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch([expenses, categoryFilter, supplierFilter], () => {
  page.value = 1
})
function monthLabel(value: string) {
  if (/^\d{4}$/.test(value)) return value
  return `${months[Number(value.slice(5)) - 1]} ${value.slice(0, 4)}`
}
useSeoMeta({ title: () => member.value ? `${member.value.name} | Parlamentares` : 'Parlamentar | Parlamentares',
  description: () => member.value ? `Despesas oficiais da cota parlamentar de ${member.value.name}.` : 'Consulta individual de despesas parlamentares.' })
</script>

<template>
  <div
    v-if="member"
    class="profile-page"
  >
    <p class="breadcrumbs">
      <NuxtLink to="/">Visão geral</NuxtLink><span aria-hidden="true">/</span> Perfil parlamentar
    </p>

    <DataStatus
      :pending="pending"
      :failed="Boolean(error)"
      :manifest="manifest"
      @retry="retry"
    />

    <header class="profile-header">
      <MemberAvatar
        class="profile-avatar"
        :name="member.name"
        :photo-url="member.photoUrl"
      />
      <div class="profile-identity">
        <p class="profile-kicker">
          {{ member.chamber === 'deputados' ? 'Câmara dos Deputados' : 'Senado Federal' }} · {{ member.state }}
        </p>
        <h1>{{ member.name }}</h1>
        <p>{{ member.current ? 'Filiação atual:' : 'Filiação no cadastro:' }} {{ member.party }} <span aria-hidden="true">·</span> {{ member.state }}</p>
        <p class="profile-links">
          <a
            v-if="officialProfileUrl"
            :href="officialProfileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >Perfil oficial {{ member.chamber === 'deputados' ? 'na Câmara' : 'no Senado' }}</a>
          <a
            v-if="member.sourceUrl !== officialProfileUrl"
            :href="member.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
          >Fonte de cadastro</a>
        </p>
      </div>
      <div class="profile-period">
        <label
          v-if="filters.period !== 'historico'"
          class="filter-field"
        >
          <span>Ano</span>
          <select
            v-model="filters.year"
            :disabled="filters.period === 'mandato'"
          >
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
          <span>Anos incluídos</span>
          <span class="filter-static">{{ years[0] }}–{{ years.at(-1) }}</span>
        </div>
        <label class="filter-field">
          <span>Período</span>
          <select
            v-model="filters.period"
            aria-label="Período das despesas"
          >
            <option value="ano">Ano inteiro</option>
            <option value="historico">Histórico disponível</option>
            <option
              value="mandato"
              :disabled="!member.mandate"
            >Mandato individual</option>
            <option value="q1">1º trimestre</option>
            <option value="q2">2º trimestre</option>
            <option value="q3">3º trimestre</option>
            <option value="q4">4º trimestre</option>
          </select>
        </label>
      </div>
    </header>

    <p
      v-if="filters.period === 'mandato'"
      class="mandate-warning"
    >
      Mandato individual: {{ formatDate(member.mandate?.start) }} a {{ formatDate(member.mandate?.end) }}. Cobertura coletada: {{ years[0] }} a {{ years.at(-1) }}. Meses de fronteira incompletos são excluídos; o mandato em andamento ou iniciado antes da coleta tem cobertura parcial.
    </p>

    <template v-if="!pending && !error">
      <section
        class="profile-total"
        aria-label="Resumo da cota parlamentar"
      >
        <div>
          <span>Despesas publicadas da cota</span>
          <strong>{{ totalCents === null ? 'Sem registros no recorte' : formatMoney(totalCents) }}</strong>
          <small>{{ periodLabel }} · {{ expenses.length.toLocaleString('pt-BR') }} registros</small>
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
              <p>Categorias originais publicadas pela Casa</p>
            </div>
            <span>{{ periodLabel }}</span>
          </header>
          <ul class="profile-category-list">
            <li
              v-for="category in categories"
              :key="category.name"
            >
              <div class="category-label">
                <span>{{ category.name }}</span><strong>{{ formatPercentage(category.share) }}</strong>
              </div>
              <div
                class="category-track"
                aria-hidden="true"
              >
                <span
                  class="category-fill"
                  :style="{ width: `${Math.max(0, Math.min(100, category.share))}%`, backgroundColor: category.color }"
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
              <p>{{ filters.period === 'historico' ? 'Despesas agrupadas por ano' : 'Meses com registros publicados no período' }}</p>
            </div>
          </header>
          <ol
            class="profile-monthly-chart"
            :class="{ 'quarter-chart': filters.period.startsWith('q') }"
            tabindex="0"
            :aria-label="filters.period === 'historico' ? 'Gráfico de despesas agrupadas por ano; deslize horizontalmente para ver todos os anos' : 'Gráfico de despesas por mês; deslize horizontalmente para ver todos os meses'"
          >
            <li
              v-for="item in monthlyAmounts"
              :key="item.month"
              :aria-label="`${monthLabel(item.month)}: ${item.count ? formatMoney(item.cents) : 'Sem registros publicados'}`"
            >
              <span
                v-if="item.count"
                class="profile-month-value"
                aria-hidden="true"
                :title="formatMoney(item.cents)"
              >{{ formatCompactMoney(item.cents) }}</span>
              <span
                v-if="item.count"
                class="profile-month-bar"
                aria-hidden="true"
              ><i :style="{ height: `${Math.max(Math.abs(item.cents) / monthlyMaximum * 100, 2)}%` }" /></span>
              <span
                v-else
                class="profile-no-records"
                aria-hidden="true"
              >—</span>
              <span>{{ monthLabel(item.month) }}</span>
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
            <p>15 maiores valores por fornecedor. Total por CPF/CNPJ publicado; identificadores ausentes ficam separados por registro.</p>
          </div>
          <span>Identificação da fonte</span>
        </header>
        <div class="supplier-table-wrap">
          <table class="supplier-table supplier-summary-table">
            <caption class="sr-only">
              Quinze maiores fornecedores no período selecionado, com identificação e valores publicados.
            </caption>
            <colgroup>
              <col>
              <col>
              <col>
              <col>
              <col>
              <col>
            </colgroup>
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
                  Média nos meses com registros
                </th><th scope="col">
                  Maior mês
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="supplier in suppliers.slice(0, 15)"
                :key="supplier.key"
              >
                <td><strong>{{ supplier.name }}</strong></td>
                <td><span>{{ supplier.identifier ?? 'Não informado pela fonte' }}</span></td>
                <td>{{ formatPercentage(supplier.share) }}</td>
                <td class="supplier-money">
                  {{ formatMoney(supplier.cents) }}
                </td><td class="supplier-money">
                  {{ formatMoney(supplier.averageMonthlyCents) }}
                </td><td class="supplier-money supplier-peak">
                  {{ formatMoney(supplier.peakMonthlyCents) }}<small>{{ monthLabel(supplier.peakMonth) }}</small>
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
        class="suppliers-panel"
        aria-labelledby="expenses-title"
      >
        <header class="profile-panel-heading">
          <div>
            <h2 id="expenses-title">
              Todas as despesas da cota
            </h2><p>Mais recentes primeiro pela data de emissão; sem data, usamos a competência. {{ member.chamber === 'deputados' ? 'Cada linha abre a consulta correspondente no portal da Câmara.' : 'Os links apontam para a fonte oficial do Senado.' }} Comprovantes são abertos à parte quando publicados.</p>
          </div>
        </header>
        <div class="expense-controls">
          <label class="filter-field"><span>Categoria</span><select v-model="categoryFilter"><option value="">Todas</option><option
            v-for="category in categories"
            :key="category.name"
            :value="category.name"
          >{{ category.name }}</option></select></label><label class="filter-field"><span>Fornecedor ou CPF/CNPJ</span><input
            v-model="supplierFilter"
            type="search"
            placeholder="Buscar fornecedor"
          ></label>
        </div>
        <div
          class="supplier-table-wrap"
          role="region"
          tabindex="0"
          aria-label="Tabela de despesas da cota; role horizontalmente para ver todas as colunas"
        >
          <table class="supplier-table expense-register-table">
            <caption class="sr-only">
              Despesas da cota parlamentar, ordenadas por data, com competência, fornecedor, categoria, valor e links oficiais.
            </caption>
            <colgroup>
              <col>
              <col>
              <col>
              <col>
              <col>
            </colgroup>
            <thead>
              <tr>
                <th scope="col">
                  Competência
                </th><th scope="col">
                  Fornecedor / CPF ou CNPJ
                </th><th scope="col">
                  Categoria
                </th><th scope="col">
                  Valor
                </th><th scope="col">
                  Fonte oficial
                </th>
              </tr>
            </thead><tbody>
              <tr
                v-for="expense in visibleExpenses"
                :key="expense.id"
              >
                <td class="expense-period">
                  {{ String(expense.month).padStart(2, '0') }}/{{ expense.year }}
                </td>
                <td class="expense-supplier">
                  <strong>{{ expense.supplier || 'Não informado' }}</strong>
                  <small>{{ expense.supplierId || 'Identificador não informado' }}</small>
                </td>
                <td class="expense-category">
                  {{ expense.category }}
                  <small>Partido na data: {{ expense.party }}</small>
                </td>
                <td class="expense-amount">
                  {{ formatMoney(expense.cents) }}
                </td>
                <td class="expense-document">
                  <a
                    v-if="expense.portalUrl"
                    class="source-document-link"
                    :href="expense.portalUrl"
                    target="_blank"
                    rel="noreferrer"
                    :aria-label="expense.documentNumber ? `Consultar documento ${expense.documentNumber} no portal da Câmara` : 'Consultar despesas desta competência no portal da Câmara'"
                  >Ver na Câmara</a>
                  <a
                    v-if="expense.documentUrl"
                    class="source-document-link"
                    :href="expense.documentUrl"
                    target="_blank"
                    rel="noreferrer"
                  >Comprovante oficial</a>
                  <a
                    v-if="!expense.portalUrl && !expense.documentUrl"
                    class="source-document-link"
                    :href="expense.sourceUrl"
                    target="_blank"
                    rel="noreferrer"
                  >{{ member.chamber === 'senadores' ? 'Fonte oficial do Senado' : 'Arquivo oficial da Câmara' }}</a>
                  <small>{{ expense.documentNumber ? `Documento ${expense.documentNumber}` : 'Número do documento ausente' }}</small>
                  <small>{{ expense.issuedAt ? formatDate(expense.issuedAt) : 'Data de emissão ausente' }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-if="!filteredExpenses.length"
          class="empty-state"
        >
          Nenhuma despesa publicada para esta combinação.
        </p>
        <div class="expense-pagination">
          <UButton
            :disabled="page === 1"
            color="neutral"
            variant="outline"
            @click="page--"
          >
            Anterior
          </UButton><span>{{ filteredExpenses.length }} registros · página {{ page }} de {{ Math.max(1, Math.ceil(filteredExpenses.length / pageSize)) }}</span><UButton
            :disabled="page * pageSize >= filteredExpenses.length"
            color="neutral"
            variant="outline"
            @click="page++"
          >
            Próxima
          </UButton>
        </div>
      </section>
      <section
        v-if="otherResources.length"
        class="suppliers-panel"
        aria-labelledby="other-resources-title"
      >
        <header class="profile-panel-heading">
          <div>
            <h2 id="other-resources-title">
              Recursos fora da cota
            </h2><p>{{ filters.period === 'historico' ? `Totais anuais individualizados pelo Senado entre ${years[0]} e ${years.at(-1)}. Não entram no ranking de cotas.` : `Totais anuais individualizados pelo Senado em ${filters.year}. Não entram no ranking de cotas.` }}</p>
          </div>
        </header><dl class="other-resource-list">
          <div
            v-for="resource in otherResources"
            :key="`${resource.year}:${resource.type}`"
          >
            <dt>
              <a
                :href="resource.sourceUrl"
                target="_blank"
                rel="noreferrer"
              >{{ resource.type }}</a>
              <small>{{ resource.year }}</small>
            </dt><dd>{{ formatMoney(resource.cents) }}</dd>
          </div>
        </dl>
        <p
          v-if="unavailableResourceYears.length"
          class="chart-caption"
        >
          A fonte não disponibilizou recursos individualizados para {{ unavailableResourceYears.join(', ') }}. Esses anos não entram no total acima.
        </p>
      </section>
      <p
        v-else-if="member.chamber === 'senadores'"
        class="chart-caption"
      >
        {{ filters.period === 'historico' ? 'A fonte não publicou recursos individualizados para este cadastro no intervalo selecionado.' : 'Recursos fora da cota possuem granularidade anual. Selecione “Ano inteiro” para consultá-los; não é possível rateá-los por trimestre ou mandato.' }}
      </p>
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
          <p>Remuneração ainda sem integração por identificador validado. Dados de saúde sem individualização não são atribuídos a pessoas. Outros recursos publicados abaixo permanecem separados da cota.</p>
          <NuxtLink to="/fontes">Ver o que cada fonte publica <UIcon
            name="i-lucide-arrow-right"
            aria-hidden="true"
          /></NuxtLink>
        </div>
        <span class="source-status">{{ member.chamber === 'senadores' && member.otherResourcesCoverage?.some(item => item.year === filters.year && item.status === 'collected') ? 'Recursos anuais integrados' : member.chamber === 'deputados' ? 'Outros recursos não integrados' : 'Recursos anuais indisponíveis' }}</span>
      </section>
    </template>
  </div>

  <div
    v-else
    class="not-found-page"
  >
    <DataStatus
      :pending="pending"
      :failed="Boolean(error)"
      :manifest="manifest"
      @retry="retry"
    />
    <p class="breadcrumbs">
      <NuxtLink to="/">Visão geral</NuxtLink><span aria-hidden="true">/</span> Parlamentar
    </p>
    <UIcon
      name="i-lucide-user-round-search"
      aria-hidden="true"
    />
    <h1>{{ pending ? 'Carregando perfil' : error ? 'Perfil indisponível' : 'Perfil não encontrado' }}</h1>
    <p v-if="!pending && !error">
      Este endereço não corresponde a um perfil disponível nos arquivos publicados.
    </p>
    <UButton
      to="/"
      color="primary"
      icon="i-lucide-arrow-left"
    >
      Voltar à visão geral
    </UButton>
  </div>
</template>

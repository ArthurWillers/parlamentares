import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'
import type { Chamber, ExpensePeriod } from '~/types/financial'
import { normalizeMonthRange } from '~/utils/period'

export interface ExpenseFilters {
  chamber: Chamber
  period: ExpensePeriod
  year: number
  startMonth: string
  endMonth: string
  state: string
  party: string
  search: string
  status: 'em-exercicio' | 'todos'
}

function readQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] ?? undefined : value ?? undefined
}

export function useExpenseFilters(defaultYear: MaybeRef<number> = new Date().getFullYear(), years: MaybeRef<number[]> = [toValue(defaultYear)] as const, allowMandate = false) {
  const route = useRoute()
  const router = useRouter()

  const filters = reactive<ExpenseFilters>({
    chamber: 'deputados',
    period: 'ano',
    year: toValue(defaultYear),
    ...normalizeMonthRange(undefined, undefined, toValue(years), toValue(defaultYear)),
    state: '',
    party: '',
    search: '',
    status: 'em-exercicio'
  })

  let pendingQueryWrites = 0
  watch(
    () => [route.query.casa, route.query.ano, route.query.periodo, route.query.uf, route.query.partido, route.query.busca, route.query.situacao, route.query.inicio, route.query.fim] as const,
    ([chamberValue, yearValue, periodValue, stateValue, partyValue, searchValue, statusValue, startValue, endValue]) => {
      if (pendingQueryWrites) return
      const requestedYear = Number(readQueryValue(yearValue))
      const availableYears = toValue(years)
      const validYear = availableYears.length ? availableYears.includes(requestedYear) : Number.isInteger(requestedYear) && requestedYear >= 2008 && requestedYear <= new Date().getFullYear()
      const chamber = readQueryValue(chamberValue)
      const period = readQueryValue(periodValue)

      Object.assign(filters, {
        chamber: chamber === 'senadores' ? 'senadores' : 'deputados',
        year: validYear ? requestedYear : toValue(defaultYear),
        period: period === 'personalizado' ? 'personalizado' : period === 'historico' ? 'historico' : (allowMandate && period === 'mandato') ? 'mandato' : period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4' ? period : 'ano',
        ...normalizeMonthRange(readQueryValue(startValue), readQueryValue(endValue), availableYears, validYear ? requestedYear : toValue(defaultYear)),
        state: readQueryValue(stateValue) ?? '',
        party: readQueryValue(partyValue) ?? '',
        search: readQueryValue(searchValue) ?? '',
        status: readQueryValue(statusValue) === 'todos' ? 'todos' : 'em-exercicio'
      })
    },
    { immediate: true }
  )

  watch(() => [toValue(years), toValue(defaultYear)] as const, ([availableYears, latestYear]) => {
    if (availableYears.length && !availableYears.includes(filters.year)) filters.year = latestYear
    Object.assign(filters, normalizeMonthRange(filters.startMonth, filters.endMonth, availableYears, latestYear))
  })

  watch(() => [filters.startMonth, filters.endMonth] as const, ([start, end]) => {
    Object.assign(filters, normalizeMonthRange(start, end, toValue(years), filters.year))
  })

  watch(() => filters.year, (year) => {
    if (filters.period !== 'personalizado') {
      Object.assign(filters, normalizeMonthRange(`${year}-01`, `${year}-12`, toValue(years), year))
    }
  })

  watch(filters, async (value) => {
    const query: LocationQueryRaw = { ...route.query }
    const entries: Array<[keyof ExpenseFilters, keyof LocationQueryRaw]> = [
      ['chamber', 'casa'],
      ['period', 'periodo'],
      ['year', 'ano'],
      ['startMonth', 'inicio'],
      ['endMonth', 'fim'],
      ['state', 'uf'],
      ['party', 'partido'],
      ['search', 'busca'],
      ['status', 'situacao']
    ]

    for (const [filterKey, queryKey] of entries) {
      const filterValue = value[filterKey]
      const defaultValue = filterKey === 'chamber' ? 'deputados' : filterKey === 'period' ? 'ano' : filterKey === 'year' ? toValue(defaultYear) : filterKey === 'status' ? 'em-exercicio' : ''

      const rangeField = filterKey === 'startMonth' || filterKey === 'endMonth'
      if (filterValue === defaultValue || (rangeField && value.period !== 'personalizado') || (filterKey === 'year' && value.period === 'personalizado')) {
        query[queryKey] = undefined
      } else {
        query[queryKey] = String(filterValue)
      }
    }

    if (JSON.stringify(query) !== JSON.stringify(route.query)) {
      pendingQueryWrites++
      try {
        await router.replace({ query })
      } finally {
        pendingQueryWrites--
      }
    }
  }, { deep: true, flush: 'post' })

  function resetFilters() {
    Object.assign(filters, {
      chamber: 'deputados',
      period: 'ano',
      year: toValue(defaultYear),
      ...normalizeMonthRange(undefined, undefined, toValue(years), toValue(defaultYear)),
      state: '',
      party: '',
      search: '',
      status: 'em-exercicio'
    })
  }

  return { filters, resetFilters }
}

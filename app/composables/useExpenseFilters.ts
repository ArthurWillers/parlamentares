import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'
import type { Chamber, ExpensePeriod } from '~/types/financial'

export interface ExpenseFilters {
  chamber: Chamber
  period: ExpensePeriod
  year: number
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
    state: '',
    party: '',
    search: '',
    status: 'em-exercicio'
  })

  let pendingQueryWrites = 0
  watch(
    () => [route.query.casa, route.query.ano, route.query.periodo, route.query.uf, route.query.partido, route.query.busca, route.query.situacao] as const,
    ([chamberValue, yearValue, periodValue, stateValue, partyValue, searchValue, statusValue]) => {
      if (pendingQueryWrites) return
      const requestedYear = Number(readQueryValue(yearValue))
      const availableYears = toValue(years)
      const validYear = availableYears.length ? availableYears.includes(requestedYear) : Number.isInteger(requestedYear) && requestedYear >= 2018 && requestedYear <= new Date().getFullYear()
      const chamber = readQueryValue(chamberValue)
      const period = readQueryValue(periodValue)

      Object.assign(filters, {
        chamber: chamber === 'senadores' ? 'senadores' : 'deputados',
        year: validYear ? requestedYear : toValue(defaultYear),
        period: period === 'historico' ? 'historico' : (allowMandate && period === 'mandato') ? 'mandato' : period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4' ? period : 'ano',
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
  })

  watch(filters, async (value) => {
    const query: LocationQueryRaw = { ...route.query }
    const entries: Array<[keyof ExpenseFilters, keyof LocationQueryRaw]> = [
      ['chamber', 'casa'],
      ['period', 'periodo'],
      ['year', 'ano'],
      ['state', 'uf'],
      ['party', 'partido'],
      ['search', 'busca'],
      ['status', 'situacao']
    ]

    for (const [filterKey, queryKey] of entries) {
      const filterValue = value[filterKey]
      const defaultValue = filterKey === 'chamber' ? 'deputados' : filterKey === 'period' ? 'ano' : filterKey === 'year' ? toValue(defaultYear) : filterKey === 'status' ? 'em-exercicio' : ''

      if (filterValue === defaultValue) {
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
      state: '',
      party: '',
      search: '',
      status: 'em-exercicio'
    })
  }

  return { filters, resetFilters }
}

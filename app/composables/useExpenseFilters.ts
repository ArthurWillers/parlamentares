import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'
import type { Chamber, ExpensePeriod } from '~/data/preview-expenses'

export interface ExpenseFilters {
  chamber: Chamber
  period: ExpensePeriod
  state: string
  party: string
  search: string
}

function readQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] ?? undefined : value ?? undefined
}

export function useExpenseFilters() {
  const route = useRoute()
  const router = useRouter()

  const filters = reactive<ExpenseFilters>({
    chamber: 'deputados',
    period: 'ano',
    state: '',
    party: '',
    search: ''
  })

  watch(
    () => [route.query.casa, route.query.periodo, route.query.uf, route.query.partido, route.query.busca],
    ([chamberValue, periodValue, stateValue, partyValue, searchValue]) => {
      const chamber = readQueryValue(chamberValue)
      const period = readQueryValue(periodValue)

      Object.assign(filters, {
        chamber: chamber === 'senadores' ? 'senadores' : 'deputados',
        period: period === 'mandato' || period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4' ? period : 'ano',
        state: readQueryValue(stateValue) ?? '',
        party: readQueryValue(partyValue) ?? '',
        search: readQueryValue(searchValue) ?? ''
      })
    },
    { immediate: true }
  )

  watch(filters, (value) => {
    const query: LocationQueryRaw = { ...route.query }
    const entries: Array<[keyof ExpenseFilters, keyof LocationQueryRaw]> = [
      ['chamber', 'casa'],
      ['period', 'periodo'],
      ['state', 'uf'],
      ['party', 'partido'],
      ['search', 'busca']
    ]

    for (const [filterKey, queryKey] of entries) {
      const filterValue = value[filterKey]
      const defaultValue = filterKey === 'chamber' ? 'deputados' : filterKey === 'period' ? 'ano' : ''

      if (filterValue === defaultValue) {
        query[queryKey] = undefined
      } else {
        query[queryKey] = filterValue
      }
    }

    if (JSON.stringify(query) !== JSON.stringify(route.query)) {
      void router.replace({ query })
    }
  }, { deep: true, flush: 'post' })

  function resetFilters() {
    Object.assign(filters, {
      chamber: 'deputados',
      period: 'ano',
      state: '',
      party: '',
      search: ''
    })
  }

  return { filters, resetFilters }
}

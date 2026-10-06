import type { Expense, Manifest, Parliamentarian } from '~/types/financial'
import { selectedYears, matchesPeriod, periodLabel as describePeriod } from '~/utils/period'
import { fetchPublicJson } from '~/utils/fetchPublicJson'
import { publicDataUrl } from '~/utils/publicDataUrl'

export function useParliamentarianData() {
  const route = useRoute()
  const baseURL = useRuntimeConfig().app.baseURL
  const memberId = computed(() => String(route.params.id).replace(/^(camara|senado)-/, '$1:'))
  const manifestRequest = useFetch<Manifest>(publicDataUrl('index.json', baseURL), { server: false })
  const manifest = manifestRequest.data
  const years = computed(() => manifest.value?.years ?? [])
  const defaultYear = computed(() => years.value.at(-1) ?? new Date().getFullYear())
  const { filters } = useExpenseFilters(defaultYear, years, true)
  const memberRequest = useAsyncData<Parliamentarian>(
    () => `member:${memberId.value}`,
    () => fetchPublicJson<Parliamentarian>(`members/${memberId.value}.json`, baseURL),
    { server: false, watch: [memberId] }
  )
  const member = memberRequest.data
  const requestedYears = computed(() => selectedYears(filters, years.value))
  const expenseRequest = useAsyncData<Expense[]>(
    () => `expenses:${String(route.params.id)}:${requestedYears.value.join(',')}`,
    async () => {
      if (!member.value) return []
      const files = await Promise.all(requestedYears.value.map(year => fetchPublicJson<Expense[]>(`expenses/${member.value?.id}/${year}.json`, baseURL)))
      return files.flat()
    },
    { server: false, watch: [member] }
  )
  const error = computed(() => manifestRequest.error.value || memberRequest.error.value || expenseRequest.error.value)
  const pending = computed(() => [manifestRequest.status.value, memberRequest.status.value, expenseRequest.status.value].some(status => status === 'idle' || status === 'pending'))
  const expenses = computed(() => (expenseRequest.data.value ?? []).filter(row => matchesPeriod(row, filters)))
  const periodLabel = computed(() => filters.period === 'mandato'
    ? `Mandato individual${member.value?.mandate?.partial ? ' · cobertura parcial' : ''}`
    : describePeriod(filters, years.value))
  const totalCents = computed(() => expenses.value.length ? expenses.value.reduce((sum, row) => sum + row.cents, 0) : null)
  async function retry() {
    await manifestRequest.refresh()
    await memberRequest.refresh()
    await expenseRequest.refresh()
  }
  return { manifest, years, filters, member, pending, error, retry, expenses, periodLabel, totalCents, requestedYears }
}

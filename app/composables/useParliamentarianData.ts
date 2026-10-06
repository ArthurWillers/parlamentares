import type { Expense, Manifest, Parliamentarian } from '~/types/financial'
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
  const expenseRequest = useAsyncData<Expense[]>(
    () => `expenses:${String(route.params.id)}:${filters.period}:${filters.year}`,
    async () => {
      if (!member.value) return []
      const requestedYears = filters.period === 'historico' || filters.period === 'mandato' ? years.value : [filters.year]
      const files = await Promise.all(requestedYears.map(year => fetchPublicJson<Expense[]>(`expenses/${member.value?.id}/${year}.json`, baseURL)))
      return files.flat()
    },
    { server: false, watch: [member, years] }
  )
  const error = computed(() => manifestRequest.error.value || memberRequest.error.value || expenseRequest.error.value)
  const pending = computed(() => [manifestRequest.status.value, memberRequest.status.value, expenseRequest.status.value].some(status => status === 'idle' || status === 'pending'))
  const expenses = computed(() => (expenseRequest.data.value ?? []).filter((row) => {
    if (filters.period === 'mandato') return row.inMandate
    if (filters.period.startsWith('q')) return Math.ceil(row.month / 3) === Number(filters.period.slice(1))
    return true
  }))
  const periodLabel = computed(() => filters.period === 'historico'
    ? `Histórico publicado · ${years.value[0] ?? '—'}–${years.value.at(-1) ?? '—'}`
    : filters.period === 'mandato'
      ? `Mandato individual${member.value?.mandate?.partial ? ' · cobertura parcial' : ''}`
      : filters.period.startsWith('q') ? `${Number(filters.period.slice(1))}º trimestre de ${filters.year}` : `Ano de ${filters.year}`)
  const totalCents = computed(() => expenses.value.length ? expenses.value.reduce((sum, row) => sum + row.cents, 0) : null)
  async function retry() {
    await manifestRequest.refresh()
    await memberRequest.refresh()
    await expenseRequest.refresh()
  }
  return { manifest, years, filters, member, pending, error, retry, expenses, periodLabel, totalCents }
}

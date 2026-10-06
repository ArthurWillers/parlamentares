import type { Manifest, Parliamentarian, SummaryRow } from '~/types/financial'
import { normalizeSearch } from '~/utils/financial'
import { fetchPublicJson } from '~/utils/fetchPublicJson'
import { publicDataUrl } from '~/utils/publicDataUrl'

export function useFinancialData() {
  const baseURL = useRuntimeConfig().app.baseURL
  const manifestRequest = useFetch<Manifest>(publicDataUrl('index.json', baseURL), { server: false })
  const membersRequest = useFetch<Parliamentarian[]>(publicDataUrl('members.json', baseURL), { server: false })
  const manifest = manifestRequest.data
  const years = computed(() => manifest.value?.years ?? [])
  const defaultYear = computed(() => years.value.at(-1) ?? new Date().getFullYear())
  const { filters, resetFilters } = useExpenseFilters(defaultYear, years)
  const summaryKey = computed(() => `summary:${filters.period === 'historico' ? 'historico' : filters.year}`)
  const summaryRequest = useAsyncData<SummaryRow[]>(summaryKey, async () => {
    const requestedYears = filters.period === 'historico' ? years.value : [filters.year]
    const summaries = await Promise.all(requestedYears.map(year => fetchPublicJson<SummaryRow[]>(`summary-${year}.json`, baseURL)))
    return summaries.flat()
  }, { server: false, watch: [() => filters.period, () => filters.year, years] })
  const error = computed(() => manifestRequest.error.value || membersRequest.error.value || summaryRequest.error.value)
  const pending = computed(() => [manifestRequest.status.value, membersRequest.status.value, summaryRequest.status.value].some(status => status === 'idle' || status === 'pending'))
  const periodMonths = computed(() => {
    if (!filters.period.startsWith('q')) return Array.from({ length: 12 }, (_, index) => index)
    const quarter = Number(filters.period.slice(1)) - 1
    return [quarter * 3, quarter * 3 + 1, quarter * 3 + 2]
  })
  const periodLabel = computed(() => filters.period === 'historico'
    ? `Histórico publicado · ${years.value[0] ?? '—'}–${years.value.at(-1) ?? '—'}`
    : filters.period.startsWith('q') ? `${Number(filters.period.slice(1))}º trimestre de ${filters.year}` : `Ano de ${filters.year}`)
  const chamberMembers = computed(() => (membersRequest.data.value ?? []).filter(member => member.chamber === filters.chamber
    && (filters.status === 'todos' || member.current)))
  const baseRows = computed(() => (summaryRequest.data.value ?? []).filter(row => filters.period === 'historico' || periodMonths.value.includes(row.month - 1)))
  const partyOptions = computed(() => {
    const ids = new Set(chamberMembers.value.map(member => member.id))
    return [...new Set(baseRows.value.filter(row => ids.has(row.memberId)).map(row => row.party))].sort()
  })
  const eligibleMembers = computed(() => chamberMembers.value.filter((member) => {
    const query = normalizeSearch(filters.search)
    return (!filters.state || member.state === filters.state)
      && (!query || normalizeSearch(`${member.name} ${member.party} ${member.state}`).includes(query))
  }))
  const rows = computed(() => {
    const ids = new Set(eligibleMembers.value.map(member => member.id))
    return baseRows.value.filter(row => ids.has(row.memberId) && (!filters.party || row.party === filters.party))
  })
  const visibleMembers = computed(() => {
    const totals = new Map<string, number>()
    const counts = new Map<string, number>()
    for (const row of rows.value) {
      totals.set(row.memberId, (totals.get(row.memberId) ?? 0) + row.cents)
      counts.set(row.memberId, (counts.get(row.memberId) ?? 0) + row.count)
    }
    return eligibleMembers.value.filter(member => !filters.party || counts.has(member.id)).map(member => ({ ...member, cents: totals.get(member.id) ?? null, count: counts.get(member.id) ?? 0 }))
  })
  const coverage = computed(() => {
    const rows = manifest.value?.coverage.filter(item => item.chamber === filters.chamber
      && (filters.period === 'historico' ? years.value.includes(item.year) : item.year === filters.year)) ?? []
    if (!rows.length) return undefined
    if (filters.period !== 'historico') return rows[0]
    const latest = rows.at(-1)!
    return {
      ...latest,
      records: rows.reduce((sum, row) => sum + row.records, 0),
      cents: rows.reduce((sum, row) => sum + row.cents, 0),
      ongoing: rows.some(row => row.ongoing),
      unattributed: {
        records: rows.reduce((sum, row) => sum + row.unattributed.records, 0),
        cents: rows.reduce((sum, row) => sum + row.unattributed.cents, 0)
      }
    }
  })
  async function retry() {
    await Promise.all([manifestRequest.refresh(), membersRequest.refresh(), summaryRequest.refresh()])
  }
  return { manifest, years, filters, resetFilters, error, pending, retry, periodMonths, periodLabel,
    chamberMembers, partyOptions, rows, visibleMembers, coverage }
}

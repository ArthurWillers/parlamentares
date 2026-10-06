import type { Manifest, Parliamentarian, SummaryRow } from '~/types/financial'
import { selectedYears, matchesPeriod, periodLabel as describePeriod } from '~/utils/period'
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
  const requestedYears = computed(() => selectedYears(filters, years.value))
  const summaryKey = computed(() => `summary:${requestedYears.value.join(',')}`)
  const summaryRequest = useAsyncData<SummaryRow[]>(summaryKey, async () => {
    const summaries = await Promise.all(requestedYears.value.map(year => fetchPublicJson<SummaryRow[]>(`summary-${year}.json`, baseURL)))
    return summaries.flat()
  }, { server: false })
  const error = computed(() => manifestRequest.error.value || membersRequest.error.value || summaryRequest.error.value)
  const pending = computed(() => [manifestRequest.status.value, membersRequest.status.value, summaryRequest.status.value].some(status => status === 'idle' || status === 'pending'))
  const periodTimeline = computed(() => requestedYears.value.flatMap(year => Array.from({ length: 12 }, (_, index) => ({ year, month: index + 1 }))
    .filter(row => matchesPeriod({ ...row, inMandate: false }, filters))))
  const periodLabel = computed(() => describePeriod(filters, years.value))
  const chamberMembers = computed(() => (membersRequest.data.value ?? []).filter(member => member.chamber === filters.chamber
    && (filters.status === 'todos' || member.current)))
  const baseRows = computed(() => (summaryRequest.data.value ?? []).filter(row => matchesPeriod(row, filters)))
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
      && requestedYears.value.includes(item.year)) ?? []
    if (!rows.length) return undefined
    if (rows.length === 1) return rows[0]
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
  return { manifest, years, filters, resetFilters, error, pending, retry, periodTimeline, periodLabel, requestedYears,
    chamberMembers, partyOptions, rows, visibleMembers, coverage }
}

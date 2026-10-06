export type Chamber = 'deputados' | 'senadores'
export type ExpensePeriod = 'ano' | 'historico' | 'mandato' | 'q1' | 'q2' | 'q3' | 'q4'

export interface Mandate {
  start: string
  end: string
  partial: boolean
}
export interface Parliamentarian {
  id: string
  name: string
  chamber: Chamber
  party: string
  state: string
  photoUrl: string | null
  sourceUrl: string
  current: boolean
  mandate: Mandate | null
  otherResourcesCoverage?: Array<{ year: number, status: 'collected' | 'unavailable', sourceUrl: string, reason?: string }>
  otherResources?: Array<{ year: number, type: string, cents: number, sourceUrl: string, granularity: 'annual' }>
}
export interface SummaryRow {
  memberId: string
  year: number
  month: number
  party: string
  category: string
  inMandate: boolean
  cents: number
  count: number
}
export interface Expense extends Omit<SummaryRow, 'count'> {
  id: string
  supplier: string
  supplierId: string | null
  issuedAt: string | null
  documentId: string | null
  documentNumber: string | null
  documentUrl: string | null
  portalUrl: string | null
  sourceUrl: string
  sourceRecord: string
  description?: string | null
}
export interface Manifest {
  schemaVersion: string
  generatedAt: string
  years: number[]
  collectionMode: 'live' | 'cached'
  coverage: Array<{
    chamber: Chamber
    year: number
    status: 'collected'
    ongoing: boolean
    sourceUrl: string
    records: number
    cents: number
    latestMonth: number
    unattributed: { records: number, cents: number }
  }>
  remuneration: { status: string, reason: string }
}

import type { ExpensePeriod } from '../types/financial'

export interface PeriodSelection {
  period: ExpensePeriod
  year: number
  startMonth: string
  endMonth: string
}

export function normalizeMonthRange(start: string | undefined, end: string | undefined, years: number[], defaultYear: number) {
  const minimum = `${years[0] ?? 2008}-01`
  const maximum = `${years.at(-1) ?? new Date().getFullYear()}-12`
  function bounded(value: string | undefined, fallback: string) {
    const month = value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : fallback
    return month < minimum ? minimum : month > maximum ? maximum : month
  }
  const first = bounded(start, `${defaultYear}-01`)
  const last = bounded(end, `${defaultYear}-12`)
  return first <= last ? { startMonth: first, endMonth: last } : { startMonth: last, endMonth: first }
}

export function selectedYears(selection: PeriodSelection, years: number[]) {
  if (selection.period === 'historico' || selection.period === 'mandato') return years
  if (selection.period === 'personalizado') return years.filter(year => year >= Number(selection.startMonth.slice(0, 4)) && year <= Number(selection.endMonth.slice(0, 4)))
  return years.filter(year => year === selection.year)
}

export function matchesPeriod(row: { year: number, month: number, inMandate: boolean }, selection: PeriodSelection) {
  if (selection.period === 'historico') return true
  if (selection.period === 'mandato') return row.inMandate
  if (selection.period === 'personalizado') {
    const month = `${row.year}-${String(row.month).padStart(2, '0')}`
    return month >= selection.startMonth && month <= selection.endMonth
  }
  return row.year === selection.year && (!selection.period.startsWith('q') || Math.ceil(row.month / 3) === Number(selection.period.slice(1)))
}

export function periodLabel(selection: PeriodSelection, years: number[]) {
  if (selection.period === 'historico') return `Histórico publicado · ${years[0] ?? '—'}–${years.at(-1) ?? '—'}`
  if (selection.period === 'personalizado') {
    const format = (month: string) => `${month.slice(5)}/${month.slice(0, 4)}`
    return `${format(selection.startMonth)} a ${format(selection.endMonth)}`
  }
  return selection.period.startsWith('q') ? `${Number(selection.period.slice(1))}º trimestre de ${selection.year}` : `Ano de ${selection.year}`
}

export function periodQuery(selection: PeriodSelection) {
  return selection.period === 'personalizado'
    ? { periodo: selection.period, inicio: selection.startMonth, fim: selection.endMonth }
    : { periodo: selection.period, ano: String(selection.year) }
}

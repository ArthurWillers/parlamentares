import type { Parliamentarian } from '~/types/financial'

export function officialMemberProfileUrl(member: Pick<Parliamentarian, 'id' | 'chamber' | 'sourceUrl'>): string | null {
  if (member.chamber === 'deputados') {
    const match = /^camara:(\d+)$/.exec(member.id)
    return match ? `https://www.camara.leg.br/deputados/${match[1]}` : null
  }

  try {
    const url = new URL(member.sourceUrl)
    const isSenateDomain = url.protocol === 'https:' && url.hostname.endsWith('.senado.leg.br')
    const isSenatorProfile = /^\/web\/senadores\/senador\/-\/perfil\/\d+\/?$/.test(url.pathname)
    return isSenateDomain && isSenatorProfile ? url.href : null
  } catch {
    return null
  }
}

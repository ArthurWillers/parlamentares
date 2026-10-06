import { publicDataUrl } from '~/utils/publicDataUrl'

export async function fetchPublicJson<T>(path: string, baseURL: string): Promise<T> {
  const response = await fetch(publicDataUrl(import.meta.dev ? path : `${path}.gz`, baseURL))
  if (!response.ok || !response.body) {
    throw new Error(`Não foi possível carregar ${path} (${response.status}).`)
  }

  // O pipeline local mantém JSON; a compactação acontece somente após generate.
  if (import.meta.dev) return await response.json() as T
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador não oferece suporte à leitura dos dados compactados.')
  }

  const decompressed = response.body.pipeThrough(new DecompressionStream('gzip'))
  return await new Response(decompressed).json() as T
}

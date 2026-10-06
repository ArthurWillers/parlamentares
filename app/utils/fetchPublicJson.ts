import { publicDataUrl } from '~/utils/publicDataUrl'

export async function fetchPublicJson<T>(path: string, baseURL: string): Promise<T> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador não oferece suporte à leitura dos dados compactados.')
  }

  const response = await fetch(publicDataUrl(`${path}.gz`, baseURL))
  if (!response.ok || !response.body) {
    throw new Error(`Não foi possível carregar ${path} (${response.status}).`)
  }

  const decompressed = response.body.pipeThrough(new DecompressionStream('gzip'))
  return await new Response(decompressed).json() as T
}

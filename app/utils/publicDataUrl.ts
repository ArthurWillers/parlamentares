export function publicDataUrl(path: string, baseURL: string) {
  return `${baseURL.replace(/\/+$/, '')}/data/${path.replace(/^\/+/, '')}`
}

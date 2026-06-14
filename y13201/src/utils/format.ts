export function formatDateTime(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    if (isNaN(d.getTime())) return iso
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
    if (isNaN(d.getTime())) return iso
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  } catch {
    return iso
  }
}

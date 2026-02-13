export function normalizeSpanishPhoneForDisplay(raw: string | null | undefined): string {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''

  const normalized = trimmed.replace(/[\s-]/g, '')

  // If it's already an international format for Spain.
  if (normalized.startsWith('+34')) return normalized

  // If it starts with 34 (Spain country code) without +.
  if (normalized.startsWith('34')) return '+' + normalized

  // Default: assume Spain and add +34.
  if (/^[0-9]{9}$/.test(normalized)) return '+34' + normalized

  // Fallback: best-effort return cleaned string.
  return normalized
}

export function formatWatermarkTimestampUtc(now: Date): string {
  // YYYY-MM-DD HH:mm:ssZ (UTC)
  return now.toISOString().replace('T', ' ').slice(0, 19) + 'Z'
}

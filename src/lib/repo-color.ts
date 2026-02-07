type RepoColorClasses = {
  dot: string
  borderStrong: string
  borderSoft: string
  badge: string
  badgeText: string
  rowHover: string
}

const PALETTE: RepoColorClasses[] = [
  {
    dot: 'bg-blue-500',
    borderStrong: 'border-l-blue-400',
    borderSoft: 'border-blue-200',
    badge: 'bg-blue-50',
    badgeText: 'text-blue-700',
    rowHover: 'hover:bg-blue-50/40',
  },
  {
    dot: 'bg-emerald-500',
    borderStrong: 'border-l-emerald-400',
    borderSoft: 'border-emerald-200',
    badge: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    rowHover: 'hover:bg-emerald-50/40',
  },
  {
    dot: 'bg-violet-500',
    borderStrong: 'border-l-violet-400',
    borderSoft: 'border-violet-200',
    badge: 'bg-violet-50',
    badgeText: 'text-violet-700',
    rowHover: 'hover:bg-violet-50/40',
  },
  {
    dot: 'bg-amber-500',
    borderStrong: 'border-l-amber-400',
    borderSoft: 'border-amber-200',
    badge: 'bg-amber-50',
    badgeText: 'text-amber-700',
    rowHover: 'hover:bg-amber-50/40',
  },
  {
    dot: 'bg-rose-500',
    borderStrong: 'border-l-rose-400',
    borderSoft: 'border-rose-200',
    badge: 'bg-rose-50',
    badgeText: 'text-rose-700',
    rowHover: 'hover:bg-rose-50/40',
  },
  {
    dot: 'bg-cyan-500',
    borderStrong: 'border-l-cyan-400',
    borderSoft: 'border-cyan-200',
    badge: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    rowHover: 'hover:bg-cyan-50/40',
  },
  {
    dot: 'bg-fuchsia-500',
    borderStrong: 'border-l-fuchsia-400',
    borderSoft: 'border-fuchsia-200',
    badge: 'bg-fuchsia-50',
    badgeText: 'text-fuchsia-700',
    rowHover: 'hover:bg-fuchsia-50/40',
  },
  {
    dot: 'bg-lime-500',
    borderStrong: 'border-l-lime-400',
    borderSoft: 'border-lime-200',
    badge: 'bg-lime-50',
    badgeText: 'text-lime-700',
    rowHover: 'hover:bg-lime-50/40',
  },
]

function hashStringToInt(input: string): number {
  // Simple, deterministic 32-bit hash (djb2-ish)
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  // Ensure non-negative
  return hash >>> 0
}

export function getRepoColorClasses(key: string): RepoColorClasses {
  const safeKey = String(key || 'default')
  const idx = hashStringToInt(safeKey) % PALETTE.length
  return PALETTE[idx]
}

import { Plus, X } from 'lucide-react'
import { formatSeconds } from '../lib/format'

interface Props {
  remaining: number
  progress: number
  onAdd: () => void
  onSkip: () => void
}

export function RestTimerBar({ remaining, progress, onAdd, onSkip }: Props) {
  const done = remaining <= 0

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 px-4">
      <div className="pointer-events-auto mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="h-1 w-full bg-zinc-800">
          <div
            className={`h-full transition-[width] duration-300 ease-linear ${
              done ? 'bg-brand-300' : 'bg-brand-500'
            }`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {done ? 'Rest complete' : 'Resting'}
            </p>
            <p
              className={`font-mono text-2xl font-semibold tabular-nums ${
                done ? 'text-brand-300' : 'text-zinc-100'
              }`}
            >
              {formatSeconds(remaining)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs font-semibold text-zinc-200 active:scale-95"
            >
              <Plus size={14} />
              5s
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 active:scale-95"
            >
              <X size={14} />
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

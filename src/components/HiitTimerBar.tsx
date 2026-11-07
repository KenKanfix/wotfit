import { Check, ChevronUp, Timer } from 'lucide-react'
import type { HiitTimer } from '../hooks/useHiitTimer'
import { formatSeconds } from '../lib/format'

interface Props {
  timer: HiitTimer
  raised: boolean
  onOpen: () => void
}

export function HiitTimerBar({ timer, raised, onOpen }: Props) {
  const interval = timer.currentInterval
  if (!interval || !timer.status) return null

  const finished = timer.status === 'finished'
  const paused = timer.status === 'paused'
  const label = finished
    ? 'HIIT complete'
    : paused
      ? 'HIIT paused'
      : interval.type === 'work'
        ? 'HIIT work'
        : 'HIIT rest'
  const subtitle = finished
    ? 'Tap to review'
    : interval.type === 'work'
      ? interval.exerciseName
      : `Next · ${interval.exerciseName}`

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-40 px-4 ${
        raised
          ? 'bottom-[calc(9.5rem+env(safe-area-inset-bottom))]'
          : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]'
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-brand-400/30 bg-zinc-900/95 px-4 py-3 text-left shadow-2xl shadow-black/50 backdrop-blur-xl active:scale-[0.99]"
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            finished
              ? 'bg-brand-400/15 text-brand-300'
              : paused
                ? 'bg-amber-400/15 text-amber-300'
                : interval.type === 'work'
                  ? 'bg-brand-400/15 text-brand-300'
                  : 'bg-sky-400/15 text-sky-300'
          }`}
        >
          {finished ? <Check size={18} /> : <Timer size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </span>
          <span className="block truncate text-sm font-semibold text-zinc-100">
            {subtitle}
          </span>
        </span>
        <span
          className={`font-mono text-lg font-semibold tabular-nums ${
            finished ? 'text-brand-300' : 'text-zinc-100'
          }`}
        >
          {finished
            ? formatSeconds(timer.totalSeconds)
            : formatSeconds(timer.remaining)}
        </span>
        <ChevronUp size={16} className="shrink-0 text-zinc-500" />
      </button>
    </div>
  )
}

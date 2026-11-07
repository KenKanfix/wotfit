import { Check, Search, Timer, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '../lib/recommend'
import type { Exercise } from '../types'
import { ExerciseGraphic } from './ExerciseGraphic'

interface Props {
  open: boolean
  exercises: Exercise[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onClose: () => void
}

type Filter = 'all' | 'bodyweight'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bodyweight', label: 'Bodyweight' },
]

export function HiitExercisePicker({
  open,
  exercises,
  selectedIds,
  onToggle,
  onClose,
}: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const selected = useMemo(() => new Set(selectedIds), [selectedIds])

  const list = useMemo(() => {
    const search = query.trim().toLowerCase()
    const matches = (exercise: Exercise) =>
      !search ||
      exercise.name.toLowerCase().includes(search) ||
      exercise.equipment.toLowerCase().includes(search) ||
      exercise.primaryMuscles.some(
        (muscle) =>
          muscle.includes(search) ||
          (MUSCLE_LABELS[muscle] ?? '').toLowerCase().includes(search),
      )

    return exercises
      .filter((exercise) => {
        if (
          filter === 'bodyweight' &&
          !exercise.isCalisthenics &&
          exercise.equipment !== 'bodyweight' &&
          exercise.equipment !== 'bands'
        ) {
          return false
        }
        return matches(exercise)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, query, filter])

  if (!open) return null

  const close = () => {
    setQuery('')
    setFilter('all')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close HIIT exercise picker"
        onClick={close}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative flex h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
              HIIT intervals
            </p>
            <h2 className="text-lg font-bold">Choose exercises</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid h-9 w-9 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5">
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
            <Search size={16} className="text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exercise or muscle"
              className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-zinc-500"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === item.id
                    ? 'bg-brand-400 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto px-5 pb-8">
          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              No exercises match that search.
            </p>
          ) : (
            list.map((exercise) => {
              const isSelected = selected.has(exercise.id)
              return (
                <button
                  key={exercise.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggle(exercise.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-brand-400/40 bg-brand-400/[0.06]'
                      : 'border-zinc-800 bg-zinc-900/70 active:bg-zinc-800'
                  }`}
                >
                  <ExerciseGraphic
                    exerciseId={exercise.id}
                    name={exercise.name}
                    className="h-12 w-12 shrink-0 rounded-xl border border-zinc-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-zinc-100">
                        {exercise.name}
                      </p>
                      {exercise.isTimed ? (
                        <Timer size={12} className="shrink-0 text-zinc-500" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                      {EQUIPMENT_LABELS[exercise.equipment]} ·{' '}
                      {exercise.primaryMuscles
                        .map((muscle) => MUSCLE_LABELS[muscle] ?? muscle)
                        .join(', ')}
                    </p>
                  </div>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                      isSelected
                        ? 'bg-brand-400 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Check size={16} />
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="border-t border-zinc-800 px-5 pb-5 pt-3">
          <button
            type="button"
            onClick={close}
            className="w-full rounded-2xl bg-brand-400 px-4 py-3 text-sm font-bold text-zinc-950"
          >
            Done · {selectedIds.length} selected
          </button>
        </div>
      </div>
    </div>
  )
}

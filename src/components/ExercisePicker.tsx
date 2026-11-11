import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, Search, Timer, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getExerciseHistoryMap } from '../lib/history'
import { buildSessionPlan, EQUIPMENT_LABELS, MUSCLE_LABELS } from '../lib/recommend'
import type { Exercise, ExerciseSession, Settings } from '../types'
import { CustomExerciseSheet } from './CustomExerciseSheet'
import { ExerciseGraphic } from './ExerciseGraphic'

interface Props {
  open: boolean
  exercises: Exercise[]
  settings: Settings
  existingIds: Set<string>
  onClose: () => void
  onPick: (exercise: Exercise) => void
}

type Filter = 'all' | 'suggested' | 'calisthenics'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'suggested', label: 'Suggested' },
  { id: 'calisthenics', label: 'Bodyweight' },
]

export function ExercisePicker({
  open,
  exercises,
  settings,
  existingIds,
  onClose,
  onPick,
}: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [createOpen, setCreateOpen] = useState(false)

  const history = useLiveQuery<Map<string, ExerciseSession>>(
    () =>
      open
        ? getExerciseHistoryMap()
        : Promise.resolve(new Map<string, ExerciseSession>()),
    [open],
  )

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  )

  const suggested = useMemo(() => {
    if (!open) return []
    const plan = buildSessionPlan(
      exercises,
      settings,
      history ?? new Map<string, ExerciseSession>(),
      5,
    )
    return plan
      .map((item) => exerciseMap.get(item.exercise.id))
      .filter((exercise): exercise is Exercise => Boolean(exercise))
  }, [open, exercises, settings, history, exerciseMap])

  const sorted = useMemo(
    () => [...exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises],
  )

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

  const suggestedIds = new Set(suggested.map((exercise) => exercise.id))

  let list: Exercise[]
  if (filter === 'suggested') {
    list = suggested.filter(matches)
  } else if (filter === 'calisthenics') {
    list = sorted.filter(
      (exercise) =>
        (exercise.isCalisthenics ||
          exercise.equipment === 'bodyweight' ||
          exercise.equipment === 'bands') &&
        matches(exercise),
    )
  } else if (search) {
    list = sorted.filter(matches)
  } else {
    list = [
      ...suggested,
      ...sorted.filter((exercise) => !suggestedIds.has(exercise.id)),
    ]
  }

  if (!open) return null

  const close = () => {
    setQuery('')
    setFilter('all')
    onClose()
  }

  const handleCreated = (exercise: Exercise) => {
    onPick(exercise)
    close()
  }

  const renderExercise = (exercise: Exercise, showSuggestedTag = false) => {
    const added = existingIds.has(exercise.id)
    return (
      <button
        key={exercise.id}
        type="button"
        disabled={added}
        onClick={() => {
          onPick(exercise)
          close()
        }}
        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
          added
            ? 'border-zinc-800/60 bg-zinc-900/40 opacity-60'
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
            {exercise.isCustom ? (
              <span className="shrink-0 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-400">
                Custom
              </span>
            ) : null}
            {showSuggestedTag ? (
              <span className="shrink-0 rounded-full bg-brand-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-300">
                Pick
              </span>
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
            added
              ? 'bg-zinc-800 text-zinc-500'
              : 'bg-brand-400/15 text-brand-300'
          }`}
        >
          {added ? <Check size={16} /> : <Plus size={16} />}
        </span>
      </button>
    )
  }

  const showSuggestedSection =
    filter === 'all' && !search && suggested.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close exercise picker"
        onClick={close}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative flex h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
              Exercise library
            </p>
            <h2 className="text-lg font-bold">Add a movement</h2>
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
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-brand-400/40 bg-brand-400/10 px-3 py-1.5 text-xs font-semibold text-brand-300 active:scale-95"
            >
              <Plus size={13} />
              New
            </button>
          </div>
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto px-5 pb-8">
          {showSuggestedSection ? (
            <div className="space-y-2">
              <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Suggested for {settings.goal.replace('_', ' ')}
              </p>
              {suggested.map((exercise) => renderExercise(exercise, true))}
              <p className="pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                All exercises
              </p>
              {sorted
                .filter((exercise) => !suggestedIds.has(exercise.id))
                .map((exercise) => renderExercise(exercise))}
            </div>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              No exercises match that search.
            </p>
          ) : (
            list.map((exercise) => renderExercise(exercise))
          )}
        </div>
      </div>

      {createOpen ? (
        <CustomExerciseSheet
          open
          onClose={() => setCreateOpen(false)}
          onSaved={handleCreated}
        />
      ) : null}
    </div>
  )
}

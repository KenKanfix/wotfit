import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  Dumbbell,
  Minus,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
  Volume2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ExerciseGraphic } from '../components/ExerciseGraphic'
import { ExercisePicker } from '../components/ExercisePicker'
import { db } from '../db'
import { vibrate } from '../lib/feedback'
import {
  formatDuration,
  formatSeconds,
  toKg,
  weightInputValue,
} from '../lib/format'
import { GOAL_LABELS } from '../lib/recommend'
import {
  clampRestSeconds,
  DEFAULT_REST_SECONDS,
  REST_STEP_SECONDS,
  restSecondsFor,
} from '../lib/rest'
import { speak } from '../lib/speech'
import {
  addExerciseToWorkout,
  addSetToExercise,
  discardWorkout,
  finishWorkout,
  removeExercise,
  removeSet,
} from '../lib/workout'
import type { Exercise, Settings, Workout, WorkoutSet } from '../types'

interface Props {
  workout: Workout
  settings: Settings
  onRest: (seconds: number) => void
  onFinished: () => void
  onDiscard: () => void
}

interface ExerciseGroup {
  exercise: Exercise
  sets: WorkoutSet[]
}

function SetRow({
  set,
  exercise,
  unit,
  onUpdate,
  onToggle,
  onRemove,
}: {
  set: WorkoutSet
  exercise: Exercise
  unit: 'kg' | 'lb'
  onUpdate: (id: string, patch: Partial<WorkoutSet>) => void
  onToggle: () => void
  onRemove: () => void
}) {
  const step = unit === 'kg' ? 0.5 : 2.5

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors ${
        set.completed
          ? 'border-brand-400/30 bg-brand-400/[0.06]'
          : 'border-zinc-800 bg-zinc-900/40'
      }`}
    >
      <span
        className={`w-5 text-center text-[11px] font-bold ${
          set.completed ? 'text-brand-300' : 'text-zinc-500'
        }`}
      >
        {set.setNumber}
      </span>
      <div className="flex h-9 w-[88px] items-center gap-1 rounded-lg bg-zinc-950/60 px-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          defaultValue={weightInputValue(set.weight, unit)}
          placeholder={exercise.equipment === 'bodyweight' ? 'BW' : '0'}
          onBlur={(event) => {
            const display = Number.parseFloat(event.target.value)
            const kg =
              Number.isFinite(display) && display > 0
                ? toKg(display, unit)
                : 0
            onUpdate(set.id, { weight: Math.round(kg * 100) / 100 })
          }}
          className="w-full bg-transparent text-center text-sm font-semibold text-zinc-100 outline-none placeholder:text-[10px] placeholder:text-zinc-600"
          aria-label="Weight"
        />
        <span className="text-[9px] font-semibold uppercase text-zinc-600">
          {unit}
        </span>
      </div>
      <div className="flex h-9 w-[72px] items-center gap-1 rounded-lg bg-zinc-950/60 px-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={set.reps || ''}
          onBlur={(event) => {
            const reps = Number.parseInt(event.target.value, 10)
            onUpdate(set.id, {
              reps: Number.isFinite(reps) ? Math.max(0, reps) : 0,
            })
          }}
          className="w-full bg-transparent text-center text-sm font-semibold text-zinc-100 outline-none"
          aria-label={exercise.isTimed ? 'Seconds' : 'Reps'}
        />
        <span className="text-[9px] font-semibold text-zinc-600">
          {exercise.isTimed ? 's' : 'reps'}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={set.completed ? 'Mark set incomplete' : 'Complete set'}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
          set.completed
            ? 'bg-brand-400 text-zinc-950'
            : 'border border-zinc-700 bg-zinc-900 text-zinc-500'
        }`}
      >
        <Check size={17} strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove set"
        className="grid h-7 w-6 shrink-0 place-items-center text-zinc-600"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function WorkoutScreen({
  workout,
  settings,
  onRest,
  onFinished,
  onDiscard,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(() => Date.now() - workout.startedAt)

  const sets = useLiveQuery(
    () => db.sets.where('workoutId').equals(workout.id).toArray(),
    [workout.id],
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  useEffect(() => {
    const interval = window.setInterval(
      () => setElapsed(Date.now() - workout.startedAt),
      30_000,
    )
    return () => window.clearInterval(interval)
  }, [workout.startedAt])

  const groups = useMemo(() => {
    if (!sets || !exercises) return []
    const exerciseMap = new Map(
      exercises.map((exercise) => [exercise.id, exercise]),
    )
    const order: string[] = []
    const grouped = new Map<string, WorkoutSet[]>()
    for (const set of [...sets].sort((a, b) => a.createdAt - b.createdAt)) {
      if (!grouped.has(set.exerciseId)) {
        order.push(set.exerciseId)
        grouped.set(set.exerciseId, [])
      }
      grouped.get(set.exerciseId)?.push(set)
    }
    const result: ExerciseGroup[] = []
    for (const id of order) {
      const exercise = exerciseMap.get(id)
      if (!exercise) continue
      result.push({ exercise, sets: grouped.get(id) ?? [] })
    }
    return result
  }, [sets, exercises])

  const completedCount = sets?.filter((set) => set.completed).length ?? 0
  const totalCount = sets?.length ?? 0
  const existingIds = useMemo(
    () => new Set(sets?.map((set) => set.exerciseId) ?? []),
    [sets],
  )

  const handlePick = async (exercise: Exercise) => {
    if (settings.voiceCues) {
      speak(`${exercise.name}. ${exercise.cues ?? ''}`)
    }
    await addExerciseToWorkout(
      workout.id,
      exercise,
      undefined,
      restSecondsFor(exercise, settings),
    )
    vibrate(20)
  }

  const handleToggle = async (set: WorkoutSet, exercise: Exercise) => {
    const next = !set.completed
    await db.sets.update(set.id, { completed: next })
    if (next) {
      vibrate(25)
      onRest(restSecondsFor(exercise, settings))
    }
  }

  const adjustExerciseRest = (exercise: Exercise, delta: number) => {
    void db.settings
      .where('id')
      .equals(1)
      .modify((stored) => {
        const current =
          stored.restOverrides?.[exercise.id] ??
          stored.defaultRestSeconds ??
          DEFAULT_REST_SECONDS
        stored.restOverrides = {
          ...(stored.restOverrides ?? {}),
          [exercise.id]: clampRestSeconds(current + delta),
        }
      })
  }

  const resetExerciseRest = (exercise: Exercise) => {
    void db.settings
      .where('id')
      .equals(1)
      .modify((stored) => {
        const restOverrides = { ...(stored.restOverrides ?? {}) }
        delete restOverrides[exercise.id]
        stored.restOverrides = restOverrides
      })
  }

  const handleUpdate = (id: string, patch: Partial<WorkoutSet>) => {
    void db.sets.update(id, patch)
  }

  const handleRemoveSet = async (set: WorkoutSet) => {
    if (!window.confirm('Remove this set?')) return
    await removeSet(set)
  }

  const handleRemoveExercise = async (exercise: Exercise) => {
    if (!window.confirm(`Remove ${exercise.name} from this workout?`)) return
    await removeExercise(workout.id, exercise.id)
  }

  const handleFinish = async () => {
    if (completedCount === 0) return
    setBusy(true)
    await finishWorkout(workout.id)
    setBusy(false)
    onFinished()
  }

  const handleDiscard = async () => {
    if (!window.confirm('Discard this session? Logged sets will be lost.')) return
    setBusy(true)
    await discardWorkout(workout.id)
    setBusy(false)
    onDiscard()
  }

  return (
    <div className="pb-40">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
              Active session
            </p>
            <h1 className="text-lg font-bold">{GOAL_LABELS[workout.goal]}</h1>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-semibold tabular-nums text-zinc-200">
              {formatDuration(elapsed)}
            </p>
            <p className="text-[10px] text-zinc-500">
              {completedCount}/{totalCount} sets
            </p>
          </div>
        </div>
      </header>

      <div className="px-5 pt-4">
        {groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 px-5 py-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-zinc-900 text-brand-300">
              <Dumbbell size={22} />
            </span>
            <h2 className="mt-3 text-base font-bold">Add your first movement</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Pick an exercise and we will pre-fill sets, reps and load from your
              history.
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-brand-400 px-4 py-2.5 text-sm font-bold text-zinc-950"
            >
              <Plus size={16} />
              Add exercise
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(({ exercise, sets: exerciseSets }) => {
              const targetReps = exerciseSets[0]?.reps ?? exercise.repRange[0]
              const rest = restSecondsFor(exercise, settings)
              const hasCustomRest =
                settings.restOverrides?.[exercise.id] != null
              return (
                <section
                  key={exercise.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3"
                >
                  <div className="flex items-start gap-3">
                    <ExerciseGraphic
                      exerciseId={exercise.id}
                      name={exercise.name}
                      animate
                      expandable
                      className="h-14 w-14 shrink-0 rounded-xl border border-zinc-800"
                    />
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-bold text-zinc-100">
                          {exercise.name}
                        </h2>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-zinc-500">
                          <span>
                            {exerciseSets.length} sets × {targetReps}{' '}
                            {exercise.isTimed ? 'sec' : 'reps'} · rest
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              adjustExerciseRest(exercise, -REST_STEP_SECONDS)
                            }
                            className="grid h-6 w-6 place-items-center rounded-md bg-zinc-800/80 text-zinc-300 active:scale-95"
                            aria-label={`Decrease rest for ${exercise.name}`}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="min-w-8 text-center font-semibold text-zinc-300">
                            {formatSeconds(rest)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              adjustExerciseRest(exercise, REST_STEP_SECONDS)
                            }
                            className="grid h-6 w-6 place-items-center rounded-md bg-zinc-800/80 text-zinc-300 active:scale-95"
                            aria-label={`Increase rest for ${exercise.name}`}
                          >
                            <Plus size={12} />
                          </button>
                          {hasCustomRest ? (
                            <button
                              type="button"
                              onClick={() => resetExerciseRest(exercise)}
                              className="grid h-6 w-6 place-items-center rounded-md text-zinc-500 active:scale-95"
                              aria-label={`Reset rest for ${exercise.name} to default`}
                            >
                              <RotateCcw size={11} />
                            </button>
                          ) : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveExercise(exercise)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-600 hover:text-red-400"
                        aria-label={`Remove ${exercise.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {exercise.cues ? (
                    <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-2.5 py-2">
                      <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-zinc-400">
                        <span className="font-semibold text-zinc-200">
                          Technique:{' '}
                        </span>
                        {exercise.cues}
                      </p>
                      <button
                        type="button"
                        onClick={() => speak(exercise.cues)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-brand-300 active:bg-brand-400/10"
                        aria-label={`Speak technique for ${exercise.name}`}
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 px-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
                      <span className="w-5" />
                      <span className="w-[88px] text-center">Weight</span>
                      <span className="w-[72px] text-center">
                        {exercise.isTimed ? 'Seconds' : 'Reps'}
                      </span>
                      <span className="w-9 text-center">Done</span>
                      <span className="w-6" />
                    </div>
                    {exerciseSets.map((set) => (
                      <SetRow
                        key={set.id}
                        set={set}
                        exercise={exercise}
                        unit={settings.unit}
                        onUpdate={handleUpdate}
                        onToggle={() => void handleToggle(set, exercise)}
                        onRemove={() => void handleRemoveSet(set)}
                      />
                    ))}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void addSetToExercise(workout.id, exercise, rest)
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300"
                    >
                      <Plus size={13} />
                      Set
                    </button>
                    {rest > 0 ? (
                      <button
                        type="button"
                        onClick={() => onRest(rest)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-500"
                      >
                        <Timer size={12} />
                        Rest
                      </button>
                    ) : null}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {groups.length > 0 ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3 text-sm font-semibold text-zinc-300"
          >
            <Plus size={16} />
            Add exercise
          </button>
        ) : null}

        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={completedCount === 0 || busy}
            onClick={() => void handleFinish()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-4 py-3.5 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <Check size={17} strokeWidth={3} />
            Finish workout
            {completedCount > 0 ? ` · ${completedCount} sets` : ''}
          </button>
          <button
            type="button"
            onClick={() => void handleDiscard()}
            className="w-full rounded-2xl py-2.5 text-xs font-semibold text-zinc-500"
          >
            Discard session
          </button>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        exercises={exercises ?? []}
        settings={settings}
        existingIds={existingIds}
        onClose={() => setPickerOpen(false)}
        onPick={(exercise) => void handlePick(exercise)}
      />
    </div>
  )
}

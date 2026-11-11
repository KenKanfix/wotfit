import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import { relativeDate, toKg, weightInputValue } from '../lib/format'
import { GOAL_LABELS } from '../lib/recommend'
import { restSecondsFor } from '../lib/rest'
import {
  addExerciseToWorkout,
  addSetToExercise,
  deleteWorkout,
  removeSet,
} from '../lib/workout'
import type { Exercise, Settings, Workout, WorkoutSet } from '../types'
import { ExerciseGraphic } from './ExerciseGraphic'
import { ExercisePicker } from './ExercisePicker'

interface Props {
  open: boolean
  workout: Workout | null
  settings: Settings
  onClose: () => void
}

interface ExerciseGroup {
  exercise: Exercise
  sets: WorkoutSet[]
}

export function WorkoutEditSheet({ open, workout, settings, onClose }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [notes, setNotes] = useState(() => workout?.notes ?? '')

  const sets = useLiveQuery(
    () =>
      open && workout
        ? db.sets.where('workoutId').equals(workout.id).toArray()
        : Promise.resolve([] as WorkoutSet[]),
    [open, workout?.id],
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const groups = useMemo<ExerciseGroup[]>(() => {
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
      result.push({
        exercise,
        sets: [...(grouped.get(id) ?? [])].sort(
          (a, b) => a.setNumber - b.setNumber,
        ),
      })
    }
    return result
  }, [sets, exercises])

  const existingIds = useMemo(
    () => new Set(sets?.map((set) => set.exerciseId) ?? []),
    [sets],
  )

  if (!open || !workout) return null

  const handleUpdate = (id: string, patch: Partial<WorkoutSet>) => {
    void db.sets.update(id, patch)
  }

  const handleWeight = (set: WorkoutSet, value: string) => {
    const display = Number.parseFloat(value)
    const kg = Number.isFinite(display) && display > 0 ? toKg(display, settings.unit) : 0
    handleUpdate(set.id, { weight: Math.round(kg * 100) / 100 })
  }

  const handleReps = (set: WorkoutSet, value: string) => {
    const reps = Number.parseInt(value, 10)
    handleUpdate(set.id, {
      reps: Number.isFinite(reps) ? Math.max(0, reps) : 0,
    })
  }

  const handleRemoveSet = async (set: WorkoutSet) => {
    if (!window.confirm('Remove this set from the log?')) return
    await removeSet(set)
  }

  const handleAddSet = (exercise: Exercise) => {
    void addSetToExercise(
      workout.id,
      exercise,
      restSecondsFor(exercise, settings),
      true,
    )
  }

  const handlePick = (exercise: Exercise) => {
    void addExerciseToWorkout(
      workout.id,
      exercise,
      undefined,
      restSecondsFor(exercise, settings),
      true,
    )
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this workout from your history?')) return
    await deleteWorkout(workout.id)
    onClose()
  }

  const saveNotes = () => {
    void db.workouts.update(workout.id, {
      notes: notes.trim() ? notes.trim() : undefined,
    })
  }

  const handleClose = () => {
    saveNotes()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close workout editor"
        onClick={handleClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-800 text-zinc-400">
              <CalendarDays size={17} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
                Edit log
              </p>
              <h2 className="text-lg font-bold">
                {relativeDate(workout.date)} · {GOAL_LABELS[workout.goal]}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400"
            aria-label="Close workout editor"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-6">
          {groups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
              No sets logged. Add an exercise below.
            </p>
          ) : (
            groups.map(({ exercise, sets: exerciseSets }) => (
              <section
                key={exercise.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <ExerciseGraphic
                    exerciseId={exercise.id}
                    name={exercise.name}
                    className="h-10 w-10 shrink-0 rounded-xl border border-zinc-800"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-zinc-100">
                      {exercise.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      {exerciseSets.length} sets ·{' '}
                      {exercise.isTimed ? 'seconds' : 'reps'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {exerciseSets.map((set) => (
                    <div
                      key={set.id}
                      className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-2 py-1.5"
                    >
                      <span className="w-5 text-center text-[11px] font-bold text-zinc-500">
                        {set.setNumber}
                      </span>
                      <div className="flex h-9 w-[88px] items-center gap-1 rounded-lg bg-zinc-950/60 px-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={settings.unit === 'kg' ? 0.5 : 2.5}
                          defaultValue={weightInputValue(set.weight, settings.unit)}
                          placeholder={exercise.equipment === 'bodyweight' ? 'BW' : '0'}
                          onBlur={(event) =>
                            handleWeight(set, event.target.value)
                          }
                          className="w-full bg-transparent text-center text-sm font-semibold text-zinc-100 outline-none placeholder:text-[10px] placeholder:text-zinc-600"
                          aria-label="Weight"
                        />
                        <span className="text-[9px] font-semibold uppercase text-zinc-600">
                          {settings.unit}
                        </span>
                      </div>
                      <div className="flex h-9 w-[72px] items-center gap-1 rounded-lg bg-zinc-950/60 px-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          defaultValue={set.reps || ''}
                          onBlur={(event) => handleReps(set, event.target.value)}
                          className="w-full bg-transparent text-center text-sm font-semibold text-zinc-100 outline-none"
                          aria-label={exercise.isTimed ? 'Seconds' : 'Reps'}
                        />
                        <span className="text-[9px] font-semibold text-zinc-600">
                          {exercise.isTimed ? 's' : 'reps'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveSet(set)}
                        aria-label="Remove set"
                        className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-600 active:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddSet(exercise)}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300"
                >
                  <Plus size={13} />
                  Add set
                </button>
              </section>
            ))
          )}

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-3 text-sm font-semibold text-zinc-300"
          >
            <Plus size={16} />
            Add exercise to log
          </button>

          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
              htmlFor="workout-notes"
            >
              Notes
            </label>
            <textarea
              id="workout-notes"
              rows={2}
              maxLength={240}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={saveNotes}
              placeholder="How did the session feel?"
              className="mt-1.5 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-brand-400/60"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleDelete()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-[11px] font-semibold text-red-400"
          >
            <Trash2 size={12} />
            Delete workout
          </button>
        </div>

        <div className="border-t border-zinc-800 px-5 pb-5 pt-3">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-4 py-3 text-sm font-bold text-zinc-950"
          >
            <Check size={16} strokeWidth={3} />
            Done
          </button>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        exercises={exercises ?? []}
        settings={settings}
        existingIds={existingIds}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
      />
    </div>
  )
}

import { Check, Plus, X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import {
  createCustomExercise,
  customExerciseInput,
  EQUIPMENT_OPTIONS,
  MOVEMENT_LABELS,
  MOVEMENT_OPTIONS,
  MUSCLE_OPTIONS,
  type CustomExerciseInput,
  updateCustomExercise,
} from '../lib/exerciseLibrary'
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '../lib/recommend'
import type { Equipment, Exercise, ExperienceLevel, Movement, Muscle } from '../types'

interface Props {
  open: boolean
  initial?: Exercise | null
  onClose: () => void
  onSaved?: (exercise: Exercise) => void
}

const DEFAULT_INPUT: CustomExerciseInput = {
  name: '',
  movement: 'push',
  equipment: 'bodyweight',
  primaryMuscles: ['chest'],
  isTimed: false,
  sets: 3,
  repRange: [8, 12],
  defaultRestSeconds: 90,
  level: 1,
  cues: '',
}

const LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Intermediate' },
  { value: 3, label: 'Advanced' },
]

export function CustomExerciseSheet({ open, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<CustomExerciseInput>(() =>
    initial ? customExerciseInput(initial) : DEFAULT_INPUT,
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const update = (patch: Partial<CustomExerciseInput>) => {
    setForm((current) => ({ ...current, ...patch }))
  }

  const toggleMuscle = (muscle: Muscle) => {
    setForm((current) => {
      const has = current.primaryMuscles.includes(muscle)
      return {
        ...current,
        primaryMuscles: has
          ? current.primaryMuscles.filter((item) => item !== muscle)
          : [...current.primaryMuscles, muscle],
      }
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError('Give your exercise a name.')
      return
    }
    if (form.primaryMuscles.length === 0) {
      setError('Pick at least one primary muscle.')
      return
    }

    setBusy(true)
    try {
      const saved = initial
        ? await updateCustomExercise(initial.id, { ...form, name })
        : await createCustomExercise({ ...form, name })
      onClose()
      if (saved) onSaved?.(saved)
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none focus:border-brand-400/60 placeholder:text-zinc-600'
  const labelClass =
    'text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close exercise form"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
              Exercise library
            </p>
            <h2 className="text-lg font-bold">
              {initial ? 'Edit exercise' : 'New exercise'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400"
            aria-label="Close exercise form"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-6">
          <div>
            <label className={labelClass} htmlFor="custom-name">
              Name
            </label>
            <input
              id="custom-name"
              autoFocus
              maxLength={60}
              value={form.name}
              onChange={(event) => update({ name: event.target.value })}
              placeholder="e.g. Pseudo planche push-up"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="custom-movement">
                Movement
              </label>
              <select
                id="custom-movement"
                value={form.movement}
                onChange={(event) =>
                  update({ movement: event.target.value as Movement })
                }
                className={`mt-1.5 ${inputClass}`}
              >
                {MOVEMENT_OPTIONS.map((movement) => (
                  <option key={movement} value={movement}>
                    {MOVEMENT_LABELS[movement]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="custom-equipment">
                Equipment
              </label>
              <select
                id="custom-equipment"
                value={form.equipment}
                onChange={(event) =>
                  update({ equipment: event.target.value as Equipment })
                }
                className={`mt-1.5 ${inputClass}`}
              >
                {EQUIPMENT_OPTIONS.map((equipment) => (
                  <option key={equipment} value={equipment}>
                    {EQUIPMENT_LABELS[equipment]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className={labelClass}>Primary muscles</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {MUSCLE_OPTIONS.map((muscle) => {
                const active = form.primaryMuscles.includes(muscle)
                return (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => toggleMuscle(muscle)}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                      active
                        ? 'border-brand-400/50 bg-brand-400/15 text-brand-300'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
                    }`}
                  >
                    {MUSCLE_LABELS[muscle]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass} htmlFor="custom-sets">
                Sets
              </label>
              <input
                id="custom-sets"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={form.sets}
                onChange={(event) =>
                  update({
                    sets: Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                  })
                }
                className={`mt-1.5 ${inputClass}`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="custom-rep-low">
                Min reps
              </label>
              <input
                id="custom-rep-low"
                type="number"
                inputMode="numeric"
                min={0}
                max={999}
                value={form.repRange[0]}
                onChange={(event) =>
                  update({
                    repRange: [
                      Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                      form.repRange[1],
                    ],
                  })
                }
                className={`mt-1.5 ${inputClass}`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="custom-rep-high">
                Max reps
              </label>
              <input
                id="custom-rep-high"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={form.repRange[1]}
                onChange={(event) =>
                  update({
                    repRange: [
                      form.repRange[0],
                      Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                    ],
                  })
                }
                className={`mt-1.5 ${inputClass}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="custom-rest">
                Rest (seconds)
              </label>
              <input
                id="custom-rest"
                type="number"
                inputMode="numeric"
                min={5}
                max={600}
                step={5}
                value={form.defaultRestSeconds}
                onChange={(event) =>
                  update({
                    defaultRestSeconds: Math.max(
                      5,
                      Number.parseInt(event.target.value, 10) || 5,
                    ),
                  })
                }
                className={`mt-1.5 ${inputClass}`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="custom-level">
                Level
              </label>
              <select
                id="custom-level"
                value={form.level}
                onChange={(event) =>
                  update({
                    level: Number.parseInt(event.target.value, 10) as ExperienceLevel,
                  })
                }
                className={`mt-1.5 ${inputClass}`}
              >
                {LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => update({ isTimed: !form.isTimed })}
            aria-pressed={form.isTimed}
            className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors ${
              form.isTimed
                ? 'border-brand-400/50 bg-brand-400/10'
                : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <span>
              <span className="block text-sm font-semibold text-zinc-100">
                Timed hold
              </span>
              <span className="block text-[11px] text-zinc-500">
                Log seconds instead of reps (planks, L-sits)
              </span>
            </span>
            <span
              className={`grid h-9 w-9 place-items-center rounded-xl ${
                form.isTimed
                  ? 'bg-brand-400/15 text-brand-300'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {form.isTimed ? <Check size={17} /> : <Plus size={17} />}
            </span>
          </button>

          <div>
            <label className={labelClass} htmlFor="custom-cues">
              Technique cue
            </label>
            <textarea
              id="custom-cues"
              rows={3}
              maxLength={240}
              value={form.cues}
              onChange={(event) => update({ cues: event.target.value })}
              placeholder="One short reminder to nail the movement."
              className={`mt-1.5 resize-none ${inputClass}`}
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] font-semibold text-red-300">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-zinc-800 px-5 pb-5 pt-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-4 py-3 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <Check size={16} strokeWidth={3} />
            {initial ? 'Save changes' : 'Add exercise'}
          </button>
        </div>
      </form>
    </div>
  )
}

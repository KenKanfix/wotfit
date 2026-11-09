import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  BookmarkPlus,
  ChevronRight,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { ExerciseGraphic } from '../components/ExerciseGraphic'
import { ExercisePicker } from '../components/ExercisePicker'
import { db } from '../db'
import { formatWeight } from '../lib/format'
import { getExerciseHistoryMap, getProgressInsights } from '../lib/history'
import {
  applySavedPlan,
  deleteSavedPlan,
  savePlan,
} from '../lib/plans'
import { actionLabel, suggestProgression } from '../lib/progression'
import { restSecondsFor } from '../lib/rest'
import { speak } from '../lib/speech'
import {
  buildSessionPlan,
  EQUIPMENT_LABELS,
  GOAL_DESCRIPTIONS,
  GOAL_LABELS,
  type PlanItem,
} from '../lib/recommend'
import {
  addExerciseToWorkout,
  startWorkout,
} from '../lib/workout'
import type {
  Exercise,
  ExerciseSession,
  ProgressInsight,
  ProgressionAction,
  SavedPlan,
  Settings,
  Tab,
  Workout,
} from '../types'

interface Props {
  settings: Settings
  active?: Workout
  onNavigate: (tab: Tab) => void
  onEditSettings: () => void
}

type PickerMode = { type: 'add' } | { type: 'replace'; index: number }

const ACTION_STYLES: Record<ProgressionAction, string> = {
  start: 'bg-zinc-800 text-zinc-400',
  increase_weight: 'bg-brand-400/15 text-brand-300',
  add_reps: 'bg-sky-400/15 text-sky-300',
  progress_variation: 'bg-violet-400/15 text-violet-300',
  hold: 'bg-zinc-800 text-zinc-400',
  deload: 'bg-amber-400/15 text-amber-300',
}

function targetText(item: PlanItem, settings: Settings): string {
  const { exercise, suggestion } = item
  const reps = `${suggestion.targetSets} × ${suggestion.targetReps} ${
    exercise.isTimed ? 'sec' : 'reps'
  }`
  if (suggestion.weight > 0) {
    return `${reps} @ ${formatWeight(suggestion.weight, settings.unit)}`
  }
  return reps
}

export function PlanScreen({
  settings,
  active,
  onNavigate,
  onEditSettings,
}: Props) {
  const [seed, setSeed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [planName, setPlanName] = useState('')
  const [customPlan, setCustomPlan] = useState<PlanItem[] | null>(null)
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null)

  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const history = useLiveQuery<Map<string, ExerciseSession>>(
    () => getExerciseHistoryMap(),
    [],
  )
  const insights = useLiveQuery(() => getProgressInsights(6), [])
  const savedPlans =
    useLiveQuery(
      () => db.savedPlans.orderBy('createdAt').reverse().toArray(),
      [],
    ) ?? []

  const exerciseMap = useMemo(
    () => new Map((exercises ?? []).map((exercise) => [exercise.id, exercise])),
    [exercises],
  )

  const generatedPlan = useMemo(() => {
    if (!exercises || !history) return []
    return buildSessionPlan(exercises, settings, history, seed)
  }, [exercises, history, settings, seed])
  const plan = customPlan ?? generatedPlan

  const makePlanItem = (exercise: Exercise): PlanItem => {
    const suggestion = suggestProgression(
      exercise,
      history?.get(exercise.id)?.sets ?? [],
      exercises ?? [],
    )
    if (suggestion.action === 'progress_variation') {
      return {
        exercise,
        suggestion: {
          ...suggestion,
          action: 'add_reps',
          nextExercise: undefined,
          reason: `Top of the range reached - keep ${exercise.name} and add reps or slow the tempo.`,
        },
      }
    }
    return { exercise, suggestion }
  }

  const handlePickPlanExercise = (exercise: Exercise) => {
    if (!pickerMode) return
    const item = makePlanItem(exercise)
    if (pickerMode.type === 'add') {
      setCustomPlan([...plan, item])
    } else {
      setCustomPlan(
        plan.map((existing, index) =>
          index === pickerMode.index ? item : existing,
        ),
      )
    }
    if (settings.voiceCues) {
      speak(`${exercise.name}. ${exercise.cues ?? ''}`)
    }
    setPickerMode(null)
  }

  const removePlanItem = (index: number) => {
    setCustomPlan(plan.filter((_, itemIndex) => itemIndex !== index))
  }

  const movePlanItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= plan.length) return
    const next = [...plan]
    const moved = next[index]
    next[index] = next[target]
    next[target] = moved
    setCustomPlan(next)
  }

  const handleShuffle = () => {
    setCustomPlan(null)
    setSeed((value) => value + 1)
  }

  const pickerExistingIds = useMemo(() => {
    const ids = plan.map((item) => item.exercise.id)
    if (pickerMode?.type === 'replace') {
      ids.splice(pickerMode.index, 1)
    }
    return new Set(ids)
  }, [plan, pickerMode])

  const handleApply = async () => {
    if (busy || plan.length === 0) return
    if (settings.voiceCues) {
      const first = plan[0].exercise
      speak(`${first.name}. ${first.cues ?? ''}`)
    }
    setBusy(true)
    try {
      const workout = active ?? (await startWorkout(settings.goal))
      for (const item of plan) {
        await addExerciseToWorkout(
          workout.id,
          item.exercise,
          item.suggestion,
          restSecondsFor(item.exercise, settings),
        )
      }
      onNavigate('workout')
    } finally {
      setBusy(false)
    }
  }

  const handleSavePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = planName.trim()
    if (!name || plan.length === 0 || busy) return

    setBusy(true)
    try {
      await savePlan(name, settings, plan)
      setPlanName('')
      setSaveOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const handleUseSaved = async (saved: SavedPlan) => {
    if (busy) return
    if (settings.voiceCues) {
      const firstItem = saved.items[0]
      const firstExercise = firstItem
        ? exerciseMap.get(firstItem.exerciseId)
        : undefined
      if (firstExercise) {
        speak(`${firstExercise.name}. ${firstExercise.cues ?? ''}`)
      }
    }

    setBusy(true)
    try {
      await applySavedPlan(saved, active)
      onNavigate('workout')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteSaved = async (saved: SavedPlan) => {
    if (!window.confirm(`Delete saved plan "${saved.name}"?`)) return
    await deleteSavedPlan(saved.id)
  }

  const insightList: ProgressInsight[] = insights ?? []

  return (
    <div className="px-5 pb-28 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-300">
            Coach
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Smart plan</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Built from your goal, gear and last sessions.
          </p>
        </div>
        <button
          type="button"
          onClick={handleShuffle}
          className="mt-1 inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-[11px] font-semibold text-zinc-300 active:scale-95"
        >
          <RefreshCw size={13} />
          Shuffle
        </button>
      </header>

      <section className="mt-5 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-400/15 text-brand-300">
            <Target size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-100">
              {GOAL_LABELS[settings.goal]} · Level {settings.level}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {GOAL_DESCRIPTIONS[settings.goal]}
            </p>
          </div>
          <button
            type="button"
            onClick={onEditSettings}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-300"
          >
            Edit
            <ChevronRight size={13} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {settings.equipment.map((item) => (
            <span
              key={item}
              className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400"
            >
              {EQUIPMENT_LABELS[item]}
            </span>
          ))}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-200">Today&apos;s session</h2>
        <div className="flex items-center gap-2">
          {customPlan ? (
            <button
              type="button"
              onClick={() => setCustomPlan(null)}
              className="text-[10px] font-semibold uppercase tracking-wider text-brand-300"
            >
              Reset
            </button>
          ) : null}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {customPlan ? 'Edited - ' : ''}
            {plan.length} movements
          </span>
        </div>
      </div>

      <div className="mt-2.5 space-y-2">
        {plan.map((item, index) => (
          <div
            key={`${item.exercise.id}-${index}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
          >
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <ExerciseGraphic
                  exerciseId={item.exercise.id}
                  name={item.exercise.name}
                  expandable
                  className="h-11 w-11 rounded-xl border border-zinc-800"
                />
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-zinc-950 px-1 text-[9px] font-bold text-zinc-300 ring-1 ring-zinc-700">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-bold text-zinc-100">
                    {item.exercise.name}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      ACTION_STYLES[item.suggestion.action]
                    }`}
                  >
                    {actionLabel(item.suggestion.action)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
                  {targetText(item, settings)}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                  {item.suggestion.reason}
                </p>
                {item.progressedFrom ? (
                  <p className="mt-1 text-[10px] font-semibold text-violet-300">
                    Progressed from {item.progressedFrom.name}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950/60">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      onClick={() => movePlanItem(index, -1)}
                      className="grid h-7 w-7 place-items-center text-zinc-400 disabled:opacity-30"
                      aria-label={`Move ${item.exercise.name} up`}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === plan.length - 1}
                      onClick={() => movePlanItem(index, 1)}
                      className="grid h-7 w-7 place-items-center border-l border-zinc-800 text-zinc-400 disabled:opacity-30"
                      aria-label={`Move ${item.exercise.name} down`}
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setPickerMode({ type: 'replace', index })
                    }
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-400 disabled:opacity-50"
                  >
                    <ArrowLeftRight size={11} />
                    Swap
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removePlanItem(index)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 disabled:opacity-50"
                  >
                    <Trash2 size={11} />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => setPickerMode({ type: 'add' })}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-2.5 text-xs font-semibold text-zinc-300 disabled:opacity-50"
      >
        <Plus size={14} />
        Add exercise
      </button>

      <div className="mt-3">
        {saveOpen ? (
          <form
            onSubmit={(event) => void handleSavePlan(event)}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              maxLength={60}
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
              placeholder="Name this plan"
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-brand-400/60"
            />
            <button
              type="submit"
              disabled={!planName.trim() || busy || plan.length === 0}
              className="rounded-xl bg-brand-400 px-3 py-2 text-xs font-bold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveOpen(false)
                setPlanName('')
              }}
              className="grid h-8 w-8 place-items-center rounded-xl border border-zinc-800 text-zinc-500"
              aria-label="Cancel saving plan"
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            disabled={busy || plan.length === 0}
            onClick={() => setSaveOpen(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-2.5 text-xs font-semibold text-zinc-300 disabled:opacity-50"
          >
            <BookmarkPlus size={14} />
            Save this plan
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={busy || plan.length === 0}
        onClick={() => void handleApply()}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-4 py-3.5 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        <Sparkles size={16} />
        {active ? 'Add plan to current session' : 'Start with this plan'}
      </button>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-200">Saved plans</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {savedPlans.length} saved
          </span>
        </div>
        {savedPlans.length === 0 ? (
          <div className="mt-2.5 rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center">
            <p className="text-xs text-zinc-500">
              Save today&apos;s plan to start it again later.
            </p>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2">
            {savedPlans.map((saved) => {
              const names = saved.items
                .map((item) => exerciseMap.get(item.exerciseId)?.name)
                .filter((name): name is string => Boolean(name))
                .slice(0, 4)
                .join(' · ')
              return (
                <div
                  key={saved.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-zinc-100">
                        {saved.name}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {GOAL_LABELS[saved.goal]} · {saved.items.length}{' '}
                        movements
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSaved(saved)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-600 hover:text-red-400"
                      aria-label={`Delete ${saved.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {names ? (
                    <p className="mt-1 truncate text-[10px] text-zinc-500">
                      {names}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleUseSaved(saved)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand-400/40 bg-brand-400/10 px-2.5 py-1.5 text-[11px] font-semibold text-brand-300 disabled:opacity-50"
                  >
                    <Play size={12} />
                    {active ? 'Add to session' : 'Start plan'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {insightList.length > 0 ? (
        <section className="mt-7">
          <h2 className="text-sm font-bold text-zinc-200">Progress queue</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Movements that earned a change based on completed sets.
          </p>
          <div className="mt-2.5 space-y-2">
            {insightList.map((insight) => (
              <div
                key={insight.exercise.id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-800 text-brand-300">
                  <TrendingUp size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {insight.exercise.name}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {insight.suggestion.reason}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    ACTION_STYLES[insight.suggestion.action]
                  }`}
                >
                  {actionLabel(insight.suggestion.action)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-6 text-[10px] leading-relaxed text-zinc-600">
        Progression uses double progression: when every working set reaches the
        top of its rep range, load increases. Bodyweight movements advance to the
        next variation or add reps. Skipped sets hold you at the current level.
      </p>

      <ExercisePicker
        open={pickerMode !== null}
        exercises={exercises ?? []}
        settings={settings}
        existingIds={pickerExistingIds}
        onClose={() => setPickerMode(null)}
        onPick={handlePickPlanExercise}
      />
    </div>
  )
}

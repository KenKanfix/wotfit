import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Flame,
  Play,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { db } from '../db'
import {
  DEFAULT_BODY_WEIGHT_KG,
  estimateWorkoutCalories,
  formatCalories,
} from '../lib/calories'
import {
  formatDate,
  formatDuration,
  formatVolume,
  formatWeight,
  relativeDate,
} from '../lib/format'
import {
  getProgressInsights,
  getRecentWorkouts,
  type RecentWorkout,
} from '../lib/history'
import { actionLabel, workoutVolume } from '../lib/progression'
import { GOAL_LABELS } from '../lib/recommend'
import type { Goal, ProgressInsight, Settings, Tab, Workout } from '../types'
import { dateKey } from '../lib/format'

interface Props {
  active?: Workout
  settings: Settings
  onStart: (goal: Goal) => void
  onGeneratePlan: (goal: Goal) => void
  onNavigate: (tab: Tab) => void
}

const GOALS: Goal[] = [
  'strength',
  'hypertrophy',
  'fat_loss',
  'endurance',
  'calisthenics',
]

function insightTarget(insight: ProgressInsight, settings: Settings): string {
  const { suggestion, exercise } = insight
  if (suggestion.action === 'progress_variation' && suggestion.nextExercise) {
    return `Level up: ${suggestion.nextExercise.name}`
  }
  const reps = `${suggestion.targetReps} ${exercise.isTimed ? 'sec' : 'reps'}`
  if (suggestion.weight > 0) {
    return `${formatWeight(suggestion.weight, settings.unit)} × ${reps}`
  }
  return reps
}

export function HomeScreen({
  active,
  settings,
  onStart,
  onGeneratePlan,
  onNavigate,
}: Props) {
  const [goal, setGoal] = useState<Goal>(settings.goal)

  const stats = useLiveQuery(async () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    const workouts = await db.workouts
      .where('status')
      .equals('completed')
      .toArray()
    const thisWeek = workouts.filter(
      (workout) => workout.startedAt >= start.getTime(),
    )
    const sets =
      thisWeek.length > 0
        ? await db.sets
            .where('workoutId')
            .anyOf(thisWeek.map((workout) => workout.id))
            .toArray()
        : []
    const days = new Set(workouts.map((workout) => workout.date))
    const cursor = new Date()
    if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    let streak = 0
    while (days.has(dateKey(cursor))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    const bodyWeightKg = settings.bodyWeightKg || DEFAULT_BODY_WEIGHT_KG
    const calories = thisWeek.reduce((total, workout) => {
      const workoutSets = sets.filter(
        (set) => set.workoutId === workout.id && set.completed,
      )
      return (
        total +
        estimateWorkoutCalories(workout, workoutSets, bodyWeightKg)
      )
    }, 0)
    return {
      sessions: thisWeek.length,
      volume: workoutVolume(sets),
      sets: sets.filter((set) => set.completed).length,
      calories,
      streak,
    }
  }, [settings.bodyWeightKg])

  const insights = useLiveQuery(() => getProgressInsights(4), [])
  const recent = useLiveQuery(() => getRecentWorkouts(3), [])

  const [today] = useState(() => formatDate(dateKey(new Date())))
  const insightList = insights ?? []
  const recentList: RecentWorkout[] = recent ?? []

  return (
    <div className="px-5 pb-28 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
              alt="WOTFit icon"
              className="h-8 w-8 shrink-0 rounded-xl border border-zinc-800 object-cover"
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-300">
              WOTFit by Ken Kanfix
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Train on purpose.
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{today}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5">
          <Flame size={14} className="text-brand-300" />
          <span className="text-xs font-semibold text-zinc-200">
            {stats?.streak ?? 0} day
          </span>
        </div>
      </header>

      <section className="mt-6">
        {active ? (
          <div className="rounded-3xl border border-brand-400/30 bg-gradient-to-br from-brand-400/15 via-zinc-900 to-zinc-900 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
              Session in progress
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {GOAL_LABELS[active.goal]} day
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Started at{' '}
              {new Date(active.startedAt).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
              . Pick up where you left off.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('workout')}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-4 py-3 text-sm font-bold text-zinc-950 active:scale-[0.99]"
            >
              <Play size={16} fill="currentColor" />
              Resume workout
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Start a session
            </p>
            <h2 className="mt-1 text-xl font-bold">What are we training for?</h2>
            <div className="mt-3 grid grid-cols-5 gap-0.5">
              {GOALS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGoal(item)}
                  className={`min-w-0 rounded-full px-0 py-1.5 text-xs font-semibold leading-none tracking-tighter transition-colors ${
                    goal === item
                      ? 'bg-brand-400 text-zinc-950'
                      : 'border border-zinc-700 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {GOAL_LABELS[item]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onStart(goal)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-4 py-2.5 text-[14.4px] font-bold text-zinc-950 active:scale-[0.99]"
            >
              <Play size={14} fill="currentColor" />
              Start empty workout
            </button>
            <button
              type="button"
              onClick={() => onGeneratePlan(goal)}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-[14.4px] font-semibold text-zinc-200 active:scale-[0.99]"
            >
              Generate a smart plan
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            This week
          </p>
          <p className="mt-1 text-lg font-bold">{stats?.sessions ?? 0}</p>
          <p className="text-[10px] text-zinc-500">sessions</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Calories
          </p>
          <p className="mt-1 text-lg font-bold">
            {stats ? formatCalories(stats.calories) : '—'}
          </p>
          <p className="text-[10px] text-zinc-500">burned (est.)</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Volume
          </p>
          <p className="mt-1 text-lg font-bold">
            {stats ? formatVolume(stats.volume, settings.unit) : '—'}
          </p>
          <p className="text-[10px] text-zinc-500">moved</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Sets
          </p>
          <p className="mt-1 text-lg font-bold">{stats?.sets ?? 0}</p>
          <p className="text-[10px] text-zinc-500">logged</p>
        </div>
      </section>

      {insightList.length > 0 ? (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-200">Ready to progress</h2>
            <button
              type="button"
              onClick={() => onNavigate('plan')}
              className="text-[11px] font-semibold text-brand-300"
            >
              See plan
            </button>
          </div>
          <div className="mt-2.5 space-y-2">
            {insightList.map((insight) => (
              <div
                key={insight.exercise.id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-400/15 text-brand-300">
                  <TrendingUp size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {insight.exercise.name}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {insightTarget(insight, settings)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-400">
                  {actionLabel(insight.suggestion.action)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-200">Recent sessions</h2>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="text-[11px] font-semibold text-zinc-400"
          >
            View all
          </button>
        </div>
        {recentList.length === 0 ? (
          <div className="mt-2.5 rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center">
            <CalendarDays size={22} className="mx-auto text-zinc-600" />
            <p className="mt-2 text-sm text-zinc-400">No sessions yet.</p>
            <p className="text-xs text-zinc-600">
              Your first workout is one tap away.
            </p>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2">
            {recentList.map((item) => (
              <button
                key={item.workout.id}
                type="button"
                onClick={() => onNavigate('history')}
                className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-left active:bg-zinc-800/60"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-800 text-zinc-400">
                  <CalendarDays size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-100">
                    {relativeDate(item.workout.date)} ·{' '}
                    {GOAL_LABELS[item.workout.goal]}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {item.completedSets} sets · {item.exerciseCount} exercises ·{' '}
                    {formatVolume(item.volume, settings.unit)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-500">
                  {formatDuration(item.durationMs)}
                  <ArrowUpRight size={13} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

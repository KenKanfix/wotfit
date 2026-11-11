import { useLiveQuery } from 'dexie-react-hooks'
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  History,
  Pencil,
  Timer,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { WorkoutEditSheet } from '../components/WorkoutEditSheet'
import { db } from '../db'
import {
  DEFAULT_BODY_WEIGHT_KG,
  estimateWorkoutCalories,
  formatCalories,
} from '../lib/calories'
import {
  formatDuration,
  formatSeconds,
  formatVolume,
  formatWeight,
  relativeDate,
} from '../lib/format'
import { deleteHiitSession } from '../lib/hiitHistory'
import { GOAL_LABELS } from '../lib/recommend'
import { deleteWorkout } from '../lib/workout'
import type {
  Exercise,
  HiitSession,
  Settings,
  Workout,
  WorkoutSet,
} from '../types'

interface Props {
  settings: Settings
}

interface WorkoutDetail {
  workout: Workout
  sets: WorkoutSet[]
  groups: { exercise?: Exercise; sets: WorkoutSet[] }[]
  volume: number
  durationMs: number
  calories: number
}

type HistoryEntry =
  | {
      kind: 'workout'
      id: string
      startedAt: number
      detail: WorkoutDetail
    }
  | {
      kind: 'hiit'
      id: string
      startedAt: number
      session: HiitSession
    }

const HIIT_MODE_LABELS: Record<HiitSession['mode'], string> = {
  auto: 'Auto',
  custom: 'Custom',
  ladder: 'Ladder',
}

function hiitRestLabel(session: HiitSession): string {
  if (session.restMode === 'ratio') {
    return `1:${session.restRatio} rest:work`
  }
  return session.restSeconds > 0 ? `${session.restSeconds}s rest` : 'no rest'
}

export function HistoryScreen({ settings }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Workout | null>(null)

  const data = useLiveQuery(async () => {
    const [workouts, hiitSessions] = await Promise.all([
      db.workouts
        .orderBy('startedAt')
        .reverse()
        .filter((workout) => workout.status === 'completed')
        .limit(60)
        .toArray(),
      db.hiitSessions.orderBy('startedAt').reverse().limit(60).toArray(),
    ])
    if (workouts.length === 0 && hiitSessions.length === 0) {
      return {
        workouts: [] as WorkoutDetail[],
        hiitSessions: [] as HiitSession[],
      }
    }

    const [exercises, sets] = await Promise.all([
      db.exercises.toArray(),
      workouts.length > 0
        ? db.sets
            .where('workoutId')
            .anyOf(workouts.map((workout) => workout.id))
            .toArray()
        : Promise.resolve([] as WorkoutSet[]),
    ])
    const exerciseMap = new Map(
      exercises.map((exercise) => [exercise.id, exercise]),
    )

    const details = workouts.map((workout): WorkoutDetail => {
      const workoutSets = sets.filter(
        (set) => set.workoutId === workout.id && set.completed,
      )
      const grouped = new Map<string, WorkoutSet[]>()
      for (const set of workoutSets) {
        const existing = grouped.get(set.exerciseId)
        if (existing) existing.push(set)
        else grouped.set(set.exerciseId, [set])
      }
      const groups = [...grouped.entries()].map(([exerciseId, groupSets]) => ({
        exercise: exerciseMap.get(exerciseId),
        sets: groupSets.sort((a, b) => a.setNumber - b.setNumber),
      }))
      return {
        workout,
        sets: workoutSets,
        groups,
        volume: workoutSets.reduce(
          (total, set) => total + set.weight * set.reps,
          0,
        ),
        durationMs: workout.finishedAt
          ? workout.finishedAt - workout.startedAt
          : 0,
        calories: estimateWorkoutCalories(
          workout,
          workoutSets,
          settings.bodyWeightKg || DEFAULT_BODY_WEIGHT_KG,
        ),
      }
    })

    return { workouts: details, hiitSessions }
  }, [settings.bodyWeightKg])

  const details = useMemo(() => data?.workouts ?? [], [data])
  const hiitSessions = useMemo(() => data?.hiitSessions ?? [], [data])
  const entries = useMemo<HistoryEntry[]>(() => {
    const workoutEntries = details.map(
      (detail): HistoryEntry => ({
        kind: 'workout',
        id: detail.workout.id,
        startedAt: detail.workout.startedAt,
        detail,
      }),
    )
    const hiitEntries = hiitSessions.map(
      (session): HistoryEntry => ({
        kind: 'hiit',
        id: session.id,
        startedAt: session.startedAt,
        session,
      }),
    )
    return [...workoutEntries, ...hiitEntries].sort(
      (a, b) => b.startedAt - a.startedAt,
    )
  }, [details, hiitSessions])

  const handleDelete = async (workout: Workout) => {
    if (!window.confirm('Delete this workout from your history?')) return
    await deleteWorkout(workout.id)
    setExpanded(null)
  }

  const handleDeleteHiit = async (session: HiitSession) => {
    if (!window.confirm('Delete this HIIT session from your history?')) return
    await deleteHiitSession(session.id)
    setExpanded(null)
  }

  return (
    <div className="px-5 pb-28 pt-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-300">
          Log
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every completed session, stored on this device.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-zinc-800 px-5 py-12 text-center">
          <History size={26} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm font-semibold text-zinc-300">
            Nothing logged yet
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Finish a workout or HIIT session and it will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          {entries.map((entry) => {
            if (entry.kind === 'hiit') {
              const session = entry.session
              const open = expanded === session.id
              const workIntervals = session.intervals.filter(
                (interval) => interval.type === 'work',
              )
              const exercises = [...new Set(
                workIntervals.map((interval) => interval.exerciseName),
              )]
              return (
                <div
                  key={session.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : session.id)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-400/10 text-brand-300">
                      <Timer size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-100">
                        {relativeDate(session.date)} · HIIT{' '}
                        {HIIT_MODE_LABELS[session.mode]}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {session.ladderSteps
                          ? `${session.ladderSteps} steps · `
                          : ''}
                        {session.rounds} rungs · {workIntervals.length} work
                        intervals
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Clock size={11} />
                        {formatDuration(session.finishedAt - session.startedAt)}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Timer size={11} />
                        {formatSeconds(session.totalSeconds)}
                      </span>
                      {open ? (
                        <ChevronUp size={15} className="text-zinc-500" />
                      ) : (
                        <ChevronDown size={15} className="text-zinc-500" />
                      )}
                    </div>
                  </button>

                  {open ? (
                    <div className="border-t border-zinc-800/80 px-3 pb-3 pt-2">
                      <p className="text-[11px] text-zinc-500">
                        {session.workSeconds}s per exercise ·{' '}
                        {hiitRestLabel(session)}
                      </p>
                      <div className="mt-2 space-y-2">
                        {exercises.map((name) => {
                          const intervals = workIntervals.filter(
                            (interval) => interval.exerciseName === name,
                          )
                          const totalSeconds = intervals.reduce(
                            (total, interval) => total + interval.duration,
                            0,
                          )
                          return (
                            <div key={name}>
                              <p className="text-xs font-semibold text-zinc-200">
                                {name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-zinc-500">
                                {intervals.length} intervals ·{' '}
                                {formatSeconds(totalSeconds)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteHiit(session)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-[11px] font-semibold text-red-400"
                      >
                        <Trash2 size={12} />
                        Delete HIIT session
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            }

            const detail = entry.detail
            const open = expanded === detail.workout.id
            return (
              <div
                key={detail.workout.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(open ? null : detail.workout.id)
                  }
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-800 text-zinc-400">
                    <CalendarDays size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-100">
                      {relativeDate(detail.workout.date)} ·{' '}
                      {GOAL_LABELS[detail.workout.goal]}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {detail.sets.length} sets · {detail.groups.length}{' '}
                      exercises · {formatVolume(detail.volume, settings.unit)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <Clock size={11} />
                      {formatDuration(detail.durationMs)}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                      <Flame size={11} />
                      {formatCalories(detail.calories)}
                    </span>
                    {open ? (
                      <ChevronUp size={15} className="text-zinc-500" />
                    ) : (
                      <ChevronDown size={15} className="text-zinc-500" />
                    )}
                  </div>
                </button>

                {open ? (
                  <div className="border-t border-zinc-800/80 px-3 pb-3 pt-2">
                    <div className="space-y-2">
                      {detail.groups.map((group, index) => (
                        <div key={`${group.exercise?.id ?? 'unknown'}-${index}`}>
                          <p className="text-xs font-semibold text-zinc-200">
                            {group.exercise?.name ?? 'Unknown exercise'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            {group.sets
                              .map((set) => {
                                if (set.weight > 0) {
                                  return `${formatWeight(
                                    set.weight,
                                    settings.unit,
                                  )} × ${set.reps}`
                                }
                                return group.exercise?.isTimed
                                  ? `${set.reps}s`
                                  : `${set.reps} reps`
                              })
                              .join('  ·  ')}
                          </p>
                        </div>
                      ))}
                    </div>
                    {detail.workout.notes ? (
                      <p className="mt-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-2.5 py-2 text-[11px] leading-relaxed text-zinc-400">
                        {detail.workout.notes}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(detail.workout)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/70 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-200"
                      >
                        <Pencil size={12} />
                        Edit workout
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(detail.workout)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-[11px] font-semibold text-red-400"
                      >
                        <Trash2 size={12} />
                        Delete workout
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {editing ? (
        <WorkoutEditSheet
          open
          workout={editing}
          settings={settings}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}

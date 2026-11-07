import { db } from '../db'
import type {
  ExerciseSession,
  ProgressInsight,
  Workout,
  WorkoutSet,
} from '../types'
import { suggestProgression } from './progression'

function groupSetsByExercise(sets: WorkoutSet[]): Map<string, WorkoutSet[]> {
  const grouped = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    const existing = grouped.get(set.exerciseId)
    if (existing) existing.push(set)
    else grouped.set(set.exerciseId, [set])
  }
  for (const group of grouped.values()) {
    group.sort((a, b) => a.setNumber - b.setNumber)
  }
  return grouped
}

export async function getExerciseHistoryMap(): Promise<
  Map<string, ExerciseSession>
> {
  const workouts = await db.workouts
    .where('status')
    .equals('completed')
    .toArray()
  if (workouts.length === 0) return new Map()

  const workoutMap = new Map(workouts.map((workout) => [workout.id, workout]))
  const sets = await db.sets.toArray()
  const setsByWorkout = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    if (!workoutMap.has(set.workoutId)) continue
    const existing = setsByWorkout.get(set.workoutId)
    if (existing) existing.push(set)
    else setsByWorkout.set(set.workoutId, [set])
  }

  const sortedWorkouts = [...workouts].sort(
    (a, b) => b.startedAt - a.startedAt,
  )
  const history = new Map<string, ExerciseSession>()

  for (const workout of sortedWorkouts) {
    const workoutSets = setsByWorkout.get(workout.id) ?? []
    for (const [exerciseId, exerciseSets] of groupSetsByExercise(workoutSets)) {
      if (history.has(exerciseId)) continue
      history.set(exerciseId, {
        workoutId: workout.id,
        date: workout.date,
        sets: exerciseSets,
      })
    }
  }

  return history
}

export async function getLastCompletedSession(
  exerciseId: string,
): Promise<{ workout: Workout; sets: WorkoutSet[] } | null> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  if (sets.length === 0) return null

  const workoutIds = [...new Set(sets.map((set) => set.workoutId))]
  const workouts = await db.workouts.where('id').anyOf(workoutIds).toArray()
  const completed = workouts
    .filter((workout) => workout.status === 'completed')
    .sort((a, b) => b.startedAt - a.startedAt)

  for (const workout of completed) {
    const workoutSets = sets
      .filter((set) => set.workoutId === workout.id)
      .sort((a, b) => a.setNumber - b.setNumber)
    if (workoutSets.some((set) => set.completed)) {
      return { workout, sets: workoutSets }
    }
  }

  return null
}

const ACTION_PRIORITY: Record<string, number> = {
  progress_variation: 0,
  increase_weight: 1,
  deload: 2,
}

export async function getProgressInsights(limit = 4): Promise<ProgressInsight[]> {
  const [exercises, history] = await Promise.all([
    db.exercises.toArray(),
    getExerciseHistoryMap(),
  ])
  const exerciseMap = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  )

  const insights: ProgressInsight[] = []
  for (const [exerciseId, session] of history) {
    const exercise = exerciseMap.get(exerciseId)
    if (!exercise) continue
    const suggestion = suggestProgression(exercise, session.sets, exercises)
    if (!(suggestion.action in ACTION_PRIORITY)) continue

    const working = session.sets.filter((set) => set.completed)
    if (working.length === 0) continue

    insights.push({
      exercise,
      suggestion,
      lastDate: session.date,
      topWeight: Math.max(...working.map((set) => set.weight)),
      bestReps: Math.max(...working.map((set) => set.reps)),
    })
  }

  insights.sort((a, b) => {
    const priority =
      ACTION_PRIORITY[a.suggestion.action] - ACTION_PRIORITY[b.suggestion.action]
    if (priority !== 0) return priority
    return b.lastDate.localeCompare(a.lastDate)
  })

  return insights.slice(0, limit)
}

export interface RecentWorkout {
  workout: Workout
  volume: number
  completedSets: number
  exerciseCount: number
  durationMs: number
}

export async function getRecentWorkouts(limit = 5): Promise<RecentWorkout[]> {
  const workouts = await db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((workout) => workout.status === 'completed')
    .limit(limit)
    .toArray()
  if (workouts.length === 0) return []

  const sets = await db.sets
    .where('workoutId')
    .anyOf(workouts.map((workout) => workout.id))
    .toArray()

  return workouts.map((workout) => {
    const completed = sets.filter(
      (set) => set.workoutId === workout.id && set.completed,
    )
    return {
      workout,
      volume: completed.reduce(
        (total, set) => total + set.weight * set.reps,
        0,
      ),
      completedSets: completed.length,
      exerciseCount: new Set(completed.map((set) => set.exerciseId)).size,
      durationMs: workout.finishedAt
        ? workout.finishedAt - workout.startedAt
        : 0,
    }
  })
}

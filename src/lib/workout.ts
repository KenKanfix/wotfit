import { db } from '../db'
import type {
  Exercise,
  Goal,
  ProgressionSuggestion,
  Workout,
  WorkoutSet,
} from '../types'
import { dateKey } from './format'
import { getExerciseHistoryMap } from './history'
import { newId } from './id'
import { suggestProgression } from './progression'

export async function getActiveWorkout(): Promise<Workout | undefined> {
  return db.workouts.where('status').equals('active').first()
}

export async function startWorkout(goal: Goal): Promise<Workout> {
  const existing = await getActiveWorkout()
  if (existing) return existing

  const workout: Workout = {
    id: newId(),
    date: dateKey(new Date()),
    startedAt: Date.now(),
    status: 'active',
    goal,
  }
  await db.workouts.add(workout)
  return workout
}

export async function buildSuggestion(
  exercise: Exercise,
): Promise<ProgressionSuggestion> {
  const [exercises, history] = await Promise.all([
    db.exercises.toArray(),
    getExerciseHistoryMap(),
  ])
  return suggestProgression(
    exercise,
    history.get(exercise.id)?.sets ?? [],
    exercises,
  )
}

export async function addExerciseToWorkout(
  workoutId: string,
  exercise: Exercise,
  knownSuggestion?: ProgressionSuggestion,
  restSeconds = exercise.defaultRestSeconds,
  completed = false,
): Promise<boolean> {
  const existing = await db.sets
    .where('[workoutId+exerciseId]')
    .equals([workoutId, exercise.id])
    .count()
  if (existing > 0) return false

  const suggestion = knownSuggestion ?? (await buildSuggestion(exercise))
  const now = Date.now()
  const rows: WorkoutSet[] = Array.from(
    { length: Math.max(1, suggestion.targetSets) },
    (_, index) => ({
      id: newId(),
      workoutId,
      exerciseId: exercise.id,
      setNumber: index + 1,
      weight: suggestion.weight,
      reps: suggestion.targetReps,
      completed,
      restSeconds,
      createdAt: now + index,
    }),
  )

  await db.sets.bulkAdd(rows)
  return true
}

export async function addSetToExercise(
  workoutId: string,
  exercise: Exercise,
  restSeconds = exercise.defaultRestSeconds,
  completed = false,
): Promise<void> {
  const sets = await db.sets
    .where('[workoutId+exerciseId]')
    .equals([workoutId, exercise.id])
    .sortBy('setNumber')
  const last = sets[sets.length - 1]
  await db.sets.add({
    id: newId(),
    workoutId,
    exerciseId: exercise.id,
    setNumber: (last?.setNumber ?? sets.length) + 1,
    weight: last?.weight ?? 0,
    reps: last?.reps ?? exercise.repRange[0],
    completed,
    restSeconds,
    createdAt: Date.now(),
  })
}

export async function removeSet(set: WorkoutSet): Promise<void> {
  await db.sets.delete(set.id)
  const remaining = await db.sets
    .where('[workoutId+exerciseId]')
    .equals([set.workoutId, set.exerciseId])
    .sortBy('createdAt')
  await Promise.all(
    remaining.map((item, index) =>
      db.sets.update(item.id, { setNumber: index + 1 }),
    ),
  )
}

export async function removeExercise(
  workoutId: string,
  exerciseId: string,
): Promise<void> {
  await db.sets
    .where('[workoutId+exerciseId]')
    .equals([workoutId, exerciseId])
    .delete()
}

export async function finishWorkout(workoutId: string): Promise<void> {
  const sets = await db.sets.where('workoutId').equals(workoutId).toArray()
  const completed = sets.filter((set) => set.completed)

  if (completed.length === 0) {
    await discardWorkout(workoutId)
    return
  }

  const incompleteIds = sets
    .filter((set) => !set.completed)
    .map((set) => set.id)
  if (incompleteIds.length > 0) await db.sets.bulkDelete(incompleteIds)

  await db.workouts.update(workoutId, {
    status: 'completed',
    finishedAt: Date.now(),
  })
}

export async function discardWorkout(workoutId: string): Promise<void> {
  await db.sets.where('workoutId').equals(workoutId).delete()
  await db.workouts.delete(workoutId)
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  await db.sets.where('workoutId').equals(workoutId).delete()
  await db.workouts.delete(workoutId)
}

import type { Goal, Workout, WorkoutSet } from '../types'

export const DEFAULT_BODY_WEIGHT_KG = 70

const GOAL_MET: Record<Goal, number> = {
  strength: 5,
  hypertrophy: 5.5,
  fat_loss: 6.5,
  endurance: 7,
  calisthenics: 6,
}

type CalorieWorkout = Pick<Workout, 'goal' | 'startedAt' | 'finishedAt'>
type CalorieSet = Pick<WorkoutSet, 'completed'>

export function estimateWorkoutCalories(
  workout: CalorieWorkout,
  sets: CalorieSet[],
  bodyWeightKg: number,
): number {
  const end = workout.finishedAt ?? workout.startedAt
  const minutes = Math.max(0, (end - workout.startedAt) / 60_000)
  if (minutes <= 0 || bodyWeightKg <= 0) return 0

  const completed = sets.reduce(
    (total, set) => total + (set.completed ? 1 : 0),
    0,
  )
  if (completed === 0) return 0

  const setsPerMinute = completed / minutes
  let met = GOAL_MET[workout.goal]
  if (setsPerMinute >= 1.2) met += 0.8
  else if (setsPerMinute >= 0.7) met += 0.3
  else if (setsPerMinute < 0.3) met -= 0.7

  met = Math.min(9, Math.max(2.5, met))
  return Math.round(met * bodyWeightKg * (minutes / 60))
}

export function formatCalories(kcal: number): string {
  if (kcal <= 0) return '—'
  return `~${Math.round(kcal).toLocaleString()} kcal`
}

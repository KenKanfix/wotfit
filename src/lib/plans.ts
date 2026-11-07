import { db } from '../db'
import type { PlanItem } from './recommend'
import { restSecondsFor } from './rest'
import { newId } from './id'
import { addExerciseToWorkout, startWorkout } from './workout'
import type { SavedPlan, Settings, Workout } from '../types'

export async function savePlan(
  name: string,
  settings: Settings,
  items: PlanItem[],
): Promise<SavedPlan> {
  const trimmedName = name.trim().slice(0, 60)
  if (!trimmedName) throw new Error('Plan name is required')

  const plan: SavedPlan = {
    id: newId(),
    name: trimmedName,
    goal: settings.goal,
    level: settings.level,
    createdAt: Date.now(),
    items: items.map(({ exercise, suggestion }) => ({
      exerciseId: exercise.id,
      weight: suggestion.weight,
      targetReps: suggestion.targetReps,
      targetSets: suggestion.targetSets,
      action: suggestion.action,
      restSeconds: restSecondsFor(exercise, settings),
    })),
  }

  await db.savedPlans.add(plan)
  return plan
}

export async function deleteSavedPlan(id: string): Promise<void> {
  await db.savedPlans.delete(id)
}

export async function applySavedPlan(
  plan: SavedPlan,
  active?: Workout,
): Promise<Workout> {
  const workout = active ?? (await startWorkout(plan.goal))
  const exercises = await db.exercises.bulkGet(
    plan.items.map((item) => item.exerciseId),
  )

  for (let index = 0; index < plan.items.length; index += 1) {
    const item = plan.items[index]
    const exercise = exercises[index]
    if (!exercise) continue

    await addExerciseToWorkout(
      workout.id,
      exercise,
      {
        exercise,
        weight: item.weight,
        targetReps: item.targetReps,
        targetSets: item.targetSets,
        action: item.action,
        reason: `Saved plan: ${plan.name}`,
      },
      item.restSeconds,
    )
  }

  return workout
}

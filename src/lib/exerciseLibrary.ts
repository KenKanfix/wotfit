import { db } from '../db'
import type {
  Equipment,
  Exercise,
  ExperienceLevel,
  Goal,
  Movement,
  Muscle,
} from '../types'
import { newId } from './id'

export interface CustomExerciseInput {
  name: string
  movement: Movement
  equipment: Equipment
  primaryMuscles: Muscle[]
  isTimed: boolean
  sets: number
  repRange: [number, number]
  defaultRestSeconds: number
  level: ExperienceLevel
  cues: string
}

export const MOVEMENT_OPTIONS: Movement[] = [
  'push',
  'pull',
  'squat',
  'hinge',
  'lunge',
  'core',
  'carry',
  'isolation',
]

export const MOVEMENT_LABELS: Record<Movement, string> = {
  push: 'Push',
  pull: 'Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Lunge',
  core: 'Core',
  carry: 'Carry',
  isolation: 'Isolation',
}

export const EQUIPMENT_OPTIONS: Equipment[] = [
  'bodyweight',
  'barbell',
  'dumbbell',
  'kettlebell',
  'bands',
  'machine',
  'cable',
]

export const MUSCLE_OPTIONS: Muscle[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
]

export function customExerciseInput(exercise: Exercise): CustomExerciseInput {
  return {
    name: exercise.name,
    movement: exercise.movement,
    equipment: exercise.equipment,
    primaryMuscles: [...exercise.primaryMuscles],
    isTimed: Boolean(exercise.isTimed),
    sets: exercise.sets,
    repRange: [exercise.repRange[0], exercise.repRange[1]],
    defaultRestSeconds: exercise.defaultRestSeconds,
    level: exercise.level,
    cues: exercise.cues ?? '',
  }
}

export function buildCustomExercise(
  input: CustomExerciseInput,
  id = newId(),
  createdAt = Date.now(),
): Exercise {
  const isBodyweight = input.equipment === 'bodyweight'
  const goals: Goal[] = isBodyweight
    ? ['calisthenics', 'strength', 'endurance']
    : input.movement === 'isolation'
      ? ['hypertrophy', 'endurance']
      : ['strength', 'hypertrophy']

  const low = Math.max(0, Math.min(input.repRange[0], input.repRange[1]))
  const high = Math.max(low + 1, input.repRange[1])

  return {
    id,
    name: input.name.trim(),
    movement: input.movement,
    equipment: input.equipment,
    primaryMuscles:
      input.primaryMuscles.length > 0 ? input.primaryMuscles : ['full_body'],
    category: isBodyweight
      ? 'calisthenics'
      : input.movement === 'isolation'
        ? 'isolation'
        : 'compound',
    goals,
    isCalisthenics: isBodyweight ? true : undefined,
    defaultRestSeconds: Math.max(5, Math.round(input.defaultRestSeconds)),
    incrementKg: isBodyweight ? 0 : input.equipment === 'barbell' ? 5 : 2.5,
    repRange: [low, high],
    sets: Math.max(1, Math.round(input.sets)),
    level: input.level,
    isTimed: input.isTimed ? true : undefined,
    cues: input.cues.trim() || undefined,
    isCustom: true,
    createdAt,
  }
}

export async function createCustomExercise(
  input: CustomExerciseInput,
): Promise<Exercise> {
  const exercise = buildCustomExercise(input)
  await db.exercises.add(exercise)
  return exercise
}

export async function updateCustomExercise(
  id: string,
  input: CustomExerciseInput,
): Promise<Exercise | undefined> {
  const existing = await db.exercises.get(id)
  if (!existing) return undefined
  const updated = buildCustomExercise(input, id, existing.createdAt)
  await db.exercises.put(updated)
  return updated
}

export async function deleteCustomExercise(id: string): Promise<void> {
  await db.exercises.delete(id)
}

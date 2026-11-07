import Dexie, { type Table } from 'dexie'
import { EXERCISES } from './data/exercises'
import { DEFAULT_BODY_WEIGHT_KG } from './lib/calories'
import { DEFAULT_REST_SECONDS } from './lib/rest'
import type {
  Exercise,
  SavedPlan,
  Settings,
  Workout,
  WorkoutSet,
} from './types'

export class WorkoutDatabase extends Dexie {
  exercises!: Table<Exercise, string>
  workouts!: Table<Workout, string>
  sets!: Table<WorkoutSet, string>
  settings!: Table<Settings, number>
  savedPlans!: Table<SavedPlan, string>

  constructor() {
    super('reps-workout-tracker')
    this.version(1).stores({
      exercises:
        'id, name, movement, equipment, category, isCalisthenics, progressionGroup',
      workouts: 'id, date, status, startedAt',
      sets: 'id, workoutId, exerciseId, createdAt, [workoutId+exerciseId]',
      settings: 'id',
    })
    this.version(2)
      .stores({
        exercises:
          'id, name, movement, equipment, category, isCalisthenics, progressionGroup',
        workouts: 'id, date, status, startedAt',
        sets: 'id, workoutId, exerciseId, createdAt, [workoutId+exerciseId]',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Settings>('settings')
          .toCollection()
          .modify((settings) => {
            if (settings.bodyWeightKg == null) {
              settings.bodyWeightKg = DEFAULT_BODY_WEIGHT_KG
            }
          })
      })
    this.version(3)
      .stores({
        exercises:
          'id, name, movement, equipment, category, isCalisthenics, progressionGroup',
        workouts: 'id, date, status, startedAt',
        sets: 'id, workoutId, exerciseId, createdAt, [workoutId+exerciseId]',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Settings>('settings')
          .toCollection()
          .modify((settings) => {
            if (settings.voiceCues == null) {
              settings.voiceCues = true
            }
          })
      })
    this.version(4)
      .stores({
        exercises:
          'id, name, movement, equipment, category, isCalisthenics, progressionGroup',
        workouts: 'id, date, status, startedAt',
        sets: 'id, workoutId, exerciseId, createdAt, [workoutId+exerciseId]',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Settings>('settings')
          .toCollection()
          .modify((settings) => {
            if (settings.defaultRestSeconds == null) {
              settings.defaultRestSeconds = DEFAULT_REST_SECONDS
            }
            if (settings.restOverrides == null) {
              settings.restOverrides = {}
            }
          })
      })
    this.version(5)
      .stores({
        exercises:
          'id, name, movement, equipment, category, isCalisthenics, progressionGroup',
        workouts: 'id, date, status, startedAt',
        sets: 'id, workoutId, exerciseId, createdAt, [workoutId+exerciseId]',
        settings: 'id',
        savedPlans: 'id, createdAt, name',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Settings>('settings')
          .toCollection()
          .modify((settings) => {
            if (settings.defaultRestSeconds === 120) {
              settings.defaultRestSeconds = DEFAULT_REST_SECONDS
            }
            if (settings.theme == null) {
              settings.theme = 'dark'
            }
          })
      })
  }
}

export const db = new WorkoutDatabase()

export const DEFAULT_EQUIPMENT: Settings['equipment'] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
  'bands',
  'bodyweight',
]

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  goal: 'strength',
  equipment: DEFAULT_EQUIPMENT,
  level: 1,
  unit: 'kg',
  bodyWeightKg: DEFAULT_BODY_WEIGHT_KG,
  sound: true,
  voiceCues: true,
  defaultRestSeconds: DEFAULT_REST_SECONDS,
  restOverrides: {},
  theme: 'dark',
}

export async function ensureSeed(): Promise<void> {
  await db.exercises.bulkPut(EXERCISES)

  const settings = await db.settings.get(1)
  if (!settings) await db.settings.add(DEFAULT_SETTINGS)
}

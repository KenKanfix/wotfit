export type Goal =
  | 'strength'
  | 'hypertrophy'
  | 'fat_loss'
  | 'endurance'
  | 'calisthenics'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'bands'

export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body'

export type Movement =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'core'
  | 'carry'
  | 'isolation'

export type ExperienceLevel = 1 | 2 | 3

export type Theme = 'dark' | 'light'

export interface Exercise {
  id: string
  name: string
  category: 'compound' | 'isolation' | 'calisthenics'
  movement: Movement
  equipment: Equipment
  primaryMuscles: Muscle[]
  secondaryMuscles?: Muscle[]
  goals: Goal[]
  isCalisthenics?: boolean
  progressionGroup?: string
  progressionLevel?: number
  defaultRestSeconds: number
  incrementKg: number
  repRange: [number, number]
  sets: number
  level: ExperienceLevel
  isTimed?: boolean
  cues?: string
}

export interface Workout {
  id: string
  date: string
  startedAt: number
  finishedAt?: number
  status: 'active' | 'completed'
  goal: Goal
  notes?: string
}

export interface WorkoutSet {
  id: string
  workoutId: string
  exerciseId: string
  setNumber: number
  weight: number
  reps: number
  completed: boolean
  restSeconds: number
  createdAt: number
}

export type HiitMode = 'auto' | 'custom' | 'ladder'

export type HiitRestMode = 'fixed' | 'ratio'

export interface HiitSessionInterval {
  type: 'work' | 'rest'
  duration: number
  exerciseId: string
  exerciseName: string
  round: number
}

export interface HiitSession {
  id: string
  date: string
  startedAt: number
  finishedAt: number
  mode: HiitMode
  workSeconds: number
  restSeconds: number
  restMode: HiitRestMode
  restRatio: number
  ladderSteps?: number
  rounds: number
  totalSeconds: number
  intervals: HiitSessionInterval[]
}

export interface Settings {
  id: number
  goal: Goal
  equipment: Equipment[]
  level: ExperienceLevel
  unit: 'kg' | 'lb'
  bodyWeightKg: number
  sound: boolean
  voiceCues: boolean
  defaultRestSeconds: number
  restOverrides: Record<string, number>
  theme: Theme
}

export type ProgressionAction =
  | 'start'
  | 'increase_weight'
  | 'add_reps'
  | 'progress_variation'
  | 'hold'
  | 'deload'

export interface ProgressionSuggestion {
  exercise: Exercise
  weight: number
  targetReps: number
  targetSets: number
  action: ProgressionAction
  reason: string
  nextExercise?: Exercise
}

export interface SavedPlanItem {
  exerciseId: string
  weight: number
  targetReps: number
  targetSets: number
  action: ProgressionAction
  restSeconds: number
}

export interface SavedPlan {
  id: string
  name: string
  goal: Goal
  level: ExperienceLevel
  createdAt: number
  items: SavedPlanItem[]
}

export interface ExerciseSession {
  workoutId: string
  date: string
  sets: WorkoutSet[]
}

export interface ProgressInsight {
  exercise: Exercise
  suggestion: ProgressionSuggestion
  lastDate: string
  topWeight: number
  bestReps: number
}

export type Tab =
  | 'home'
  | 'workout'
  | 'hiit'
  | 'plan'
  | 'history'
  | 'settings'

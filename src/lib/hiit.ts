import type { Exercise } from '../types'

export type HiitIntervalType = 'work' | 'rest'

export interface HiitInterval {
  type: HiitIntervalType
  duration: number
  exerciseId: string
  exerciseName: string
  round: number
}

export interface HiitProgram {
  intervals: HiitInterval[]
  workSeconds: number
  restSeconds: number
  rounds: number
  totalSeconds: number
}

export const DEFAULT_HIIT_WORK_SECONDS = 40
export const DEFAULT_HIIT_REST_SECONDS = 20
export const DEFAULT_HIIT_TOTAL_MINUTES = 20
export const DEFAULT_HIIT_ROUNDS = 8
export const HIIT_WORK_STEP = 5
export const HIIT_REST_STEP = 5
export const MIN_HIIT_WORK_SECONDS = 10
export const MAX_HIIT_WORK_SECONDS = 180
export const MIN_HIIT_REST_SECONDS = 0
export const MAX_HIIT_REST_SECONDS = 120
export const MIN_HIIT_TOTAL_MINUTES = 1
export const MAX_HIIT_TOTAL_MINUTES = 60
export const MIN_HIIT_ROUNDS = 1
export const MAX_HIIT_ROUNDS = 30

export const DEFAULT_HIIT_EXERCISE_IDS = [
  'bodyweight-squat',
  'push-up',
  'reverse-lunge',
  'plank',
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function emptyProgram(work: number, rest: number): HiitProgram {
  return {
    intervals: [],
    workSeconds: work,
    restSeconds: rest,
    rounds: 0,
    totalSeconds: 0,
  }
}

function buildProgram(
  entries: { exercise: Exercise; round: number }[],
  work: number,
  rest: number,
  rounds: number,
): HiitProgram {
  const intervals: HiitInterval[] = []

  entries.forEach((entry, index) => {
    intervals.push({
      type: 'work',
      duration: work,
      exerciseId: entry.exercise.id,
      exerciseName: entry.exercise.name,
      round: entry.round,
    })

    const next = entries[index + 1]
    if (next && rest > 0) {
      intervals.push({
        type: 'rest',
        duration: rest,
        exerciseId: next.exercise.id,
        exerciseName: next.exercise.name,
        round: next.round,
      })
    }
  })

  return {
    intervals,
    workSeconds: work,
    restSeconds: rest,
    rounds,
    totalSeconds: intervals.reduce(
      (total, interval) => total + interval.duration,
      0,
    ),
  }
}

export function buildAutoHiitProgram(
  exercises: Exercise[],
  totalMinutes: number,
  workSeconds = DEFAULT_HIIT_WORK_SECONDS,
  restSeconds = DEFAULT_HIIT_REST_SECONDS,
): HiitProgram {
  const work = clamp(workSeconds, MIN_HIIT_WORK_SECONDS, MAX_HIIT_WORK_SECONDS)
  const rest = clamp(restSeconds, MIN_HIIT_REST_SECONDS, MAX_HIIT_REST_SECONDS)
  const total =
    clamp(totalMinutes, MIN_HIIT_TOTAL_MINUTES, MAX_HIIT_TOTAL_MINUTES) * 60

  if (exercises.length === 0) return emptyProgram(work, rest)

  const count = Math.max(1, Math.floor((total + rest) / (work + rest)))
  const entries = Array.from({ length: count }, (_, index) => ({
    exercise: exercises[index % exercises.length],
    round: Math.floor(index / exercises.length) + 1,
  }))

  return buildProgram(entries, work, rest, Math.ceil(count / exercises.length))
}

export function buildCustomHiitProgram(
  exercises: Exercise[],
  rounds: number,
  workSeconds = DEFAULT_HIIT_WORK_SECONDS,
  restSeconds = DEFAULT_HIIT_REST_SECONDS,
): HiitProgram {
  const work = clamp(workSeconds, MIN_HIIT_WORK_SECONDS, MAX_HIIT_WORK_SECONDS)
  const rest = clamp(restSeconds, MIN_HIIT_REST_SECONDS, MAX_HIIT_REST_SECONDS)
  const safeRounds = clamp(rounds, MIN_HIIT_ROUNDS, MAX_HIIT_ROUNDS)

  if (exercises.length === 0) return emptyProgram(work, rest)

  const entries: { exercise: Exercise; round: number }[] = []
  for (let round = 1; round <= safeRounds; round += 1) {
    for (const exercise of exercises) {
      entries.push({ exercise, round })
    }
  }

  return buildProgram(entries, work, rest, safeRounds)
}

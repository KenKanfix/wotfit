import type { Exercise, HiitMode, HiitRestMode } from '../types'

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
  mode: HiitMode
  workSeconds: number
  restSeconds: number
  restMode: HiitRestMode
  restRatio: number
  ladderSteps?: number
  rounds: number
  totalSeconds: number
}

export const HIIT_COUNTDOWN_SECONDS = 10
export const DEFAULT_HIIT_WORK_SECONDS = 40
export const DEFAULT_HIIT_REST_SECONDS = 20
export const DEFAULT_HIIT_TOTAL_MINUTES = 20
export const DEFAULT_HIIT_ROUNDS = 8
export const DEFAULT_HIIT_LADDER_RATIO = 6
export const HIIT_WORK_STEP = 5
export const HIIT_REST_STEP = 5
export const HIIT_LADDER_RATIO_STEP = 1
export const MIN_HIIT_WORK_SECONDS = 10
export const MAX_HIIT_WORK_SECONDS = 180
export const MIN_HIIT_REST_SECONDS = 0
export const MAX_HIIT_REST_SECONDS = 120
export const MIN_HIIT_TOTAL_MINUTES = 1
export const MAX_HIIT_TOTAL_MINUTES = 60
export const MIN_HIIT_ROUNDS = 1
export const MAX_HIIT_ROUNDS = 30
export const MIN_HIIT_LADDER_RATIO = 1
export const MAX_HIIT_LADDER_RATIO = 6

export const DEFAULT_HIIT_EXERCISE_IDS = [
  'bodyweight-squat',
  'push-up',
  'reverse-lunge',
  'plank',
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

interface ProgramEntry {
  exercise: Exercise
  round: number
  restAfter?: number
}

interface ProgramMeta {
  mode: HiitMode
  restMode: HiitRestMode
  restRatio: number
  ladderSteps?: number
}

function emptyProgram(
  work: number,
  rest: number,
  mode: HiitMode = 'custom',
  restMode: HiitRestMode = 'fixed',
  restRatio = 1,
  ladderSteps?: number,
): HiitProgram {
  return {
    intervals: [],
    mode,
    workSeconds: work,
    restSeconds: rest,
    restMode,
    restRatio,
    ladderSteps,
    rounds: 0,
    totalSeconds: 0,
  }
}

function buildProgram(
  entries: ProgramEntry[],
  work: number,
  rest: number,
  rounds: number,
  meta: ProgramMeta,
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
    const restDuration = entry.restAfter ?? rest
    if (restDuration > 0 && (next || entry.restAfter !== undefined)) {
      intervals.push({
        type: 'rest',
        duration: restDuration,
        exerciseId: next?.exercise.id ?? entry.exercise.id,
        exerciseName: next?.exercise.name ?? entry.exercise.name,
        round: next?.round ?? entry.round,
      })
    }
  })

  return {
    intervals,
    ...meta,
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

  if (exercises.length === 0) return emptyProgram(work, rest, 'auto')

  const count = Math.max(1, Math.floor((total + rest) / (work + rest)))
  const entries = Array.from({ length: count }, (_, index) => ({
    exercise: exercises[index % exercises.length],
    round: Math.floor(index / exercises.length) + 1,
  }))

  return buildProgram(entries, work, rest, Math.ceil(count / exercises.length), {
    mode: 'auto',
    restMode: 'fixed',
    restRatio: 1,
  })
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

  if (exercises.length === 0) return emptyProgram(work, rest, 'custom')

  const entries: ProgramEntry[] = []
  for (let round = 1; round <= safeRounds; round += 1) {
    for (const exercise of exercises) {
      entries.push({ exercise, round })
    }
  }

  return buildProgram(entries, work, rest, safeRounds, {
    mode: 'custom',
    restMode: 'fixed',
    restRatio: 1,
  })
}

export function buildLadderHiitProgram(
  exercises: Exercise[],
  workSeconds = DEFAULT_HIIT_WORK_SECONDS,
  restMode: HiitRestMode = 'fixed',
  restSeconds = DEFAULT_HIIT_REST_SECONDS,
  restRatio = DEFAULT_HIIT_LADDER_RATIO,
): HiitProgram {
  const work = clamp(workSeconds, MIN_HIIT_WORK_SECONDS, MAX_HIIT_WORK_SECONDS)
  const rest = clamp(restSeconds, MIN_HIIT_REST_SECONDS, MAX_HIIT_REST_SECONDS)
  const ratio = clamp(
    restRatio,
    MIN_HIIT_LADDER_RATIO,
    MAX_HIIT_LADDER_RATIO,
  )

  if (exercises.length === 0) {
    return emptyProgram(work, rest, 'ladder', restMode, ratio, 0)
  }

  const rungs: Exercise[][] = []
  for (let size = 1; size <= exercises.length; size += 1) {
    rungs.push(exercises.slice(0, size))
  }
  for (let size = exercises.length - 1; size >= 1; size -= 1) {
    rungs.push(exercises.slice(exercises.length - size))
  }

  const entries: ProgramEntry[] = []
  rungs.forEach((rung, index) => {
    const round = index + 1
    const restAfter =
      restMode === 'fixed'
        ? rest
        : Math.max(1, Math.round((rung.length * work) / ratio))

    rung.forEach((exercise, exerciseIndex) => {
      entries.push({
        exercise,
        round,
        restAfter: exerciseIndex === rung.length - 1 ? restAfter : 0,
      })
    })
  })

  return buildProgram(entries, work, rest, rungs.length, {
    mode: 'ladder',
    restMode,
    restRatio: ratio,
    ladderSteps: exercises.length,
  })
}

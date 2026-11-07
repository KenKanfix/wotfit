import type {
  Equipment,
  Exercise,
  ExerciseSession,
  Goal,
  Movement,
  ProgressionSuggestion,
  Settings,
} from '../types'
import { suggestProgression } from './progression'

export interface PlanItem {
  exercise: Exercise
  suggestion: ProgressionSuggestion
  progressedFrom?: Exercise
}

const PATTERNS: Record<Goal, Movement[]> = {
  strength: ['squat', 'hinge', 'push', 'pull', 'core'],
  hypertrophy: [
    'push',
    'pull',
    'squat',
    'hinge',
    'isolation',
    'isolation',
    'core',
  ],
  fat_loss: ['squat', 'hinge', 'push', 'pull', 'core', 'carry'],
  endurance: ['squat', 'push', 'pull', 'lunge', 'core', 'carry'],
  calisthenics: ['push', 'pull', 'squat', 'lunge', 'core'],
}

export const GOAL_LABELS: Record<Goal, string> = {
  strength: 'Strength',
  hypertrophy: 'Muscle',
  fat_loss: 'Fat loss',
  endurance: 'Endurance',
  calisthenics: 'Calisthenics',
}

export const GOAL_DESCRIPTIONS: Record<Goal, string> = {
  strength: 'Heavy compounds, low reps, long rests',
  hypertrophy: 'Moderate reps, high volume, isolation work',
  fat_loss: 'Full-body circuits, minimal rest, carries',
  endurance: 'Higher reps, bodyweight and conditioning',
  calisthenics: 'Bodyweight progressions you can do anywhere',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  machine: 'Machines',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  bands: 'Bands',
}

export const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  full_body: 'Full body',
}

function hash(input: string): number {
  let value = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return (value >>> 0) / 4294967295
}

function daysSince(date: string): number {
  const then = new Date(`${date}T00:00:00`).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.max(0, Math.round((today - then) / 86_400_000))
}

function isAvailable(exercise: Exercise, settings: Settings): boolean {
  if (exercise.equipment === 'bodyweight') return true
  if (
    settings.goal === 'calisthenics' &&
    !exercise.isCalisthenics &&
    exercise.equipment !== 'bands'
  ) {
    return false
  }
  return settings.equipment.includes(exercise.equipment)
}

interface GroupTarget {
  level: number
  confident: boolean
}

function groupTargets(
  exercises: Exercise[],
  history: Map<string, ExerciseSession>,
): Map<string, GroupTarget> {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const targets = new Map<string, GroupTarget>()

  for (const [exerciseId, session] of history) {
    const exercise = byId.get(exerciseId)
    if (!exercise?.progressionGroup) continue
    const suggestion = suggestProgression(exercise, session.sets, exercises)
    const currentLevel = exercise.progressionLevel ?? 1
    const level =
      suggestion.action === 'progress_variation' ? currentLevel + 1 : currentLevel
    const previous = targets.get(exercise.progressionGroup)
    if (!previous || level >= previous.level) {
      targets.set(exercise.progressionGroup, {
        level,
        confident:
          suggestion.action === 'increase_weight' ||
          suggestion.action === 'progress_variation' ||
          suggestion.action === 'add_reps',
      })
    }
  }

  return targets
}

function scoreExercise(
  exercise: Exercise,
  settings: Settings,
  history: Map<string, ExerciseSession>,
  targets: Map<string, GroupTarget>,
  usedMuscles: Set<string>,
  seed: number,
): number {
  if (!isAvailable(exercise, settings)) return Number.NEGATIVE_INFINITY

  let score = 0
  if (exercise.goals.includes(settings.goal)) score += 12

  if (settings.goal === 'calisthenics') {
    if (exercise.equipment === 'bodyweight' || exercise.isCalisthenics) score += 10
    if (exercise.equipment === 'bands') score += 2
  }
  if (settings.goal === 'strength') {
    if (exercise.category === 'isolation') score -= 5
    if (exercise.movement === 'carry') score -= 3
  }
  if (settings.goal === 'hypertrophy') {
    if (exercise.category === 'compound') score += 2
  }
  if (
    settings.goal === 'fat_loss' &&
    (exercise.movement === 'carry' ||
      exercise.equipment === 'kettlebell' ||
      exercise.isCalisthenics)
  ) {
    score += 3
  }
  if (settings.goal === 'endurance' && exercise.isCalisthenics) score += 3

  const levelGap = exercise.level - settings.level
  score += levelGap <= 0 ? 3 - Math.abs(levelGap) : -6 * levelGap

  const groupTarget = exercise.progressionGroup
    ? targets.get(exercise.progressionGroup)
    : undefined
  if (groupTarget && exercise.progressionLevel) {
    const gap = exercise.progressionLevel - groupTarget.level
    if (gap === 0) score += groupTarget.confident ? 8 : 5
    else if (gap < 0) score += 1
    else score -= gap * 8
  }

  const session = history.get(exercise.id)
  if (session) {
    const days = daysSince(session.date)
    if (days <= 1) score -= 10
    else if (days <= 3) score -= 4
    else if (days >= 7) score += 2
  }

  if (exercise.primaryMuscles.some((muscle) => usedMuscles.has(muscle))) {
    score -= 4
  }

  score += hash(`${exercise.id}:${seed}`) * 2
  return score
}

export function buildSessionPlan(
  exercises: Exercise[],
  settings: Settings,
  history: Map<string, ExerciseSession>,
  seed = 0,
): PlanItem[] {
  const targets = groupTargets(exercises, history)
  const usedIds = new Set<string>()
  const usedMuscles = new Set<string>()
  const items: PlanItem[] = []

  for (const pattern of PATTERNS[settings.goal]) {
    const candidates = exercises.filter((exercise) => {
      if (usedIds.has(exercise.id)) return false
      if (pattern === 'isolation') return exercise.category === 'isolation'
      return exercise.movement === pattern && exercise.category !== 'isolation'
    })

    const ranked = candidates
      .map((exercise) => ({
        exercise,
        score: scoreExercise(
          exercise,
          settings,
          history,
          targets,
          usedMuscles,
          seed,
        ),
      }))
      .filter((candidate) => Number.isFinite(candidate.score))
      .sort((a, b) => b.score - a.score)

    const best = ranked[0]?.exercise
    if (!best) continue

    usedIds.add(best.id)
    best.primaryMuscles.forEach((muscle) => usedMuscles.add(muscle))

    const suggestion = suggestProgression(
      best,
      history.get(best.id)?.sets ?? [],
      exercises,
    )

    if (suggestion.action === 'progress_variation' && suggestion.nextExercise) {
      const next = suggestion.nextExercise
      items.push({
        exercise: next,
        progressedFrom: best,
        suggestion: {
          exercise: next,
          weight: 0,
          targetReps: next.repRange[0],
          targetSets: next.sets,
          action: 'progress_variation',
          reason: `You have mastered ${best.name} — step up to ${next.name}.`,
        },
      })
      usedIds.add(next.id)
    } else {
      items.push({ exercise: best, suggestion })
    }
  }

  return items
}

export function recommendationReason(goal: Goal): string {
  return `Matched to your ${GOAL_LABELS[goal].toLowerCase()} goal, equipment and recent training.`
}

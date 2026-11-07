import type {
  Exercise,
  ProgressionAction,
  ProgressionSuggestion,
  WorkoutSet,
} from '../types'

export function roundWeight(value: number): number {
  return Math.round(value * 100) / 100
}

function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return roundWeight(value)
  return roundWeight(Math.max(increment, Math.round(value / increment) * increment))
}

export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return roundWeight(weight * (1 + reps / 30))
}

export function setVolume(set: Pick<WorkoutSet, 'weight' | 'reps'>): number {
  return set.weight * set.reps
}

export function workoutVolume(sets: WorkoutSet[]): number {
  return sets
    .filter((set) => set.completed)
    .reduce((total, set) => total + setVolume(set), 0)
}

export function suggestProgression(
  exercise: Exercise,
  lastSets: WorkoutSet[],
  allExercises: Exercise[],
): ProgressionSuggestion {
  const working = lastSets
    .filter((set) => set.completed && set.reps > 0)
    .sort((a, b) => a.setNumber - b.setNumber)
  const [low, high] = exercise.repRange
  const targetSets = exercise.sets

  if (working.length === 0) {
    return {
      exercise,
      weight: 0,
      targetReps: low,
      targetSets,
      action: 'start',
      reason: 'First session with this movement — choose a load you can control.',
    }
  }

  const topWeight = Math.max(...working.map((set) => set.weight))
  const minReps = Math.min(...working.map((set) => set.reps))
  const isBodyweightLoad = exercise.isCalisthenics && topWeight === 0
  const hitTopRange = minReps >= high
  const completedAllSets = working.length >= targetSets
  const lastSummary = `${working.length}×${minReps}${topWeight > 0 ? ` @ ${topWeight} kg` : ''}`

  if (
    exercise.isCalisthenics &&
    exercise.progressionGroup &&
    hitTopRange &&
    completedAllSets
  ) {
    const next = allExercises.find(
      (candidate) =>
        candidate.progressionGroup === exercise.progressionGroup &&
        candidate.progressionLevel === (exercise.progressionLevel ?? 0) + 1,
    )
    if (next) {
      return {
        exercise,
        weight: 0,
        targetReps: next.repRange[0],
        targetSets: next.sets,
        action: 'progress_variation',
        reason: `All sets hit ${high}+ reps — you have earned the next variation.`,
        nextExercise: next,
      }
    }
  }

  if (isBodyweightLoad && hitTopRange && completedAllSets) {
    if (exercise.incrementKg > 0) {
      return {
        exercise,
        weight: exercise.incrementKg,
        targetReps: low,
        targetSets,
        action: 'increase_weight',
        reason: `All sets hit ${high}+ reps — add load to keep progressing.`,
      }
    }
    return {
      exercise,
      weight: 0,
      targetReps: minReps + 1,
      targetSets: Math.max(targetSets, working.length),
      action: 'add_reps',
      reason: `Top of the range reached — push past ${high} reps or slow the tempo.`,
    }
  }

  if (!completedAllSets && working.length < targetSets) {
    return {
      exercise,
      weight: topWeight,
      targetReps: hitTopRange ? high : Math.max(low, minReps),
      targetSets,
      action: 'hold',
      reason: `Only ${working.length} of ${targetSets} sets completed — finish the volume at this load.`,
    }
  }

  if (hitTopRange) {
    if (exercise.incrementKg <= 0) {
      return {
        exercise,
        weight: topWeight,
        targetReps: minReps + 1,
        targetSets,
        action: 'add_reps',
        reason: 'Top of the range reached — add reps or reps at a slower tempo.',
      }
    }
    return {
      exercise,
      weight: roundToIncrement(topWeight + exercise.incrementKg, exercise.incrementKg),
      targetReps: low,
      targetSets,
      action: 'increase_weight',
      reason: `You hit the top of your ${low}–${high} rep range on every set — add load.`,
    }
  }

  if (minReps < low) {
    const deload = roundToIncrement(
      topWeight > 0 ? topWeight * 0.9 : 0,
      exercise.incrementKg,
    )
    return {
      exercise,
      weight: Math.min(deload, topWeight),
      targetReps: low,
      targetSets,
      action: 'deload',
      reason: `Last session (${lastSummary}) fell below the ${low} rep floor — deload and rebuild.`,
    }
  }

  return {
    exercise,
    weight: topWeight,
    targetReps: Math.min(high, minReps + 1),
    targetSets,
    action: 'add_reps',
    reason: `Last session: ${lastSummary} — keep the load and add a rep.`,
  }
}

const ACTION_LABELS: Record<ProgressionAction, string> = {
  start: 'Start here',
  increase_weight: 'Add load',
  add_reps: 'Add reps',
  progress_variation: 'Level up',
  hold: 'Repeat',
  deload: 'Deload',
}

export function actionLabel(action: ProgressionAction): string {
  return ACTION_LABELS[action]
}

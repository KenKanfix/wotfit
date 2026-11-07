import type { Exercise, Settings } from '../types'

export const DEFAULT_REST_SECONDS = 20
export const REST_STEP_SECONDS = 5
export const MIN_REST_SECONDS = 5
export const MAX_REST_SECONDS = 600

export function clampRestSeconds(seconds: number): number {
  return Math.min(
    MAX_REST_SECONDS,
    Math.max(MIN_REST_SECONDS, Math.round(seconds)),
  )
}

export function restSecondsFor(exercise: Exercise, settings: Settings): number {
  return (
    settings.restOverrides?.[exercise.id] ??
    settings.defaultRestSeconds ??
    DEFAULT_REST_SECONDS
  )
}

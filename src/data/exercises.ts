import type {
  Equipment,
  Exercise,
  Goal,
  Movement,
  Muscle,
} from '../types'
import { TECHNIQUE_CUES } from './cues'

type SeedOverrides = Partial<
  Omit<Exercise, 'id' | 'name' | 'movement' | 'equipment' | 'primaryMuscles'>
>

function ex(
  id: string,
  name: string,
  movement: Movement,
  equipment: Equipment,
  primaryMuscles: Muscle[],
  overrides: SeedOverrides = {},
): Exercise {
  const isBodyweight = equipment === 'bodyweight'
  const baseGoals: Goal[] = isBodyweight
    ? ['calisthenics', 'strength', 'endurance']
    : movement === 'isolation'
      ? ['hypertrophy', 'endurance']
      : ['strength', 'hypertrophy']

  return {
    id,
    name,
    movement,
    equipment,
    primaryMuscles,
    category: isBodyweight
      ? 'calisthenics'
      : movement === 'isolation'
        ? 'isolation'
        : 'compound',
    goals: baseGoals,
    isCalisthenics: isBodyweight ? true : undefined,
    defaultRestSeconds:
      movement === 'isolation' ? 90 : movement === 'core' ? 75 : 150,
    incrementKg: equipment === 'barbell' ? 5 : 2.5,
    repRange: movement === 'isolation' ? [8, 12] : [5, 8],
    sets: 3,
    level: 1,
    cues: TECHNIQUE_CUES[id],
    ...overrides,
  }
}

export const EXERCISES: Exercise[] = [
  // ── Barbell ────────────────────────────────────────────────────────────────
  ex('barbell-back-squat', 'Barbell back squat', 'squat', 'barbell', [
    'quads',
    'glutes',
  ], {
    secondaryMuscles: ['core', 'hamstrings'],
    defaultRestSeconds: 180,
    repRange: [5, 8],
    cues: 'Brace hard, break at hips and knees together, drive through mid-foot.',
  }),
  ex('barbell-front-squat', 'Barbell front squat', 'squat', 'barbell', [
    'quads',
    'glutes',
  ], {
    level: 2,
    secondaryMuscles: ['core'],
    defaultRestSeconds: 180,
    repRange: [5, 8],
    cues: 'Elbows high, upright torso, let the bar rest on your front delts.',
  }),
  ex('barbell-deadlift', 'Barbell deadlift', 'hinge', 'barbell', [
    'hamstrings',
    'glutes',
    'back',
  ], {
    level: 2,
    secondaryMuscles: ['core'],
    defaultRestSeconds: 210,
    repRange: [3, 5],
    cues: 'Wedge into the bar, pull the slack out, keep the bar against your legs.',
  }),
  ex('barbell-romanian-deadlift', 'Romanian deadlift', 'hinge', 'barbell', [
    'hamstrings',
    'glutes',
  ], {
    secondaryMuscles: ['back'],
    defaultRestSeconds: 150,
    repRange: [6, 10],
    cues: 'Push hips back, soft knees, stop when hamstrings are fully loaded.',
  }),
  ex('barbell-bench-press', 'Barbell bench press', 'push', 'barbell', [
    'chest',
    'triceps',
    'shoulders',
  ], {
    defaultRestSeconds: 180,
    incrementKg: 2.5,
    repRange: [5, 8],
    cues: 'Shoulder blades pinned back, bar to lower chest, press up and back.',
  }),
  ex('incline-barbell-bench', 'Incline bench press', 'push', 'barbell', [
    'chest',
    'shoulders',
    'triceps',
  ], {
    level: 2,
    defaultRestSeconds: 150,
    incrementKg: 2.5,
    repRange: [6, 10],
  }),
  ex('barbell-overhead-press', 'Overhead press', 'push', 'barbell', [
    'shoulders',
    'triceps',
  ], {
    secondaryMuscles: ['core'],
    defaultRestSeconds: 150,
    incrementKg: 2.5,
    repRange: [5, 8],
    cues: 'Squeeze glutes, move head back, press the bar to a full lockout.',
  }),
  ex('barbell-row', 'Barbell row', 'pull', 'barbell', ['back', 'biceps'], {
    defaultRestSeconds: 150,
    incrementKg: 2.5,
    repRange: [6, 10],
    cues: 'Hinge to 45°, pull to your lower ribs, control the eccentric.',
  }),
  ex('barbell-hip-thrust', 'Barbell hip thrust', 'hinge', 'barbell', [
    'glutes',
    'hamstrings',
  ], {
    defaultRestSeconds: 120,
    repRange: [8, 12],
    cues: 'Chin tucked, ribs down, squeeze glutes hard at the top.',
  }),
  ex('barbell-curl', 'Barbell curl', 'isolation', 'barbell', ['biceps'], {
    incrementKg: 2.5,
  }),

  // ── Dumbbell ───────────────────────────────────────────────────────────────
  ex('dumbbell-bench-press', 'Dumbbell bench press', 'push', 'dumbbell', [
    'chest',
    'triceps',
  ], {
    repRange: [8, 12],
    cues: 'Lower until your upper arms are level with the bench.',
  }),
  ex('dumbbell-incline-press', 'Incline dumbbell press', 'push', 'dumbbell', [
    'chest',
    'shoulders',
  ], {
    repRange: [8, 12],
  }),
  ex('dumbbell-shoulder-press', 'Dumbbell shoulder press', 'push', 'dumbbell', [
    'shoulders',
    'triceps',
  ], {
    repRange: [8, 12],
  }),
  ex('dumbbell-lateral-raise', 'Lateral raise', 'isolation', 'dumbbell', [
    'shoulders',
  ], {
    incrementKg: 1,
    repRange: [12, 15],
    cues: 'Lead with elbows, stop at shoulder height, no swinging.',
  }),
  ex('dumbbell-row', 'Single-arm dumbbell row', 'pull', 'dumbbell', [
    'back',
    'biceps',
  ], {
    repRange: [8, 12],
  }),
  ex('dumbbell-curl', 'Dumbbell curl', 'isolation', 'dumbbell', ['biceps'], {
    incrementKg: 1,
  }),
  ex('hammer-curl', 'Hammer curl', 'isolation', 'dumbbell', [
    'biceps',
    'shoulders',
  ], {
    incrementKg: 1,
  }),
  ex('dumbbell-triceps-extension', 'Overhead triceps extension', 'isolation', 'dumbbell', [
    'triceps',
  ]),
  ex('dumbbell-goblet-squat', 'Goblet squat', 'squat', 'dumbbell', [
    'quads',
    'glutes',
  ], {
    repRange: [8, 12],
    cues: 'Elbows inside your knees at the bottom, chest tall.',
  }),
  ex('dumbbell-bulgarian-split-squat', 'Bulgarian split squat', 'lunge', 'dumbbell', [
    'quads',
    'glutes',
  ], {
    level: 2,
    repRange: [8, 12],
  }),
  ex('dumbbell-rdl', 'Dumbbell Romanian deadlift', 'hinge', 'dumbbell', [
    'hamstrings',
    'glutes',
  ], {
    repRange: [8, 12],
  }),

  // ── Machines & cable ───────────────────────────────────────────────────────
  ex('leg-press', 'Leg press', 'squat', 'machine', ['quads', 'glutes'], {
    repRange: [8, 12],
  }),
  ex('leg-curl', 'Leg curl', 'isolation', 'machine', ['hamstrings']),
  ex('leg-extension', 'Leg extension', 'isolation', 'machine', ['quads']),
  ex('calf-raise', 'Calf raise', 'isolation', 'machine', ['calves'], {
    repRange: [10, 15],
  }),
  ex('lat-pulldown', 'Lat pulldown', 'pull', 'machine', ['back', 'biceps'], {
    repRange: [8, 12],
  }),
  ex('seated-cable-row', 'Seated cable row', 'pull', 'cable', ['back', 'biceps'], {
    repRange: [8, 12],
  }),
  ex('cable-triceps-pushdown', 'Triceps pushdown', 'isolation', 'cable', [
    'triceps',
  ]),
  ex('cable-crunch', 'Cable crunch', 'core', 'cable', ['core'], {
    repRange: [10, 15],
  }),

  // ── Kettlebell ─────────────────────────────────────────────────────────────
  ex('kettlebell-swing', 'Kettlebell swing', 'hinge', 'kettlebell', [
    'hamstrings',
    'glutes',
    'core',
  ], {
    goals: ['fat_loss', 'endurance', 'strength'],
    defaultRestSeconds: 75,
    incrementKg: 4,
    repRange: [12, 20],
    cues: 'Snap the hips, float the bell, keep the arms relaxed.',
  }),
  ex('farmer-carry', 'Farmer carry', 'carry', 'dumbbell', [
    'core',
    'full_body',
  ], {
    goals: ['fat_loss', 'endurance', 'strength'],
    defaultRestSeconds: 90,
    incrementKg: 4,
    repRange: [30, 60],
    isTimed: true,
    cues: 'Walk tall, ribs stacked over hips, no leaning.',
  }),

  // ── Calisthenics: push-up progression ──────────────────────────────────────
  ex('wall-push-up', 'Wall push-up', 'push', 'bodyweight', [
    'chest',
    'triceps',
  ], {
    progressionGroup: 'push-up',
    progressionLevel: 1,
    level: 1,
    defaultRestSeconds: 60,
    repRange: [10, 20],
    incrementKg: 0,
    cues: 'Hands at shoulder height, body in one line, control the descent.',
  }),
  ex('incline-push-up', 'Incline push-up', 'push', 'bodyweight', [
    'chest',
    'triceps',
  ], {
    progressionGroup: 'push-up',
    progressionLevel: 2,
    level: 1,
    defaultRestSeconds: 60,
    repRange: [10, 20],
    incrementKg: 0,
  }),
  ex('knee-push-up', 'Knee push-up', 'push', 'bodyweight', [
    'chest',
    'triceps',
  ], {
    progressionGroup: 'push-up',
    progressionLevel: 3,
    level: 1,
    defaultRestSeconds: 75,
    repRange: [10, 15],
    incrementKg: 0,
  }),
  ex('push-up', 'Push-up', 'push', 'bodyweight', ['chest', 'triceps'], {
    progressionGroup: 'push-up',
    progressionLevel: 4,
    level: 1,
    defaultRestSeconds: 90,
    repRange: [8, 15],
    incrementKg: 0,
    cues: 'Screw hands into the floor, elbows at 45°, full lockout.',
  }),
  ex('decline-push-up', 'Decline push-up', 'push', 'bodyweight', [
    'chest',
    'shoulders',
  ], {
    progressionGroup: 'push-up',
    progressionLevel: 5,
    level: 2,
    defaultRestSeconds: 90,
    repRange: [8, 12],
    incrementKg: 0,
  }),
  ex('archer-push-up', 'Archer push-up', 'push', 'bodyweight', [
    'chest',
    'triceps',
  ], {
    progressionGroup: 'push-up',
    progressionLevel: 6,
    level: 3,
    defaultRestSeconds: 120,
    repRange: [5, 10],
    incrementKg: 0,
  }),
  ex('one-arm-push-up', 'One-arm push-up', 'push', 'bodyweight', [
    'chest',
    'triceps',
    'core',
  ], {
    progressionGroup: 'push-up',
    progressionLevel: 7,
    level: 3,
    defaultRestSeconds: 120,
    repRange: [3, 8],
    incrementKg: 0,
  }),

  // ── Calisthenics: pull-up progression ──────────────────────────────────────
  ex('dead-hang', 'Dead hang', 'pull', 'bodyweight', ['back'], {
    progressionGroup: 'pull-up',
    progressionLevel: 1,
    category: 'calisthenics',
    defaultRestSeconds: 60,
    repRange: [20, 45],
    incrementKg: 0,
    isTimed: true,
    cues: 'Shoulders active, ribs down, breathe. Track seconds as reps.',
  }),
  ex('scapular-pull-up', 'Scapular pull-up', 'pull', 'bodyweight', ['back'], {
    progressionGroup: 'pull-up',
    progressionLevel: 2,
    defaultRestSeconds: 60,
    repRange: [8, 12],
    incrementKg: 0,
  }),
  ex('negative-pull-up', 'Negative pull-up', 'pull', 'bodyweight', [
    'back',
    'biceps',
  ], {
    progressionGroup: 'pull-up',
    progressionLevel: 3,
    defaultRestSeconds: 90,
    repRange: [3, 6],
    incrementKg: 0,
    cues: 'Jump to the top and lower for 3–5 seconds under control.',
  }),
  ex('band-assisted-pull-up', 'Band-assisted pull-up', 'pull', 'bands', [
    'back',
    'biceps',
  ], {
    progressionGroup: 'pull-up',
    progressionLevel: 4,
    isCalisthenics: true,
    defaultRestSeconds: 90,
    repRange: [5, 10],
    incrementKg: 0,
  }),
  ex('pull-up', 'Pull-up', 'pull', 'bodyweight', ['back', 'biceps'], {
    progressionGroup: 'pull-up',
    progressionLevel: 5,
    level: 2,
    defaultRestSeconds: 120,
    repRange: [5, 10],
    incrementKg: 2.5,
    cues: 'Start from a dead hang, pull elbows to ribs, chin over bar.',
  }),
  ex('weighted-pull-up', 'Weighted pull-up', 'pull', 'bodyweight', [
    'back',
    'biceps',
  ], {
    progressionGroup: 'pull-up',
    progressionLevel: 6,
    level: 2,
    defaultRestSeconds: 150,
    repRange: [4, 8],
    incrementKg: 2.5,
    cues: 'Add load with a belt or vest once you own 8+ clean reps.',
  }),

  // ── Calisthenics: squat progression ────────────────────────────────────────
  ex('assisted-squat', 'Assisted squat', 'squat', 'bodyweight', [
    'quads',
    'glutes',
  ], {
    progressionGroup: 'bodyweight-squat',
    progressionLevel: 1,
    defaultRestSeconds: 60,
    repRange: [10, 20],
    incrementKg: 0,
    cues: 'Hold a doorframe or TRX for balance as you build depth.',
  }),
  ex('bodyweight-squat', 'Bodyweight squat', 'squat', 'bodyweight', [
    'quads',
    'glutes',
  ], {
    progressionGroup: 'bodyweight-squat',
    progressionLevel: 2,
    defaultRestSeconds: 75,
    repRange: [15, 25],
    incrementKg: 0,
  }),
  ex('reverse-lunge', 'Reverse lunge', 'lunge', 'bodyweight', [
    'quads',
    'glutes',
  ], {
    progressionGroup: 'bodyweight-squat',
    progressionLevel: 3,
    defaultRestSeconds: 75,
    repRange: [8, 15],
    incrementKg: 0,
  }),
  ex('bodyweight-bulgarian-split-squat', 'Bulgarian split squat (BW)', 'lunge', 'bodyweight', [
    'quads',
    'glutes',
  ], {
    progressionGroup: 'bodyweight-squat',
    progressionLevel: 4,
    level: 2,
    defaultRestSeconds: 90,
    repRange: [6, 12],
    incrementKg: 0,
  }),
  ex('pistol-squat', 'Pistol squat', 'squat', 'bodyweight', [
    'quads',
    'glutes',
    'core',
  ], {
    progressionGroup: 'bodyweight-squat',
    progressionLevel: 5,
    level: 3,
    defaultRestSeconds: 120,
    repRange: [3, 8],
    incrementKg: 0,
  }),
  ex('shrimp-squat', 'Shrimp squat', 'squat', 'bodyweight', [
    'quads',
    'glutes',
    'core',
  ], {
    progressionGroup: 'bodyweight-squat',
    progressionLevel: 6,
    level: 3,
    defaultRestSeconds: 120,
    repRange: [3, 8],
    incrementKg: 0,
  }),

  // ── Calisthenics: dips ─────────────────────────────────────────────────────
  ex('bench-dip', 'Bench dip', 'push', 'bodyweight', ['triceps', 'chest'], {
    progressionGroup: 'dip',
    progressionLevel: 1,
    defaultRestSeconds: 60,
    repRange: [8, 15],
    incrementKg: 0,
  }),
  ex('parallel-bar-dip', 'Parallel bar dip', 'push', 'bodyweight', [
    'chest',
    'triceps',
  ], {
    progressionGroup: 'dip',
    progressionLevel: 2,
    level: 2,
    defaultRestSeconds: 120,
    repRange: [5, 12],
    incrementKg: 2.5,
  }),
  ex('ring-dip', 'Ring dip', 'push', 'bodyweight', ['chest', 'triceps'], {
    progressionGroup: 'dip',
    progressionLevel: 3,
    level: 3,
    defaultRestSeconds: 120,
    repRange: [4, 10],
    incrementKg: 2.5,
  }),

  // ── Calisthenics: core ─────────────────────────────────────────────────────
  ex('plank', 'Plank', 'core', 'bodyweight', ['core'], {
    progressionGroup: 'core',
    progressionLevel: 1,
    category: 'calisthenics',
    defaultRestSeconds: 60,
    repRange: [30, 60],
    incrementKg: 0,
    isTimed: true,
    cues: 'Squeeze glutes and quads, pull ribs down. Track seconds as reps.',
  }),
  ex('hollow-body-hold', 'Hollow body hold', 'core', 'bodyweight', ['core'], {
    progressionGroup: 'core',
    progressionLevel: 2,
    category: 'calisthenics',
    defaultRestSeconds: 60,
    repRange: [20, 45],
    incrementKg: 0,
    isTimed: true,
  }),
  ex('hanging-knee-raise', 'Hanging knee raise', 'core', 'bodyweight', [
    'core',
  ], {
    progressionGroup: 'core',
    progressionLevel: 3,
    level: 2,
    defaultRestSeconds: 75,
    repRange: [8, 15],
    incrementKg: 0,
  }),
  ex('hanging-leg-raise', 'Hanging leg raise', 'core', 'bodyweight', ['core'], {
    progressionGroup: 'core',
    progressionLevel: 4,
    level: 2,
    defaultRestSeconds: 75,
    repRange: [6, 12],
    incrementKg: 0,
  }),
  ex('toes-to-bar', 'Toes to bar', 'core', 'bodyweight', ['core'], {
    progressionGroup: 'core',
    progressionLevel: 5,
    level: 3,
    defaultRestSeconds: 90,
    repRange: [5, 10],
    incrementKg: 0,
  }),
  ex('crunch', 'Crunch', 'core', 'bodyweight', ['core'], {
    defaultRestSeconds: 60,
    repRange: [12, 20],
    incrementKg: 0,
  }),
  ex('bicycle-crunch', 'Bicycle crunch', 'core', 'bodyweight', ['core'], {
    level: 2,
    defaultRestSeconds: 60,
    repRange: [10, 16],
    incrementKg: 0,
  }),
  ex('reverse-crunch', 'Reverse crunch', 'core', 'bodyweight', ['core'], {
    level: 2,
    defaultRestSeconds: 60,
    repRange: [10, 15],
    incrementKg: 0,
  }),
  ex('dead-bug', 'Dead bug', 'core', 'bodyweight', ['core'], {
    defaultRestSeconds: 60,
    repRange: [8, 12],
    incrementKg: 0,
  }),
  ex('superman', 'Superman', 'core', 'bodyweight', ['core'], {
    secondaryMuscles: ['back', 'glutes'],
    defaultRestSeconds: 60,
    repRange: [10, 15],
    incrementKg: 0,
  }),
  ex('side-plank', 'Side plank', 'core', 'bodyweight', ['core'], {
    level: 2,
    defaultRestSeconds: 60,
    repRange: [20, 45],
    incrementKg: 0,
    isTimed: true,
  }),
  ex('russian-twist', 'Russian twist', 'core', 'bodyweight', ['core'], {
    level: 2,
    defaultRestSeconds: 60,
    repRange: [12, 20],
    incrementKg: 0,
  }),
  ex('mountain-climber', 'Mountain climber', 'core', 'bodyweight', [
    'core',
    'full_body',
  ], {
    goals: ['fat_loss', 'endurance', 'calisthenics'],
    defaultRestSeconds: 45,
    repRange: [20, 40],
    incrementKg: 0,
    isTimed: true,
  }),
  ex('frog-sprawl-kick', 'Frog sprawl kick', 'squat', 'bodyweight', [
    'quads',
    'glutes',
  ], {
    secondaryMuscles: ['core', 'shoulders', 'calves'],
    goals: ['fat_loss', 'endurance', 'calisthenics'],
    level: 2,
    defaultRestSeconds: 60,
    repRange: [8, 15],
    incrementKg: 0,
  }),
  ex('wall-sit', 'Wall sit', 'squat', 'bodyweight', ['quads'], {
    category: 'calisthenics',
    goals: ['endurance', 'fat_loss', 'calisthenics'],
    defaultRestSeconds: 60,
    repRange: [30, 60],
    incrementKg: 0,
    isTimed: true,
  }),
  ex('glute-bridge', 'Glute bridge', 'hinge', 'bodyweight', [
    'glutes',
    'hamstrings',
  ], {
    category: 'calisthenics',
    goals: ['hypertrophy', 'endurance', 'calisthenics'],
    defaultRestSeconds: 60,
    repRange: [12, 20],
    incrementKg: 0,
  }),
  ex('inverted-row', 'Inverted row', 'pull', 'bodyweight', [
    'back',
    'biceps',
  ], {
    category: 'calisthenics',
    goals: ['hypertrophy', 'endurance', 'calisthenics'],
    defaultRestSeconds: 75,
    repRange: [8, 15],
    incrementKg: 0,
  }),
]

export const EXERCISE_MAP = new Map(EXERCISES.map((e) => [e.id, e]))

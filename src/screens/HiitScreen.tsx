import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Square,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { db } from '../db'
import { ExerciseGraphic } from '../components/ExerciseGraphic'
import { HiitExercisePicker } from '../components/HiitExercisePicker'
import type { HiitTimer } from '../hooks/useHiitTimer'
import { formatSeconds } from '../lib/format'
import {
  buildAutoHiitProgram,
  buildCustomHiitProgram,
  buildLadderHiitProgram,
  DEFAULT_HIIT_EXERCISE_IDS,
  DEFAULT_HIIT_LADDER_RATIO,
  DEFAULT_HIIT_REST_SECONDS,
  DEFAULT_HIIT_ROUNDS,
  DEFAULT_HIIT_TOTAL_MINUTES,
  DEFAULT_HIIT_WORK_SECONDS,
  HIIT_LADDER_RATIO_STEP,
  HIIT_REST_STEP,
  HIIT_WORK_STEP,
  MAX_HIIT_LADDER_RATIO,
  MAX_HIIT_REST_SECONDS,
  MAX_HIIT_ROUNDS,
  MAX_HIIT_TOTAL_MINUTES,
  MAX_HIIT_WORK_SECONDS,
  MIN_HIIT_LADDER_RATIO,
  MIN_HIIT_REST_SECONDS,
  MIN_HIIT_ROUNDS,
  MIN_HIIT_TOTAL_MINUTES,
  MIN_HIIT_WORK_SECONDS,
} from '../lib/hiit'
import { EQUIPMENT_LABELS } from '../lib/recommend'
import type { Exercise, HiitMode, HiitRestMode } from '../types'

interface StepperProps {
  label: string
  hint: string
  value: number
  unit: string
  step: number
  min: number
  max: number
  displayValue?: string
  onChange: (value: number) => void
}

function Stepper({
  label,
  hint,
  value,
  unit,
  step,
  min,
  max,
  displayValue,
  onChange,
}: StepperProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-100">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
          {hint}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors active:bg-zinc-800 disabled:opacity-30"
        >
          <Minus size={14} />
        </button>
        <span className="min-w-16 text-center text-sm font-semibold tabular-nums text-zinc-100">
          {displayValue ?? value}
          {unit ? (
            <span className="ml-1 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
              {unit}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors active:bg-zinc-800 disabled:opacity-30"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-950/60 px-2 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-100">
        {value}
      </p>
    </div>
  )
}

export function HiitScreen({ timer }: { timer: HiitTimer }) {
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const [mode, setMode] = useState<HiitMode>('auto')
  const [selectedIds, setSelectedIds] = useState<string[]>(
    DEFAULT_HIIT_EXERCISE_IDS,
  )
  const [totalMinutes, setTotalMinutes] = useState(DEFAULT_HIIT_TOTAL_MINUTES)
  const [rounds, setRounds] = useState(DEFAULT_HIIT_ROUNDS)
  const [workSeconds, setWorkSeconds] = useState(DEFAULT_HIIT_WORK_SECONDS)
  const [restSeconds, setRestSeconds] = useState(DEFAULT_HIIT_REST_SECONDS)
  const [restMode, setRestMode] = useState<HiitRestMode>('fixed')
  const [restRatio, setRestRatio] = useState(DEFAULT_HIIT_LADDER_RATIO)
  const [pickerOpen, setPickerOpen] = useState(false)

  const exerciseMap = useMemo(
    () =>
      new Map(
        (exercises ?? []).map((exercise) => [exercise.id, exercise] as const),
      ),
    [exercises],
  )

  const selectedExercises = useMemo(
    () =>
      selectedIds
        .map((id) => exerciseMap.get(id))
        .filter((exercise): exercise is Exercise => Boolean(exercise)),
    [selectedIds, exerciseMap],
  )

  const program = useMemo(() => {
    if (mode === 'auto') {
      return buildAutoHiitProgram(
        selectedExercises,
        totalMinutes,
        workSeconds,
        restSeconds,
      )
    }

    if (mode === 'custom') {
      return buildCustomHiitProgram(
        selectedExercises,
        rounds,
        workSeconds,
        restSeconds,
      )
    }

    return buildLadderHiitProgram(
      selectedExercises,
      workSeconds,
      restMode,
      restSeconds,
      restRatio,
    )
  }, [
    mode,
    selectedExercises,
    totalMinutes,
    rounds,
    workSeconds,
    restSeconds,
    restMode,
    restRatio,
  ])

  const toggleExercise = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((exerciseId) => exerciseId !== id)
        : [...current, id],
    )
  }

  const handleStart = () => {
    if (program.intervals.length === 0) return
    timer.start(program)
  }

  const handleStop = () => {
    if (timer.status === 'finished') {
      timer.reset()
      return
    }
    if (window.confirm('Stop this HIIT session?')) timer.reset()
  }

  if (timer.status === 'finished') {
    const finishedProgram = timer.program
    const workIntervals =
      finishedProgram?.intervals.filter(
        (interval) => interval.type === 'work',
      ) ?? []
    const uniqueExercises = Array.from(
      new Set(workIntervals.map((interval) => interval.exerciseName)),
    )

    return (
      <div className="px-5 pb-28 pt-6">
        <div className="rounded-3xl border border-brand-400/30 bg-brand-400/[0.06] px-5 py-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-400/15 text-brand-300">
            <Check size={28} />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            HIIT complete
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Great work. Recover and hydrate.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-left">
            <Stat
              label="Time"
              value={formatSeconds(
                finishedProgram?.totalSeconds ?? timer.totalSeconds,
              )}
            />
            <Stat
              label="Rounds"
              value={String(finishedProgram?.rounds ?? timer.rounds)}
            />
            <Stat label="Work" value={String(workIntervals.length)} />
          </div>
        </div>

        {uniqueExercises.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {uniqueExercises.map((name) => (
              <span
                key={name}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-zinc-300"
              >
                {name}
              </span>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={timer.reset}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-4 py-3.5 text-sm font-bold text-zinc-950"
        >
          <RotateCcw size={16} />
          New session
        </button>
      </div>
    )
  }

  if (timer.status === 'running' || timer.status === 'paused') {
    const current = timer.currentInterval
    if (!current) return null

    const currentExercise = exerciseMap.get(current.exerciseId)
    const upcoming =
      timer.program?.intervals
        .slice(timer.index + 1)
        .find((interval) => interval.type === 'work') ?? null
    const isWork = current.type === 'work'
    const isCountdown = timer.countdown
    const isRunning = timer.status === 'running'

    return (
      <div className="px-5 pb-28 pt-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-300">
              HIIT
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Round {timer.round} of {timer.rounds}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Session
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-300">
              {formatSeconds(timer.totalRemaining)} left
            </p>
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-5 text-center">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
              timer.status === 'paused'
                ? 'bg-amber-400/15 text-amber-300'
                : isCountdown
                  ? 'bg-amber-400/15 text-amber-300'
                  : isWork
                    ? 'bg-brand-400/15 text-brand-300'
                    : 'bg-sky-400/15 text-sky-300'
            }`}
          >
            {timer.status === 'paused'
              ? 'Paused'
              : isCountdown
                ? 'Get ready'
                : isWork
                  ? 'Work'
                  : 'Rest'}
          </span>
          <p className="mt-4 font-mono text-[7rem] font-bold leading-none tabular-nums tracking-tight text-zinc-50 max-[360px]:text-8xl">
            {formatSeconds(timer.remaining)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {isCountdown
              ? `First up: ${current.exerciseName}`
              : `of ${formatSeconds(current.duration)} · ${formatSeconds(timer.totalRemaining)} left overall`}
          </p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${
                isCountdown
                  ? 'bg-amber-400'
                  : isWork
                    ? 'bg-brand-400'
                    : 'bg-sky-400'
              }`}
              style={{
                width: `${Math.round(timer.intervalProgress * 100)}%`,
              }}
            />
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <span>Session progress</span>
              <span>{Math.round(timer.progress * 100)}%</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-400 transition-[width] duration-200"
                style={{ width: `${Math.round(timer.progress * 100)}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-4">
            <ExerciseGraphic
              exerciseId={current.exerciseId}
              name={current.exerciseName}
              animate={isRunning && isWork && !isCountdown}
              expandable
              className="h-20 w-20 shrink-0 rounded-2xl border border-zinc-800"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {isCountdown
                  ? 'First up'
                  : isWork
                    ? 'Now'
                    : upcoming
                      ? 'Rest before'
                      : 'Final rest'}
              </p>
              <h2 className="mt-0.5 truncate text-lg font-bold text-zinc-100">
                {current.exerciseName}
              </h2>
              {currentExercise?.cues ? (
                <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">
                  {currentExercise.cues}
                </p>
              ) : null}
            </div>
          </div>
          {isCountdown ? (
            <p className="mt-3 rounded-xl bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-500">
              The first interval starts after the countdown.
            </p>
          ) : upcoming ? (
            <p className="mt-3 rounded-xl bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-500">
              Up next ·{' '}
              <span className="font-semibold text-zinc-300">
                {upcoming.exerciseName}
              </span>
            </p>
          ) : current.type === 'rest' ? (
            <p className="mt-3 rounded-xl bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-500">
              Final rest. The session finishes when this ends.
            </p>
          ) : (
            <p className="mt-3 rounded-xl bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-500">
              Final work interval
            </p>
          )}
        </section>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={isRunning ? timer.pause : timer.resume}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-brand-400 px-2 py-3 text-xs font-bold text-zinc-950"
          >
            {isRunning ? <Pause size={15} /> : <Play size={15} />}
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={timer.skip}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900 px-2 py-3 text-xs font-semibold text-zinc-300"
          >
            <SkipForward size={15} />
            Skip
          </button>
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-red-400/20 bg-red-400/10 px-2 py-3 text-xs font-semibold text-red-300"
          >
            <Square size={15} />
            Stop
          </button>
        </div>
      </div>
    )
  }

  const workCount = program.intervals.filter(
    (interval) => interval.type === 'work',
  ).length

  return (
    <div className="px-5 pb-28 pt-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-300">
          Conditioning
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">HIIT timer</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Build an interval session around your chosen movements.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
            mode === 'auto'
              ? 'bg-brand-400 text-zinc-950'
              : 'text-zinc-400'
          }`}
        >
          <Sparkles size={14} />
          Auto
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
            mode === 'custom'
              ? 'bg-brand-400 text-zinc-950'
              : 'text-zinc-400'
          }`}
        >
          <SlidersHorizontal size={14} />
          Custom
        </button>
        <button
          type="button"
          onClick={() => setMode('ladder')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
            mode === 'ladder'
              ? 'bg-brand-400 text-zinc-950'
              : 'text-zinc-400'
          }`}
        >
          <TrendingUp size={14} />
          Ladder
        </button>
      </div>

      <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Exercises</h2>
            <p className="text-[11px] text-zinc-500">
              {selectedExercises.length} selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(DEFAULT_HIIT_EXERCISE_IDS)}
              className="text-[11px] font-semibold text-brand-300"
            >
              Suggested
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-200"
            >
              <Plus size={13} />
              Add
            </button>
          </div>
        </div>

        {selectedExercises.length === 0 ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 px-4 py-6 text-xs font-semibold text-zinc-400"
          >
            <Plus size={16} />
            Choose exercises
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            {selectedExercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 px-2.5 py-2"
              >
                <span className="w-5 text-center text-[10px] font-bold text-zinc-500">
                  {index + 1}
                </span>
                <ExerciseGraphic
                  exerciseId={exercise.id}
                  name={exercise.name}
                  className="h-10 w-10 shrink-0 rounded-lg border border-zinc-800"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {exercise.name}
                  </p>
                  <p className="truncate text-[10px] text-zinc-500">
                    {EQUIPMENT_LABELS[exercise.equipment]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleExercise(exercise.id)}
                  aria-label={`Remove ${exercise.name}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-500 active:bg-zinc-800"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 divide-y divide-zinc-800/80 rounded-3xl border border-zinc-800 bg-zinc-900/50 px-4">
        {mode === 'auto' ? (
          <Stepper
            label="Total time"
            hint="Work intervals are auto-counted to fit."
            value={totalMinutes}
            unit="min"
            step={1}
            min={MIN_HIIT_TOTAL_MINUTES}
            max={MAX_HIIT_TOTAL_MINUTES}
            onChange={setTotalMinutes}
          />
        ) : mode === 'custom' ? (
          <Stepper
            label="Rounds"
            hint="Each round cycles through every exercise."
            value={rounds}
            unit="rounds"
            step={1}
            min={MIN_HIIT_ROUNDS}
            max={MAX_HIIT_ROUNDS}
            onChange={setRounds}
          />
        ) : (
          <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100">Steps</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                Uses your selected exercises in order. {selectedExercises.length}{' '}
                steps = {program.rounds} rungs.
              </p>
            </div>
            <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm font-semibold tabular-nums text-zinc-100">
              {selectedExercises.length}
            </span>
          </div>
        )}
        <Stepper
          label="Work"
          hint={
            mode === 'ladder'
              ? 'Each exercise in a rung runs for this long.'
              : 'Push hard for this long.'
          }
          value={workSeconds}
          unit="sec"
          step={HIIT_WORK_STEP}
          min={MIN_HIIT_WORK_SECONDS}
          max={MAX_HIIT_WORK_SECONDS}
          onChange={setWorkSeconds}
        />
        {mode === 'ladder' ? (
          <>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100">Rest</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                  Fixed time or 1:N rest:work after each rung.
                </p>
              </div>
              <div className="flex shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                <button
                  type="button"
                  onClick={() => setRestMode('fixed')}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    restMode === 'fixed'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500'
                  }`}
                >
                  Fixed
                </button>
                <button
                  type="button"
                  onClick={() => setRestMode('ratio')}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    restMode === 'ratio'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500'
                  }`}
                >
                  Ratio
                </button>
              </div>
            </div>
            {restMode === 'fixed' ? (
              <Stepper
                label="Rest time"
                hint="Recovery after each rung."
                value={restSeconds}
                unit="sec"
                step={HIIT_REST_STEP}
                min={MIN_HIIT_REST_SECONDS}
                max={MAX_HIIT_REST_SECONDS}
                onChange={setRestSeconds}
              />
            ) : (
              <Stepper
                label="Rest ratio"
                hint="Rest is 1/N of the rung's work."
                value={restRatio}
                unit=""
                displayValue={`1:${restRatio}`}
                step={HIIT_LADDER_RATIO_STEP}
                min={MIN_HIIT_LADDER_RATIO}
                max={MAX_HIIT_LADDER_RATIO}
                onChange={setRestRatio}
              />
            )}
          </>
        ) : (
          <Stepper
            label="Rest"
            hint="Recovery between work intervals."
            value={restSeconds}
            unit="sec"
            step={HIIT_REST_STEP}
            min={MIN_HIIT_REST_SECONDS}
            max={MAX_HIIT_REST_SECONDS}
            onChange={setRestSeconds}
          />
        )}
      </section>

      <section className="mt-4 rounded-3xl border border-brand-400/20 bg-brand-400/[0.04] p-4">
        <div className="grid grid-cols-3 gap-2 text-left">
          <Stat label="Total" value={formatSeconds(program.totalSeconds)} />
          <Stat label="Rounds" value={String(program.rounds)} />
          <Stat label="Work" value={String(workCount)} />
        </div>
        <p className="mt-3 text-center text-[11px] text-zinc-500">
          {mode === 'ladder'
            ? `${program.workSeconds}s per exercise · ${
                program.restMode === 'ratio'
                  ? `1:${program.restRatio} rest:work`
                  : program.restSeconds > 0
                    ? `${program.restSeconds}s rest`
                    : 'no rest'
              } after each rung`
            : `${program.workSeconds}s work · ${
                program.restSeconds > 0
                  ? `${program.restSeconds}s rest`
                  : 'no rest'
              } per interval`}
        </p>
      </section>

      <button
        type="button"
        onClick={handleStart}
        disabled={program.intervals.length === 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 px-4 py-3.5 text-sm font-bold text-zinc-950 disabled:opacity-40"
      >
        <Play size={17} />
        Start HIIT · {formatSeconds(program.totalSeconds)}
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
        <Timer size={13} />
        The screen stays awake while the timer runs.
      </p>

      <HiitExercisePicker
        open={pickerOpen}
        exercises={exercises ?? []}
        selectedIds={selectedIds}
        onToggle={toggleExercise}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  playHiitCue,
  playTickSound,
  primeAudio,
  vibrate,
} from '../lib/feedback'
import {
  HIIT_COUNTDOWN_SECONDS,
  type HiitInterval,
  type HiitProgram,
} from '../lib/hiit'
import { speak } from '../lib/speech'

export type HiitStatus = 'running' | 'paused' | 'finished'

interface HiitState {
  program: HiitProgram
  index: number
  startedAt: number
  finishedAt: number | null
  intervalStartedAt: number
  countdownEndsAt: number | null
  pausedRemaining: number | null
  status: HiitStatus
}

export function useHiitTimer(sound: boolean, voiceCues: boolean) {
  const [state, setState] = useState<HiitState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const stateRef = useRef<HiitState | null>(null)
  const soundRef = useRef(sound)
  const voiceRef = useRef(voiceCues)
  const tickRef = useRef<number | null>(null)
  const warningRef = useRef<string | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    soundRef.current = sound
  }, [sound])

  useEffect(() => {
    voiceRef.current = voiceCues
  }, [voiceCues])

  const announceInterval = useCallback(
    (interval: HiitInterval, isLast = false) => {
      if (!voiceRef.current) return
      if (interval.type === 'rest') {
        speak(
          isLast
            ? 'Final rest. Session complete after this.'
            : `Break. Next up: ${interval.exerciseName}.`,
        )
        return
      }
      speak(`Go: ${interval.exerciseName}.`)
    },
    [],
  )

  const currentInterval = state?.program.intervals[state.index] ?? null
  const nextInterval =
    state && state.index + 1 < state.program.intervals.length
      ? state.program.intervals[state.index + 1]
      : null

  const remaining = state
    ? state.status === 'paused'
      ? (state.pausedRemaining ?? 0)
      : state.status === 'finished'
        ? 0
        : state.countdownEndsAt !== null
          ? Math.max(0, Math.ceil((state.countdownEndsAt - now) / 1000))
          : currentInterval
            ? Math.max(
                0,
                Math.ceil(
                  (state.intervalStartedAt +
                    currentInterval.duration * 1000 -
                    now) /
                    1000,
                ),
              )
            : 0
    : 0

  useEffect(() => {
    if (state?.status !== 'running') return

    const tick = () => {
      const time = Date.now()
      setNow(time)
      const current = stateRef.current
      if (!current || current.status !== 'running') return

      const interval = current.program.intervals[current.index]
      if (!interval) return

      if (current.countdownEndsAt !== null) {
        if (time < current.countdownEndsAt) return
        if (soundRef.current) playHiitCue('work')
        vibrate([120, 60, 120])
        announceInterval(interval)
        const nextState: HiitState = {
          ...current,
          countdownEndsAt: null,
        }
        stateRef.current = nextState
        setState(nextState)
        return
      }

      if (time < current.intervalStartedAt + interval.duration * 1000) return

      let index = current.index
      let start = current.intervalStartedAt
      while (
        index < current.program.intervals.length &&
        time >= start + current.program.intervals[index].duration * 1000
      ) {
        start += current.program.intervals[index].duration * 1000
        index += 1
      }

      if (index >= current.program.intervals.length) {
        if (soundRef.current) playHiitCue('finish')
        vibrate([200, 100, 200, 100, 300])
        const nextState: HiitState = {
          ...current,
          index: current.program.intervals.length - 1,
          finishedAt: time,
          intervalStartedAt: start,
          countdownEndsAt: null,
          pausedRemaining: null,
          status: 'finished',
        }
        stateRef.current = nextState
        setState(nextState)
        return
      }

      const next = current.program.intervals[index]
      if (soundRef.current) playHiitCue(next.type)
      vibrate(next.type === 'work' ? [120, 60, 120] : [80])
      announceInterval(
        next,
        index === current.program.intervals.length - 1,
      )
      const nextState: HiitState = {
        ...current,
        index,
        intervalStartedAt: start,
        countdownEndsAt: null,
        pausedRemaining: null,
      }
      stateRef.current = nextState
      setState(nextState)
    }

    const handle = window.setInterval(tick, 250)
    return () => window.clearInterval(handle)
  }, [state?.status, announceInterval])

  useEffect(() => {
    if (state?.status !== 'running') {
      tickRef.current = null
      return
    }

    if (remaining > 0 && remaining <= 3) {
      const current = stateRef.current
      const interval = current?.program.intervals[current.index]
      const next = current?.program.intervals[current.index + 1]
      const countdown = Boolean(current?.countdownEndsAt)
      const warningKey = current
        ? `${countdown ? 'countdown' : 'interval'}:${current.index}`
        : null

      if (tickRef.current !== remaining) {
        tickRef.current = remaining
        if (soundRef.current) {
          if (
            remaining === 3 &&
            (countdown || interval?.type === 'rest')
          ) {
            playHiitCue('warning')
          } else {
            playTickSound()
          }
        }
      }

      if (
        remaining === 3 &&
        current &&
        warningKey &&
        warningRef.current !== warningKey
      ) {
        warningRef.current = warningKey
        if (voiceRef.current) {
          if (countdown) {
            speak(`Get ready. ${interval?.exerciseName} in 3 seconds.`)
          } else if (next) {
            speak(
              interval?.type === 'rest'
                ? `Get ready. ${next.exerciseName} in 3 seconds.`
                : 'Break in 3 seconds.',
            )
          } else {
            speak('Final 3 seconds.')
          }
        }
      }
      return
    }

    tickRef.current = null
  }, [remaining, state?.status])

  const start = useCallback((program: HiitProgram) => {
    if (program.intervals.length === 0) return
    const startedAt = Date.now()
    const countdownEndsAt = startedAt + HIIT_COUNTDOWN_SECONDS * 1000
    primeAudio()
    tickRef.current = null
    warningRef.current = null
    setNow(startedAt)
    const nextState: HiitState = {
      program,
      index: 0,
      startedAt,
      finishedAt: null,
      intervalStartedAt: countdownEndsAt,
      countdownEndsAt,
      pausedRemaining: null,
      status: 'running',
    }
    stateRef.current = nextState
    setState(nextState)
    if (soundRef.current) playHiitCue('start')
    if (voiceRef.current) {
      speak(
        `Start your watch. First up: ${program.intervals[0].exerciseName}.`,
      )
    }
    vibrate([100, 50, 100])
  }, [])

  const pause = useCallback(() => {
    setState((current) => {
      if (!current || current.status !== 'running') return current
      const interval = current.program.intervals[current.index]
      if (!interval) return current
      const endsAt =
        current.countdownEndsAt ??
        current.intervalStartedAt + interval.duration * 1000
      const remainingMs = endsAt - Date.now()
      return {
        ...current,
        status: 'paused',
        pausedRemaining: Math.max(0, Math.ceil(remainingMs / 1000)),
      }
    })
    setNow(Date.now())
  }, [])

  const resume = useCallback(() => {
    setState((current) => {
      if (!current || current.status !== 'paused') return current
      const interval = current.program.intervals[current.index]
      if (!interval) return current
      const remainingSeconds = current.pausedRemaining ?? interval.duration
      const now = Date.now()

      if (current.countdownEndsAt !== null) {
        const countdownEndsAt = now + remainingSeconds * 1000
        return {
          ...current,
          status: 'running',
          intervalStartedAt: countdownEndsAt,
          countdownEndsAt,
          pausedRemaining: null,
        }
      }

      return {
        ...current,
        status: 'running',
        intervalStartedAt:
          now - (interval.duration - remainingSeconds) * 1000,
        pausedRemaining: null,
      }
    })
    setNow(Date.now())
    tickRef.current = null
  }, [])

  const skip = useCallback(() => {
    if (!state) return

    if (state.countdownEndsAt !== null) {
      const first = state.program.intervals[state.index]
      if (!first) return
      const now = Date.now()
      if (soundRef.current) playHiitCue('work')
      announceInterval(first)
      vibrate([120, 60, 120])
      warningRef.current = null
      const nextState: HiitState = {
        ...state,
        intervalStartedAt: now,
        countdownEndsAt: null,
        pausedRemaining: state.status === 'paused' ? first.duration : null,
      }
      stateRef.current = nextState
      setState(nextState)
      setNow(now)
      tickRef.current = null
      return
    }

    const nextIndex = state.index + 1

    if (nextIndex >= state.program.intervals.length) {
      if (soundRef.current) playHiitCue('finish')
      vibrate([200, 100, 200])
      warningRef.current = null
      const nextState: HiitState = {
        ...state,
        finishedAt: Date.now(),
        countdownEndsAt: null,
        pausedRemaining: null,
        status: 'finished',
      }
      stateRef.current = nextState
      setState(nextState)
      return
    }

    const next = state.program.intervals[nextIndex]
    if (soundRef.current) playHiitCue(next.type)
    announceInterval(next, nextIndex === state.program.intervals.length - 1)
    vibrate(80)
    warningRef.current = null
    const nextState: HiitState = {
      ...state,
      index: nextIndex,
      intervalStartedAt: Date.now(),
      countdownEndsAt: null,
      pausedRemaining: state.status === 'paused' ? next.duration : null,
    }
    stateRef.current = nextState
    setState(nextState)
    setNow(Date.now())
    tickRef.current = null
  }, [state, announceInterval])

  const reset = useCallback(() => {
    tickRef.current = null
    warningRef.current = null
    stateRef.current = null
    setState(null)
  }, [])

  const countdown = Boolean(state?.countdownEndsAt)
  let totalElapsed = 0
  if (state && !countdown) {
    const completed = state.program.intervals
      .slice(0, state.index)
      .reduce((total, interval) => total + interval.duration, 0)
    const current = state.program.intervals[state.index]
    const currentElapsed =
      state.status === 'finished'
        ? (current?.duration ?? 0)
        : current
          ? Math.max(0, current.duration - remaining)
          : 0
    totalElapsed = completed + currentElapsed
  }

  const totalRemaining = state
    ? Math.max(0, state.program.totalSeconds - totalElapsed)
    : 0
  const progress =
    state && state.program.totalSeconds > 0
      ? Math.min(1, totalElapsed / state.program.totalSeconds)
      : 0
  const intervalProgress =
    currentInterval && !countdown
      ? Math.min(1, Math.max(0, 1 - remaining / currentInterval.duration))
      : 0

  return {
    program: state?.program ?? null,
    status: state?.status ?? null,
    countdown,
    currentInterval,
    nextInterval,
    index: state?.index ?? 0,
    startedAt: state?.startedAt ?? null,
    finishedAt: state?.finishedAt ?? null,
    remaining,
    totalRemaining,
    progress,
    intervalProgress,
    round: currentInterval?.round ?? 0,
    rounds: state?.program.rounds ?? 0,
    totalSeconds: state?.program.totalSeconds ?? 0,
    start,
    pause,
    resume,
    skip,
    reset,
  }
}

export type HiitTimer = ReturnType<typeof useHiitTimer>

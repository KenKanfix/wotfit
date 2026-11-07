import { useCallback, useEffect, useRef, useState } from 'react'
import {
  playHiitCue,
  playTickSound,
  primeAudio,
  vibrate,
} from '../lib/feedback'
import type { HiitProgram } from '../lib/hiit'

export type HiitStatus = 'running' | 'paused' | 'finished'

interface HiitState {
  program: HiitProgram
  index: number
  intervalStartedAt: number
  pausedRemaining: number | null
  status: HiitStatus
}

export function useHiitTimer(sound: boolean) {
  const [state, setState] = useState<HiitState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const stateRef = useRef<HiitState | null>(null)
  const soundRef = useRef(sound)
  const tickRef = useRef<number | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    soundRef.current = sound
  }, [sound])

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
          intervalStartedAt: start,
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
      const nextState: HiitState = {
        ...current,
        index,
        intervalStartedAt: start,
        pausedRemaining: null,
      }
      stateRef.current = nextState
      setState(nextState)
    }

    const handle = window.setInterval(tick, 250)
    return () => window.clearInterval(handle)
  }, [state?.status])

  useEffect(() => {
    if (state?.status !== 'running') {
      tickRef.current = null
      return
    }

    if (remaining > 0 && remaining <= 3) {
      if (tickRef.current !== remaining) {
        tickRef.current = remaining
        if (soundRef.current) playTickSound()
      }
      return
    }

    tickRef.current = null
  }, [remaining, state?.status])

  const start = useCallback((program: HiitProgram) => {
    if (program.intervals.length === 0) return
    const startedAt = Date.now()
    primeAudio()
    tickRef.current = null
    setNow(startedAt)
    const nextState: HiitState = {
      program,
      index: 0,
      intervalStartedAt: startedAt,
      pausedRemaining: null,
      status: 'running',
    }
    stateRef.current = nextState
    setState(nextState)
    if (soundRef.current) playHiitCue('start')
    vibrate([100, 50, 100])
  }, [])

  const pause = useCallback(() => {
    setState((current) => {
      if (!current || current.status !== 'running') return current
      const interval = current.program.intervals[current.index]
      if (!interval) return current
      const remainingMs =
        current.intervalStartedAt + interval.duration * 1000 - Date.now()
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
      return {
        ...current,
        status: 'running',
        intervalStartedAt:
          Date.now() - (interval.duration - remainingSeconds) * 1000,
        pausedRemaining: null,
      }
    })
    setNow(Date.now())
    tickRef.current = null
  }, [])

  const skip = useCallback(() => {
    if (!state) return
    const nextIndex = state.index + 1

    if (nextIndex >= state.program.intervals.length) {
      if (soundRef.current) playHiitCue('finish')
      vibrate([200, 100, 200])
      const nextState: HiitState = {
        ...state,
        pausedRemaining: null,
        status: 'finished',
      }
      stateRef.current = nextState
      setState(nextState)
      return
    }

    const next = state.program.intervals[nextIndex]
    if (soundRef.current) playHiitCue(next.type)
    vibrate(80)
    const nextState: HiitState = {
      ...state,
      index: nextIndex,
      intervalStartedAt: Date.now(),
      pausedRemaining: state.status === 'paused' ? next.duration : null,
    }
    stateRef.current = nextState
    setState(nextState)
    setNow(Date.now())
    tickRef.current = null
  }, [state])

  const reset = useCallback(() => {
    tickRef.current = null
    stateRef.current = null
    setState(null)
  }, [])

  let totalElapsed = 0
  if (state) {
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
  const intervalProgress = currentInterval
    ? Math.min(1, Math.max(0, 1 - remaining / currentInterval.duration))
    : 0

  return {
    program: state?.program ?? null,
    status: state?.status ?? null,
    currentInterval,
    nextInterval,
    index: state?.index ?? 0,
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

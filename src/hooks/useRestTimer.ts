import { useCallback, useEffect, useRef, useState } from 'react'
import { notifyRestComplete, primeAudio } from '../lib/feedback'

export interface RestTimerState {
  duration: number
  endsAt: number
}

export function useRestTimer(sound: boolean) {
  const [timer, setTimer] = useState<RestTimerState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const firedRef = useRef(false)
  const soundRef = useRef(sound)

  useEffect(() => {
    soundRef.current = sound
  }, [sound])

  useEffect(() => {
    if (!timer) return
    const interval = window.setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time >= timer.endsAt) window.clearInterval(interval)
    }, 250)
    return () => window.clearInterval(interval)
  }, [timer])

  useEffect(() => {
    if (!timer || firedRef.current) return
    if (now >= timer.endsAt) {
      firedRef.current = true
      notifyRestComplete(soundRef.current)
    }
  }, [now, timer])

  const start = useCallback((seconds: number) => {
    primeAudio()
    firedRef.current = false
    setNow(Date.now())
    setTimer({ duration: seconds, endsAt: Date.now() + seconds * 1000 })
  }, [])

  const add = useCallback((seconds: number) => {
    firedRef.current = false
    setNow(Date.now())
    setTimer((current) =>
      current
        ? {
            duration: current.duration + seconds,
            endsAt: current.endsAt + seconds * 1000,
          }
        : current,
    )
  }, [])

  const skip = useCallback(() => {
    setTimer(null)
  }, [])

  const remaining = timer
    ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
    : 0
  const progress =
    timer && timer.duration > 0
      ? Math.min(1, 1 - remaining / timer.duration)
      : 0

  return { timer, remaining, progress, start, add, skip }
}

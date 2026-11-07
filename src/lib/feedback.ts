let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    audioContext = new Ctor()
  }
  return audioContext
}

export function primeAudio(): void {
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume()
  } catch {
    // Audio is best-effort.
  }
}

interface Tone {
  frequency: number
  offset: number
  duration: number
  gain: number
}

function playTones(tones: Tone[]): void {
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume()
    const start = context.currentTime

    tones.forEach((tone) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = tone.frequency
      gain.gain.setValueAtTime(0.0001, start + tone.offset)
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, tone.gain),
        start + tone.offset + 0.01,
      )
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + tone.offset + tone.duration,
      )
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start + tone.offset)
      oscillator.stop(start + tone.offset + tone.duration + 0.02)
    })
  } catch {
    // Audio is best-effort.
  }
}

export type HiitCue = 'start' | 'work' | 'rest' | 'finish'

export function playHiitCue(cue: HiitCue): void {
  if (cue === 'start') {
    playTones([{ frequency: 660, offset: 0, duration: 0.14, gain: 0.18 }])
    return
  }

  if (cue === 'work') {
    playTones([
      { frequency: 880, offset: 0, duration: 0.1, gain: 0.2 },
      { frequency: 1318, offset: 0.12, duration: 0.12, gain: 0.2 },
    ])
    return
  }

  if (cue === 'rest') {
    playTones([
      { frequency: 440, offset: 0, duration: 0.12, gain: 0.18 },
      { frequency: 330, offset: 0.14, duration: 0.16, gain: 0.18 },
    ])
    return
  }

  playTones([
    { frequency: 660, offset: 0, duration: 0.12, gain: 0.2 },
    { frequency: 880, offset: 0.16, duration: 0.12, gain: 0.2 },
    { frequency: 1174, offset: 0.32, duration: 0.2, gain: 0.22 },
  ])
}

export function playTickSound(): void {
  playTones([{ frequency: 740, offset: 0, duration: 0.05, gain: 0.08 }])
}

export function playRestSound(): void {
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume()
    const start = context.currentTime

    ;[0, 0.2].forEach((offset, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = index === 0 ? 880 : 1174
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.22, start + offset + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.18)
    })
  } catch {
    // Audio is best-effort; never block the workout flow.
  }
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function notifyRestComplete(soundEnabled: boolean): void {
  if (soundEnabled) playRestSound()
  vibrate([180, 90, 180])

  if (
    typeof Notification === 'undefined' ||
    Notification.permission !== 'granted' ||
    document.visibilityState !== 'hidden'
  ) {
    return
  }

  try {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready
        .then((registration) =>
          registration.showNotification('Rest complete', {
            body: 'Time for your next set.',
            icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
            badge: `${import.meta.env.BASE_URL}pwa-192x192.png`,
            tag: 'rest-timer',
          }),
        )
        .catch(() => undefined)
    } else {
      new Notification('Rest complete', { body: 'Time for your next set.' })
    }
  } catch {
    // Notifications are optional.
  }
}

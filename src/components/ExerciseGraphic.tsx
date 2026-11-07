import { Dumbbell, Maximize2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  exerciseId: string
  name: string
  className?: string
  animate?: boolean
  expandable?: boolean
}

export function ExerciseGraphic({
  exerciseId,
  name,
  className = '',
  animate = false,
  expandable = false,
}: Props) {
  const [failed, setFailed] = useState(false)
  const [secondFailed, setSecondFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const frameA = `${import.meta.env.BASE_URL}exercises/${exerciseId}-0.webp`
  const frameB = `${import.meta.env.BASE_URL}exercises/${exerciseId}-1.webp`

  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (failed) {
    return (
      <div
        className={`grid place-items-center bg-zinc-900 text-zinc-600 ${className}`}
      >
        <Dumbbell size={18} />
      </div>
    )
  }

  return (
    <>
      <div className={`relative overflow-hidden bg-white ${className}`}>
        <img
          src={frameA}
          alt={name}
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-contain ${
            animate ? 'exercise-frame-a' : ''
          }`}
        />
        {animate && !secondFailed ? (
          <img
            src={frameB}
            alt=""
            aria-hidden="true"
            loading="lazy"
            draggable={false}
            onError={() => setSecondFailed(true)}
            className="exercise-frame-b absolute inset-0 h-full w-full object-contain"
          />
        ) : null}
        {expandable ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setOpen(true)
            }}
            className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-md bg-zinc-950/80 text-zinc-100 shadow-sm backdrop-blur-sm active:scale-95"
            aria-label={`Open larger ${name} preview`}
          >
            <Maximize2 size={12} />
          </button>
        ) : null}
      </div>

      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${name} preview`}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                aria-label="Close preview"
              />
              <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <p className="truncate text-sm font-bold text-zinc-100">
                    {name}
                  </p>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setOpen(false)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-800/70 text-zinc-300 active:scale-95"
                    aria-label="Close preview"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="relative aspect-square w-full bg-white">
                  <img
                    src={frameA}
                    alt={name}
                    draggable={false}
                    onError={() => setOpen(false)}
                    className="exercise-frame-a absolute inset-0 h-full w-full object-contain"
                  />
                  {!secondFailed ? (
                    <img
                      src={frameB}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      onError={() => setSecondFailed(true)}
                      className="exercise-frame-b absolute inset-0 h-full w-full object-contain"
                    />
                  ) : null}
                </div>
                <p className="px-4 py-3 text-center text-[11px] text-zinc-500">
                  Tap outside or press Esc to close
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

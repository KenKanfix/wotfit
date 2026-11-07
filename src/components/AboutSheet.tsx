import { HeartPulse, ShieldCheck, X } from 'lucide-react'
import { useEffect } from 'react'
import { APP_AUTHOR, APP_NAME, APP_VERSION } from '../lib/app'

interface Props {
  open: boolean
  onClose: () => void
}

const PRIVACY_POINTS = [
  'Workouts, settings and history are stored locally on this device in your browser storage.',
  'No account is required. WOTFit does not upload your training data to a server and does not include analytics or ad tracking.',
  'Rest and HIIT alerts are generated locally. Notifications, if enabled, are handled by your device.',
  'Clearing site data, uninstalling the app, or using Reset all data permanently deletes your data. Export a backup before switching devices.',
]

export function AboutSheet({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close about and privacy"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="relative flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between px-5 pb-3 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
              alt="WOTFit icon"
              className="h-12 w-12 shrink-0 rounded-2xl border border-zinc-800 object-cover"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
                About
              </p>
              <h2 id="about-title" className="truncate text-lg font-bold">
                {APP_NAME}
              </h2>
              <p className="truncate text-[11px] text-zinc-500">
                by {APP_AUTHOR} · v{APP_VERSION}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="text-sm font-bold text-zinc-100">
              Train on purpose
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
              WOTFit is a local-first workout tracker for logging sets, timing
              rest and HIIT intervals, and building smart plans around your
              goal, equipment and training history.
            </p>
          </section>

          <section className="mt-3 rounded-2xl border border-brand-400/20 bg-brand-400/[0.04] p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-400/15 text-brand-300">
                <ShieldCheck size={17} />
              </span>
              <h3 className="text-sm font-bold text-zinc-100">
                Privacy disclaimer
              </h3>
            </div>
            <ul className="mt-3 space-y-2.5">
              {PRIVACY_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex gap-2 text-[12px] leading-relaxed text-zinc-400"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-brand-400/10 pt-3 text-[11px] leading-relaxed text-zinc-500">
              The app is served as static files. The hosting provider may process
              standard request logs, but your workout data is never included.
            </p>
            <a
              href="privacy.html"
              className="mt-3 inline-block text-[11px] font-semibold text-brand-300"
            >
              Read the full privacy policy
            </a>
          </section>

          <section className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-zinc-800 text-zinc-300">
                <HeartPulse size={17} />
              </span>
              <h3 className="text-sm font-bold text-zinc-100">
                Training disclaimer
              </h3>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-400">
              Exercise involves risk. WOTFit is not medical advice. Work within
              your limits and consult a qualified professional before starting a
              new program, especially if you have an injury or health condition.
            </p>
          </section>

          <section className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="text-sm font-bold text-zinc-100">Credits</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
              Exercise images from free-exercise-db (public domain). Built as an
              installable progressive web app.
            </p>
          </section>

          <section className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="text-sm font-bold text-zinc-100">
              More from {APP_AUTHOR}
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
              More apps are available on Google Play and the App Store, and you
              can find {APP_AUTHOR} on YouTube.
            </p>
          </section>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-2xl bg-brand-400 px-4 py-3 text-sm font-bold text-zinc-950"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

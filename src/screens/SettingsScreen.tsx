import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Download,
  Info,
  Minus,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Smartphone,
  Speech,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { AboutSheet } from '../components/AboutSheet'
import { CustomExerciseSheet } from '../components/CustomExerciseSheet'
import { db } from '../db'
import { APP_AUTHOR, APP_VERSION } from '../lib/app'
import { DEFAULT_BODY_WEIGHT_KG } from '../lib/calories'
import { deleteCustomExercise } from '../lib/exerciseLibrary'
import {
  dateKey,
  formatSeconds,
  toKg,
  weightInputValue,
} from '../lib/format'
import {
  EQUIPMENT_LABELS,
  GOAL_DESCRIPTIONS,
  GOAL_LABELS,
  MUSCLE_LABELS,
} from '../lib/recommend'
import {
  clampRestSeconds,
  DEFAULT_REST_SECONDS,
  REST_STEP_SECONDS,
} from '../lib/rest'
import type { Equipment, Exercise, Goal, Settings } from '../types'

interface Props {
  settings: Settings
  onBack?: () => void
}

const GOALS: Goal[] = [
  'strength',
  'hypertrophy',
  'fat_loss',
  'endurance',
  'calisthenics',
]

const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
  'bands',
  'bodyweight',
]

const LEVELS: { value: 1 | 2 | 3; label: string; detail: string }[] = [
  { value: 1, label: 'Beginner', detail: '0–1 years' },
  { value: 2, label: 'Intermediate', detail: '1–3 years' },
  { value: 3, label: 'Advanced', detail: '3+ years' },
]

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function SettingsScreen({ settings, onBack }: Props) {
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches,
  )
  const [aboutOpen, setAboutOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  const customExercises =
    useLiveQuery(async () => {
      const all = await db.exercises.toArray()
      return all
        .filter((exercise) => exercise.isCustom)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    }, []) ?? []

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const update = (patch: Partial<Settings>) => {
    void db.settings.update(1, patch)
  }

  const customRestCount = Object.keys(settings.restOverrides ?? {}).length

  const adjustDefaultRest = (delta: number) => {
    void db.settings
      .where('id')
      .equals(1)
      .modify((stored) => {
        stored.defaultRestSeconds = clampRestSeconds(
          (stored.defaultRestSeconds || DEFAULT_REST_SECONDS) + delta,
        )
      })
  }

  const toggleEquipment = (equipment: Equipment) => {
    const has = settings.equipment.includes(equipment)
    update({
      equipment: has
        ? settings.equipment.filter((item) => item !== equipment)
        : [...settings.equipment, equipment],
    })
  }

  const openCreateExercise = () => {
    setEditingExercise(null)
    setCustomOpen(true)
  }

  const openEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setCustomOpen(true)
  }

  const handleDeleteCustom = async (exercise: Exercise) => {
    const usedSets = await db.sets
      .where('exerciseId')
      .equals(exercise.id)
      .count()
    const message =
      usedSets > 0
        ? `Delete custom exercise "${exercise.name}"? ${usedSets} logged set${
            usedSets === 1 ? '' : 's'
          } will stay in history but show as unknown.`
        : `Delete custom exercise "${exercise.name}"?`
    if (!window.confirm(message)) return
    await deleteCustomExercise(exercise.id)
  }

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  const exportData = async () => {
    const [
      exercises,
      workouts,
      sets,
      storedSettings,
      savedPlans,
      hiitSessions,
    ] = await Promise.all([
      db.exercises.toArray(),
      db.workouts.toArray(),
      db.sets.toArray(),
      db.settings.toArray(),
      db.savedPlans.toArray(),
      db.hiitSessions.toArray(),
    ])
    const payload = {
      app: 'WOTFit by Ken Kanfix',
      exportedAt: new Date().toISOString(),
      settings: storedSettings,
      exercises,
      workouts,
      sets,
      savedPlans,
      hiitSessions,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `wotfit-backup-${dateKey(new Date())}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const resetData = async () => {
    if (
      !window.confirm(
        'Reset all workouts, saved plans and settings? This cannot be undone. Export a backup first.',
      )
    ) {
      return
    }
    await db.delete()
    window.location.reload()
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      setInstallEvent(null)
    }
  }

  return (
    <div className="px-5 pb-28 pt-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 active:scale-95"
          aria-label="Back to smart plan"
        >
          <ArrowLeft size={14} />
          Smart plan
        </button>
      ) : null}
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-300">
          Tune
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your goal shapes every recommendation.
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-zinc-200">Training goal</h2>
        <div className="mt-2.5 grid gap-2">
          {GOALS.map((goal) => {
            const active = settings.goal === goal
            return (
              <button
                key={goal}
                type="button"
                onClick={() => update({ goal })}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                  active
                    ? 'border-brand-400/50 bg-brand-400/10'
                    : 'border-zinc-800 bg-zinc-900/60'
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                    active
                      ? 'border-brand-400 bg-brand-400 text-zinc-950'
                      : 'border-zinc-600 text-transparent'
                  }`}
                >
                  <Check size={12} strokeWidth={4} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-100">
                    {GOAL_LABELS[goal]}
                  </span>
                  <span className="block text-[11px] text-zinc-500">
                    {GOAL_DESCRIPTIONS[goal]}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-sm font-bold text-zinc-200">Experience</h2>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {LEVELS.map((level) => {
            const active = settings.level === level.value
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => update({ level: level.value })}
                className={`rounded-2xl border px-2 py-3 text-center transition-colors ${
                  active
                    ? 'border-brand-400/50 bg-brand-400/10'
                    : 'border-zinc-800 bg-zinc-900/60'
                }`}
              >
                <span
                  className={`block text-xs font-bold ${
                    active ? 'text-brand-300' : 'text-zinc-300'
                  }`}
                >
                  {level.label}
                </span>
                <span className="mt-0.5 block text-[10px] text-zinc-500">
                  {level.detail}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-sm font-bold text-zinc-200">Available equipment</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          Bodyweight movements are always included.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {EQUIPMENT.map((equipment) => {
            const active = settings.equipment.includes(equipment)
            return (
              <button
                key={equipment}
                type="button"
                onClick={() => toggleEquipment(equipment)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-brand-400/50 bg-brand-400/15 text-brand-300'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
                }`}
              >
                {EQUIPMENT_LABELS[equipment]}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-200">Custom exercises</h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Add your own movements to the library and picker.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateExercise}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-400/40 bg-brand-400/10 px-3 py-1.5 text-xs font-semibold text-brand-300 active:scale-95"
          >
            <Plus size={13} />
            Add
          </button>
        </div>

        {customExercises.length === 0 ? (
          <div className="mt-2.5 rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center">
            <p className="text-xs text-zinc-500">
              No custom exercises yet. Create one to log anything not in the
              built-in list.
            </p>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2">
            {customExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {exercise.name}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {EQUIPMENT_LABELS[exercise.equipment]} ·{' '}
                    {exercise.primaryMuscles
                      .map((muscle) => MUSCLE_LABELS[muscle] ?? muscle)
                      .join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditExercise(exercise)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 active:text-brand-300"
                  aria-label={`Edit ${exercise.name}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteCustom(exercise)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-600 active:text-red-400"
                  aria-label={`Delete ${exercise.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-7">
        <h2 className="text-sm font-bold text-zinc-200">Preferences</h2>
        <div className="mt-2.5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Appearance</p>
              <p className="text-[11px] text-zinc-500">Switch between dark and light</p>
            </div>
            <div className="flex rounded-lg bg-zinc-950 p-0.5">
              {(['dark', 'light'] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => update({ theme })}
                  aria-pressed={settings.theme === theme}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold ${
                    settings.theme === theme
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-500'
                  }`}
                >
                  {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
                  <span className="capitalize">{theme}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Body weight</p>
              <p className="text-[11px] text-zinc-500">
                Used to estimate calories burned
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-950 px-2 py-1.5">
              <input
                key={settings.unit}
                type="number"
                inputMode="decimal"
                min={0}
                step={settings.unit === 'kg' ? 0.5 : 1}
                defaultValue={weightInputValue(
                  settings.bodyWeightKg || DEFAULT_BODY_WEIGHT_KG,
                  settings.unit,
                )}
                onBlur={(event) => {
                  const display = Number.parseFloat(event.target.value)
                  if (!Number.isFinite(display) || display <= 0) return
                  update({
                    bodyWeightKg: Math.round(toKg(display, settings.unit) * 10) / 10,
                  })
                }}
                className="w-16 bg-transparent text-right text-sm font-semibold text-zinc-100 outline-none"
                aria-label="Body weight"
              />
              <span className="text-[10px] font-semibold uppercase text-zinc-500">
                {settings.unit}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Units</p>
              <p className="text-[11px] text-zinc-500">Weights are stored in kg</p>
            </div>
            <div className="flex rounded-lg bg-zinc-950 p-0.5">
              {(['kg', 'lb'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => update({ unit })}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase ${
                    settings.unit === unit
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-500'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
          <div className="border-b border-zinc-800/80">
            <div className="flex items-center justify-between px-3 py-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  Default rest
                </p>
                <p className="text-[11px] text-zinc-500">
                  Used unless an exercise has a custom rest
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-zinc-950 px-1 py-1">
                <button
                  type="button"
                  onClick={() => adjustDefaultRest(-REST_STEP_SECONDS)}
                  className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 active:scale-95"
                  aria-label="Decrease default rest"
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-12 text-center text-sm font-semibold text-zinc-100">
                  {formatSeconds(
                    settings.defaultRestSeconds || DEFAULT_REST_SECONDS,
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => adjustDefaultRest(REST_STEP_SECONDS)}
                  className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 active:scale-95"
                  aria-label="Increase default rest"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            {customRestCount > 0 ? (
              <button
                type="button"
                onClick={() => update({ restOverrides: {} })}
                className="flex w-full items-center justify-between border-t border-zinc-800/80 px-3 py-2 text-left"
              >
                <span className="text-[11px] text-zinc-500">
                  {customRestCount} custom exercise rest
                  {customRestCount === 1 ? '' : 's'} saved
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300">
                  <RotateCcw size={12} />
                  Reset
                </span>
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => update({ sound: !settings.sound })}
            className="flex w-full items-center justify-between border-b border-zinc-800/80 px-3 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-zinc-100">
                Rest timer sound
              </span>
              <span className="block text-[11px] text-zinc-500">
                Beep and vibrate when rest ends
              </span>
            </span>
            <span
              className={`grid h-9 w-9 place-items-center rounded-xl ${
                settings.sound
                  ? 'bg-brand-400/15 text-brand-300'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {settings.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </span>
          </button>
          <button
            type="button"
            onClick={() => update({ voiceCues: !settings.voiceCues })}
            className="flex w-full items-center justify-between px-3 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-zinc-100">
                Voice technique cues
              </span>
              <span className="block text-[11px] text-zinc-500">
                Speak the reminder when an exercise starts
              </span>
            </span>
            <span
              className={`grid h-9 w-9 place-items-center rounded-xl ${
                settings.voiceCues
                  ? 'bg-brand-400/15 text-brand-300'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {settings.voiceCues ? <Speech size={17} /> : <VolumeX size={17} />}
            </span>
          </button>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-sm font-bold text-zinc-200">Rest alerts</h2>
        <div className="mt-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Allow notifications so the timer can alert you when the app is in the
            background. On iPhone, notifications require the app to be installed
            to the home screen.
          </p>
          <button
            type="button"
            onClick={() => void enableNotifications()}
            disabled={permission === 'granted' || permission === 'unsupported'}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/70 px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-50"
          >
            <Bell size={14} />
            {permission === 'granted'
              ? 'Notifications enabled'
              : permission === 'denied'
                ? 'Blocked in browser settings'
                : permission === 'unsupported'
                  ? 'Not supported'
                  : 'Enable notifications'}
          </button>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-sm font-bold text-zinc-200">App</h2>
        <div className="mt-2.5 space-y-2">
          {installEvent && !installed ? (
            <button
              type="button"
              onClick={() => void install()}
              className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-left"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-400/15 text-brand-300">
                <Smartphone size={17} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-zinc-100">
                  Install WOTFit
                </span>
                <span className="block text-[11px] text-zinc-500">
                  Add to your home screen for offline use
                </span>
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void exportData()}
            className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-left"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-800 text-zinc-300">
              <Download size={17} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-zinc-100">
                Export data
              </span>
              <span className="block text-[11px] text-zinc-500">
                Download a JSON backup of all workouts
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-left"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-800 text-zinc-300">
              <Info size={17} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-zinc-100">
                About &amp; privacy
              </span>
              <span className="block text-[11px] text-zinc-500">
                App details, local data and disclaimers
              </span>
            </span>
            <ChevronRight size={15} className="shrink-0 text-zinc-600" />
          </button>
          <button
            type="button"
            onClick={() => void resetData()}
            className="flex w-full items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-3 py-3 text-left"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 text-red-400">
              <RotateCcw size={17} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-red-300">
                Reset all data
              </span>
              <span className="block text-[11px] text-red-400/60">
                Delete workouts, plans and restore defaults
              </span>
            </span>
          </button>
        </div>
      </section>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-zinc-600">
        WOTFit by {APP_AUTHOR} · v{APP_VERSION}. Your data stays on this device.
      </p>

      {customOpen ? (
        <CustomExerciseSheet
          key={editingExercise?.id ?? 'new'}
          open
          initial={editingExercise}
          onClose={() => {
            setCustomOpen(false)
            setEditingExercise(null)
          }}
        />
      ) : null}

      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}
